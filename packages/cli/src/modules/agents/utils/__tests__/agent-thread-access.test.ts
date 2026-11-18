import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import {
	canContinueThreadOnSurface,
	chatSurfaceForKind,
	isExternalThreadOf,
	threadBelongsTo,
	N8N_CHAT_PRODUCTION_SOURCE,
	SYSTEM_CHAT_SOURCE,
} from '../agent-thread-access';

const thread = {
	accessScope: 'user',
	ownerId: 'user-1',
	parentThreadId: null,
	taskId: null,
} as AgentExecutionThread;

describe('chatSurfaceForKind', () => {
	it.each([
		['preview', 'preview'],
		['n8n_chat', 'n8n-chat'],
		['system', 'system'],
	] as const)('maps the %s kind to the %s surface', (kind, surface) => {
		expect(chatSurfaceForKind(kind)).toBe(surface);
	});
});

describe('canContinueThreadOnSurface', () => {
	it.each([
		['preview', 'chat', false],
		['n8n-chat', N8N_CHAT_PRODUCTION_SOURCE, false],
		['system', SYSTEM_CHAT_SOURCE, true],
	] as const)(
		'lets the owner continue a %s thread with its own source',
		(surface, source, isSystemAgent) => {
			expect(canContinueThreadOnSurface(surface, thread, 'user-1', source, isSystemAgent)).toBe(
				true,
			);
		},
	);

	it.each([
		['preview', SYSTEM_CHAT_SOURCE],
		['n8n-chat', SYSTEM_CHAT_SOURCE],
	] as const)('refuses a %s thread with a %s source', (surface, source) => {
		expect(canContinueThreadOnSurface(surface, thread, 'user-1', source, false)).toBe(false);
	});

	it('refuses a user who does not own the thread', () => {
		expect(canContinueThreadOnSurface('system', thread, 'user-2', SYSTEM_CHAT_SOURCE, true)).toBe(
			false,
		);
	});

	describe('system threads', () => {
		it('lets the owner continue a system thread before its first execution', () => {
			expect(canContinueThreadOnSurface('system', thread, 'user-1', undefined, true)).toBe(true);
		});

		it('refuses the system surface for a thread of a project agent, whatever its source', () => {
			expect(
				canContinueThreadOnSurface('system', thread, 'user-1', SYSTEM_CHAT_SOURCE, false),
			).toBe(false);
			expect(canContinueThreadOnSurface('system', thread, 'user-1', undefined, false)).toBe(false);
		});

		it('refuses a task thread of a system agent', () => {
			expect(
				canContinueThreadOnSurface('system', { ...thread, taskId: 'task-1' }, 'user-1', null, true),
			).toBe(false);
		});

		it.each([
			['preview', undefined],
			['preview', 'chat'],
			['n8n-chat', N8N_CHAT_PRODUCTION_SOURCE],
		] as const)(
			'refuses the %s surface for a thread of a system agent with source %s',
			(surface, source) => {
				expect(canContinueThreadOnSurface(surface, thread, 'user-1', source, true)).toBe(false);
			},
		);
	});
});

// SPIKE (agent-chat-embed): sessions of external chat principals.
describe('external threads', () => {
	const external = {
		...thread,
		accessScope: 'external',
		ownerId: null,
		externalPrincipal: 'invite-1',
		projectId: 'p',
		agentId: 'a',
	} as AgentExecutionThread;

	it('belongs only to its own principal', () => {
		expect(isExternalThreadOf(external, 'invite-1')).toBe(true);
		expect(isExternalThreadOf(external, 'invite-2')).toBe(false);
		expect(canContinueThreadOnSurface('external', external, 'invite-1', null, false)).toBe(true);
		expect(canContinueThreadOnSurface('external', external, 'anon-x', null, false)).toBe(false);
	});

	it('never matches an n8n user ID or another surface', () => {
		const raw = { ...external, externalPrincipal: 'u-1' } as AgentExecutionThread;
		expect(isExternalThreadOf(raw, 'u-1')).toBe(false);
		expect(threadBelongsTo(external, 'p', 'a', 'user-1')).toBe(false);
		expect(canContinueThreadOnSurface('n8n-chat', external, 'invite-1', null, false)).toBe(false);
		expect(canContinueThreadOnSurface('preview', external, 'invite-1', null, false)).toBe(false);
	});

	it('maps the external_chat queue kind to the external surface', () => {
		expect(chatSurfaceForKind('external_chat')).toBe('external');
	});
});
