import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import {
	canContinueThreadOnSurface,
	chatSurfaceForKind,
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
