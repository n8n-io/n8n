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
		['preview', 'chat'],
		['n8n-chat', N8N_CHAT_PRODUCTION_SOURCE],
		['system', SYSTEM_CHAT_SOURCE],
	] as const)('lets the owner continue a %s thread with its own source', (surface, source) => {
		expect(canContinueThreadOnSurface(surface, thread, 'user-1', source)).toBe(true);
	});

	it.each([
		['preview', SYSTEM_CHAT_SOURCE],
		['n8n-chat', SYSTEM_CHAT_SOURCE],
		['system', 'chat'],
	] as const)('refuses a %s thread with a %s source', (surface, source) => {
		expect(canContinueThreadOnSurface(surface, thread, 'user-1', source)).toBe(false);
	});

	it('refuses a user who does not own the thread', () => {
		expect(canContinueThreadOnSurface('system', thread, 'user-2', SYSTEM_CHAT_SOURCE)).toBe(false);
	});
});
