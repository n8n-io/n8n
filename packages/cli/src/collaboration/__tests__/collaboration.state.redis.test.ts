import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';
import type { TaggedRedisCache } from '@/services/cache/cache.types';

import { CollaborationState } from '../collaboration.state';

vi.mock('ioredis', () => {
	const Redis = require('ioredis-mock');

	return {
		// Must be a function expression (not method shorthand) so it is
		// constructable via `new Redis(...)` in the service under test.
		// eslint-disable-next-line object-shorthand
		default: function (...args: unknown[]) {
			return new Redis(args);
		},
	};
});

/**
 * Redis ships `cjson` in its Lua runtime; ioredis-mock's fengari VM does
 * not. This minimal decoder covers the two shapes the lock scripts read — a
 * JSON string literal and a flat object of string values — and raises on
 * anything else so `pcall` reports malformed input like real cjson does.
 * It is prepended to the production scripts, which run unmodified.
 */
const CJSON_SHIM = `
cjson = {}
local function decode_string(s, i)
  local out, j = {}, i + 1
  while j <= #s do
    local c = s:sub(j, j)
    if c == '"' then return table.concat(out), j + 1 end
    if c == '\\\\' then
      out[#out + 1] = s:sub(j + 1, j + 1)
      j = j + 2
    else
      out[#out + 1] = c
      j = j + 1
    end
  end
  error('unterminated string')
end
local function skip_ws(s, i)
  while s:sub(i, i):match('%s') do i = i + 1 end
  return i
end
function cjson.decode(s)
  local i = skip_ws(s, 1)
  local c = s:sub(i, i)
  if c == '"' then
    local v = decode_string(s, i)
    return v
  elseif c == '{' then
    local obj = {}
    i = skip_ws(s, i + 1)
    if s:sub(i, i) == '}' then return obj end
    while true do
      if s:sub(i, i) ~= '"' then error('expected key') end
      local k
      k, i = decode_string(s, i)
      i = skip_ws(s, i)
      if s:sub(i, i) ~= ':' then error('expected colon') end
      i = skip_ws(s, i + 1)
      if s:sub(i, i) ~= '"' then error('only string values supported') end
      local v
      v, i = decode_string(s, i)
      obj[k] = v
      i = skip_ws(s, i)
      local d = s:sub(i, i)
      if d == '}' then return obj end
      if d ~= ',' then error('expected comma') end
      i = skip_ws(s, i + 1)
    end
  end
  error('unsupported json')
end
`;

const AGENT_LOCK_KEY = 'collaboration:write-lock:agent:agent-1';
const WORKFLOW_LOCK_KEY = 'collaboration:write-lock:workflow-1';

function makeCacheService() {
	const globalConfig = Container.get(GlobalConfig);
	globalConfig.cache.backend = 'redis';
	const cacheService = new CacheService(globalConfig);

	const originalEval = cacheService.eval.bind(cacheService);
	vi.spyOn(cacheService, 'eval').mockImplementation(
		async (script, keys, args) => await originalEval(CJSON_SHIM + script, keys, args),
	);

	return cacheService;
}

function redisClient(cacheService: CacheService) {
	// The client applies the configured key prefix itself, so raw reads use
	// the same un-prefixed keys as the service.
	return (cacheService as unknown as { cache: TaggedRedisCache }).cache.store.client;
}

describe('CollaborationState with Redis backend (Lua scripts)', () => {
	let cacheService: CacheService;
	let state: CollaborationState;

	beforeEach(async () => {
		cacheService = makeCacheService();
		await cacheService.init();
		state = new CollaborationState(cacheService);
	});

	afterEach(async () => {
		await cacheService.reset();
	});

	describe('backend detection', () => {
		it('runs a lock operation before the cache has been initialized', async () => {
			// A freshly started main may see a lock request before anything
			// else touched the cache; the backend check must initialize it.
			const coldCache = makeCacheService();
			const coldState = new CollaborationState(coldCache);

			const acquired = await coldState.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			expect(acquired).toBe(true);
			expect(coldCache.eval).toHaveBeenCalledTimes(1);
			await expect(coldState.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
			await coldCache.reset();
		});
	});

	describe('acquireAgentWriteLock', () => {
		it('acquires a free lock and stores it in the format getAgentWriteLock reads', async () => {
			const acquired = await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			expect(acquired).toBe(true);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
			const ttl = await redisClient(cacheService).pttl(AGENT_LOCK_KEY);
			expect(ttl).toBeGreaterThan(state.writeLockTtl - 1000);
			expect(ttl).toBeLessThanOrEqual(state.writeLockTtl);
		});

		it('refuses when another client holds the lock and leaves it untouched', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			const acquired = await state.acquireAgentWriteLock('agent-1', 'client-2', 'user-2');

			expect(acquired).toBe(false);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
		});

		it('re-acquires when the same client already holds the lock', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			const acquired = await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			expect(acquired).toBe(true);
		});

		it('lets exactly one of two concurrent requesters win', async () => {
			const results = await Promise.all([
				state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1'),
				state.acquireAgentWriteLock('agent-1', 'client-2', 'user-2'),
			]);

			expect(results.filter(Boolean)).toHaveLength(1);
			const lock = await state.getAgentWriteLock('agent-1');
			const winner = results[0] ? 'client-1' : 'client-2';
			expect(lock?.clientId).toBe(winner);
		});

		it('treats a malformed stored value as no lock, like the TypeScript parser', async () => {
			await cacheService.set(AGENT_LOCK_KEY, 'not-a-lock');
			await expect(state.getAgentWriteLock('agent-1')).resolves.toBeNull();

			const acquired = await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			expect(acquired).toBe(true);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
		});
	});

	describe('acquireAgentWriteLockForce', () => {
		it('steals the lock from the same user in another tab', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			const acquired = await state.acquireAgentWriteLockForce('agent-1', 'client-2', 'user-1');

			expect(acquired).toBe(true);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-2',
				userId: 'user-1',
			});
		});

		it('refuses to steal from a different user', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			const acquired = await state.acquireAgentWriteLockForce('agent-1', 'client-2', 'user-2');

			expect(acquired).toBe(false);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
		});
	});

	describe('renewAgentWriteLock', () => {
		it('extends the TTL for the holder only', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');
			const client = redisClient(cacheService);
			await client.pexpire(AGENT_LOCK_KEY, 5000);

			await state.renewAgentWriteLock('agent-1', 'client-2');
			expect(await client.pttl(AGENT_LOCK_KEY)).toBeLessThanOrEqual(5000);

			await state.renewAgentWriteLock('agent-1', 'client-1');
			expect(await client.pttl(AGENT_LOCK_KEY)).toBeGreaterThan(state.writeLockTtl - 1000);
		});

		it('does not create a lock when none exists', async () => {
			await state.renewAgentWriteLock('agent-1', 'client-1');

			await expect(state.getAgentWriteLock('agent-1')).resolves.toBeNull();
		});
	});

	describe('releaseAgentWriteLockIfHolder', () => {
		it('deletes the lock for the holder and reports success', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			const released = await state.releaseAgentWriteLockIfHolder('agent-1', 'client-1');

			expect(released).toBe(true);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toBeNull();
		});

		it('leaves the lock in place for a non-holder', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');

			const released = await state.releaseAgentWriteLockIfHolder('agent-1', 'client-2');

			expect(released).toBe(false);
			await expect(state.getAgentWriteLock('agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
		});

		it('reports false when there is no lock', async () => {
			await expect(state.releaseAgentWriteLockIfHolder('agent-1', 'client-1')).resolves.toBe(false);
		});
	});

	describe('getAgentWriteLocks', () => {
		it('reads many locks in one round-trip and omits agents without a lock', async () => {
			await state.acquireAgentWriteLock('agent-1', 'client-1', 'user-1');
			await state.acquireAgentWriteLock('agent-3', 'client-3', 'user-3');
			const getMany = vi.spyOn(cacheService, 'getMany');

			const locks = await state.getAgentWriteLocks(['agent-1', 'agent-2', 'agent-3']);

			expect(getMany).toHaveBeenCalledTimes(1);
			expect(locks).toEqual(
				new Map([
					['agent-1', { clientId: 'client-1', userId: 'user-1' }],
					['agent-3', { clientId: 'client-3', userId: 'user-3' }],
				]),
			);
		});

		it('skips the cache for an empty list', async () => {
			const getMany = vi.spyOn(cacheService, 'getMany');

			await expect(state.getAgentWriteLocks([])).resolves.toEqual(new Map());

			expect(getMany).not.toHaveBeenCalled();
		});
	});

	// The workflow methods share the scripts; one pass over each proves the
	// argument wiring on the workflow keys.
	describe('workflow write lock', () => {
		it('acquires, refuses another client, renews, and releases atomically', async () => {
			const client = redisClient(cacheService);

			expect(await state.acquireWriteLock('workflow-1', 'client-1', 'user-1')).toBe(true);
			expect(await state.acquireWriteLock('workflow-1', 'client-2', 'user-2')).toBe(false);
			await expect(state.getWriteLock('workflow-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});

			await client.pexpire(WORKFLOW_LOCK_KEY, 5000);
			await state.renewWriteLock('workflow-1', 'client-1');
			expect(await client.pttl(WORKFLOW_LOCK_KEY)).toBeGreaterThan(state.writeLockTtl - 1000);

			expect(await state.acquireWriteLockForce('workflow-1', 'client-3', 'user-2')).toBe(false);
			expect(await state.acquireWriteLockForce('workflow-1', 'client-3', 'user-1')).toBe(true);

			expect(await state.releaseWriteLockIfHolder('workflow-1', 'client-1')).toBe(false);
			expect(await state.releaseWriteLockIfHolder('workflow-1', 'client-3')).toBe(true);
			await expect(state.getWriteLock('workflow-1')).resolves.toBeNull();
		});
	});
});
