import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('InstanceAiConfig concurrency caps', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('defaults to unlimited so the feature is off until opted into', () => {
		const { instanceAi } = Container.get(GlobalConfig);

		expect(instanceAi.maxConcurrentRuns).toBe(-1);
		expect(instanceAi.maxConcurrentRunsPerUser).toBe(-1);
		expect(instanceAi.maxConcurrentSubAgents).toBe(-1);
	});

	it('accepts a positive override', () => {
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', '20');

		expect(Container.get(GlobalConfig).instanceAi.maxConcurrentRuns).toBe(20);
	});

	it('accepts -1 for unlimited', () => {
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', '-1');
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS_PER_USER', '-1');
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_SUB_AGENTS', '-1');

		const { instanceAi } = Container.get(GlobalConfig);

		expect(instanceAi.maxConcurrentRuns).toBe(-1);
		expect(instanceAi.maxConcurrentRunsPerUser).toBe(-1);
		expect(instanceAi.maxConcurrentSubAgents).toBe(-1);
	});

	// `0` would be ambiguous — "block everything" or "no cap" — so it is rejected rather
	// than guessed at. An invalid value falls back to the default, which is unlimited.
	it.each(['0', '-5', '2.5', 'unlimited'])('rejects %s and falls back to the default', (value) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', value);

		expect(Container.get(GlobalConfig).instanceAi.maxConcurrentRuns).toBe(-1);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS'),
		);
	});
});

describe('InstanceAiConfig nodeContractTracePayloads', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('is off by default', () => {
		expect(Container.get(GlobalConfig).instanceAi.nodeContractTracePayloads).toBe('off');
	});

	it.each(['shape', 'redacted'] as const)('accepts %s', (value) => {
		vi.stubEnv('N8N_NODE_CONTRACT_TRACE_PAYLOADS', value);

		expect(Container.get(GlobalConfig).instanceAi.nodeContractTracePayloads).toBe(value);
	});

	it('reports an unknown value and stays off', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_NODE_CONTRACT_TRACE_PAYLOADS', 'full');

		expect(Container.get(GlobalConfig).instanceAi.nodeContractTracePayloads).toBe('off');
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for N8N_NODE_CONTRACT_TRACE_PAYLOADS'),
		);
	});
});

describe('InstanceAiConfig node runtimes', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	it('defaults to worker first for first-party and wasm first for community', () => {
		const { instanceAi } = Container.get(GlobalConfig);

		expect(instanceAi.nodesNextRuntimesFirstParty).toEqual([
			'worker',
			'in-process',
			'wasm',
			'container',
		]);
		expect(instanceAi.nodesNextRuntimesCommunity).toEqual(['wasm', 'container']);
		expect(instanceAi.nodesNextRuntimesPrivate).toEqual(['wasm', 'container']);
		expect(instanceAi.nodesNextContainerEnabled).toBe(false);
	});

	it('reads the lists in their order', () => {
		vi.stubEnv('N8N_NODES_NEXT_RUNTIMES_FIRST_PARTY', 'in-process,worker');
		vi.stubEnv('N8N_NODES_NEXT_RUNTIMES_COMMUNITY', 'container,wasm,worker');
		vi.stubEnv('N8N_NODES_NEXT_RUNTIMES_PRIVATE', 'container');
		vi.stubEnv('N8N_NODES_NEXT_CONTAINER_ENABLED', 'true');

		const { instanceAi } = Container.get(GlobalConfig);

		expect(instanceAi.nodesNextRuntimesFirstParty).toEqual(['in-process', 'worker']);
		expect(instanceAi.nodesNextRuntimesCommunity).toEqual(['container', 'wasm', 'worker']);
		expect(instanceAi.nodesNextRuntimesPrivate).toEqual(['container']);
		expect(instanceAi.nodesNextContainerEnabled).toBe(true);
	});

	it.each([
		['wasm,docker', 'N8N_NODES_NEXT_RUNTIMES_COMMUNITY has the unknown runtime "docker"'],
		['wasm,wasm', 'N8N_NODES_NEXT_RUNTIMES_COMMUNITY has the runtime "wasm" twice'],
		['', 'N8N_NODES_NEXT_RUNTIMES_COMMUNITY has no runtime'],
	])('refuses the community list "%s"', (value, error) => {
		vi.stubEnv('N8N_NODES_NEXT_RUNTIMES_COMMUNITY', value);

		expect(() => Container.get(GlobalConfig)).toThrow(error);
	});

	it('refuses an unknown private runtime', () => {
		vi.stubEnv('N8N_NODES_NEXT_RUNTIMES_PRIVATE', 'wasm,docker');

		expect(() => Container.get(GlobalConfig)).toThrow(
			'N8N_NODES_NEXT_RUNTIMES_PRIVATE has the unknown runtime "docker"',
		);
	});

	it('refuses an unknown first-party runtime', () => {
		vi.stubEnv('N8N_NODES_NEXT_RUNTIMES_FIRST_PARTY', 'worker,wasm-reuse');

		expect(() => Container.get(GlobalConfig)).toThrow(
			'N8N_NODES_NEXT_RUNTIMES_FIRST_PARTY has the unknown runtime "wasm-reuse"',
		);
	});
});
