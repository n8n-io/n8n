import type { AgentCodingChat, AgentCodingSessionSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import AgentCodingView from '../components/AgentCodingView.vue';

const api = vi.hoisted(() => ({
	sessions: vi.fn(),
	status: vi.fn(),
	createChat: vi.fn(),
	createSession: vi.fn(),
	files: vi.fn(),
	file: vi.fn(),
	preview: vi.fn(),
	action: vi.fn(),
}));

vi.mock('../agentCoding.api', () => ({ createAgentCodingApi: () => api }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

const worktreeId = '00000000-0000-4000-8000-000000000001';
const newChat: AgentCodingChat = {
	id: '00000000-0000-4000-8000-000000000002',
	hasConversation: false,
};

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
		media: query,
		matches: false,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
	const session: AgentCodingSessionSummary = {
		id: worktreeId,
		name: 'My worktree',
		branch: 'demo',
		baseBranch: 'main',
		baseCommit: 'a'.repeat(40),
		original: false,
		createdAt: '2026-10-06T12:00:00.000Z',
		archivedAt: null,
		hasConversation: true,
		chatIds: [],
		chats: [{ id: worktreeId, title: 'First task', hasConversation: true }],
		activity: 'completed',
		status: {
			phase: 'ready',
			branch: 'demo',
			changes: [],
			uncommittedChanges: 0,
			uncommittedPaths: [],
			app: 'running',
			check: 'not_started',
			setupExitCode: 0,
			checkExitCode: null,
		},
	};
	api.sessions.mockImplementation(async () =>
		structuredClone({ sessions: [session], branches: ['main'] }),
	);
	api.status.mockResolvedValue(session.status);
	api.createChat.mockImplementation(async () => {
		session.chats.push(newChat);
		session.chatIds.push(newChat.id);
		return newChat;
	});
	api.files.mockResolvedValue([{ path: 'app.ts', name: 'app.ts', type: 'file' }]);
	api.file.mockResolvedValue({ path: 'app.ts', content: '// Keep these changes' });
	api.preview.mockResolvedValue({ available: true, url: 'https://preview.example.test' });
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	localStorage.clear();
});

function renderView(sessionId = worktreeId) {
	return render(AgentCodingView, {
		props: {
			projectId: 'project',
			agentId: 'agent',
			config: {
				repositoryUrl: 'https://github.com/example/demo',
				branch: 'main',
				setupCommand: '',
				runCommand: 'pnpm dev',
				checkCommand: '',
				port: 3000,
			},
			canExecute: true,
			sessionId,
			sendReview: vi.fn().mockResolvedValue(true),
		},
		slots: { default: '<textarea aria-label="Chat draft" />' },
		global: { plugins: [createTestingPinia()] },
	});
}

it('starts a fresh chat in the current worktree and switches back without resetting tabs', async () => {
	const user = userEvent.setup();
	const { container, emitted } = renderView();
	await flushPromises();
	const files = within(screen.getByRole('complementary', { name: 'Repository panel' }));
	await user.click(files.getByRole('button', { name: 'All files' }));
	await user.click(await files.findByRole('button', { name: 'app.ts' }));
	await user.click(screen.getByRole('button', { name: 'Preview' }));
	const frame = within(await screen.findByRole('tabpanel', { name: 'Preview' })).getByTitle(
		'Preview',
	);
	await user.click(screen.getByRole('button', { name: 'New chat' }));
	await flushPromises();

	expect(api.createChat).toHaveBeenCalledExactlyOnceWith(worktreeId);
	expect(emitted()['session-select'].at(-1)).toEqual([newChat]);
	expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
	expect(screen.getByRole('tab', { name: 'app.ts' })).toBeInTheDocument();
	expect(container.querySelector('iframe')).toBe(frame);
	expect(frame).not.toBeVisible();
	expect(screen.getByRole('button', { name: 'My worktree, demo, Finished' })).toHaveAttribute(
		'aria-current',
		'true',
	);
	expect(api.createSession).not.toHaveBeenCalled();
	expect(api.action).not.toHaveBeenCalled();

	await user.click(screen.getByRole('button', { name: 'Chat 2' }));
	await user.click(await screen.findByRole('menuitem', { name: 'First task' }));
	expect(emitted()['session-select'].at(-1)).toEqual([
		{ id: worktreeId, title: 'First task', hasConversation: true },
	]);
	expect(container.querySelector('iframe')).toBe(frame);
	await user.click(screen.getByRole('tab', { name: 'app.ts' }));
	expect(screen.getByRole('tabpanel', { name: 'app.ts' })).toHaveTextContent('Keep these changes');
});

it('keeps the current chat selected when creating a chat fails', async () => {
	api.createChat.mockRejectedValueOnce(new Error('Sandbox unavailable'));
	const user = userEvent.setup();
	const { emitted } = renderView();
	await flushPromises();
	await user.click(screen.getByRole('button', { name: 'New chat' }));
	await flushPromises();

	expect(screen.getByRole('alert')).toHaveTextContent('Sandbox unavailable');
	expect(emitted()['session-select']).toEqual([
		[{ id: worktreeId, title: 'First task', hasConversation: true }],
	]);
	expect(screen.getByRole('button', { name: 'New chat' })).toBeEnabled();
});

it('restores a chat link to its worktree after reloading', async () => {
	await api.createChat(worktreeId);
	const { emitted } = renderView(newChat.id);
	await flushPromises();

	expect(emitted()['session-select']).toEqual([[newChat]]);
	expect(screen.getByRole('button', { name: 'Chat 2' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'My worktree, demo, Finished' })).toHaveAttribute(
		'aria-current',
		'true',
	);
	expect(api.createSession).not.toHaveBeenCalled();
});

it.each([
	['stopped', 'Setup stopped'],
	['restarted', 'Sandbox restarted'],
] as const)(
	'shows a worktree with a %s setup as interrupted, not as preparing',
	async (phase, text) => {
		const listed = await api.sessions();
		const [session] = listed.sessions;
		session.status = { ...session.status, phase, setupExitCode: null };
		api.sessions.mockResolvedValue({ ...listed, sessions: [session] });
		renderView();
		await flushPromises();

		expect(screen.getByRole('button', { name: `My worktree, demo, ${text}` })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Preparing/ })).not.toBeInTheDocument();
	},
);
