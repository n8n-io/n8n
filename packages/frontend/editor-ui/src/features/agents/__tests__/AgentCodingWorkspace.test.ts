import type { AgentCodingFileContent, AgentCodingStatus } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import AgentCodingWorkspace from '../components/AgentCodingWorkspace.vue';

const api = vi.hoisted(() => ({
	status: vi.fn(),
	files: vi.fn(),
	file: vi.fn(),
	diff: vi.fn(),
	preview: vi.fn(),
	logs: vi.fn(),
	action: vi.fn(),
}));

vi.mock('../agentCoding.api', () => ({ createAgentCodingApi: () => api }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

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
	const status: AgentCodingStatus = {
		phase: 'ready',
		branch: 'demo',
		changes: [{ path: 'first.ts', status: 'M', additions: 1, deletions: 1 }],
		uncommittedChanges: 1,
		uncommittedPaths: ['first.ts'],
		app: 'running',
		check: 'not_started',
		setupExitCode: 0,
		checkExitCode: null,
	};
	api.status.mockResolvedValue(status);
	api.files.mockResolvedValue([
		{ path: 'first.ts', name: 'first.ts', type: 'file' },
		{ path: 'second.ts', name: 'second.ts', type: 'file' },
	]);
	api.file.mockImplementation(async (path: string) => ({ path, content: `// ${path}` }));
	api.diff.mockResolvedValue({
		path: 'first.ts',
		content: '@@ -1 +1 @@\n-old\n+new',
		revision: 'revision-1',
	});
	api.preview.mockResolvedValue({ url: 'https://preview.example.test' });
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	localStorage.clear();
});

function renderWorkspace() {
	return render(AgentCodingWorkspace, {
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
			sendReview: vi.fn().mockResolvedValue(true),
		},
		slots: { default: '<textarea aria-label="Chat draft" />' },
		global: { plugins: [createTestingPinia()] },
	});
}

it('keeps drafts and the preview mounted while opening, switching, and closing tabs', async () => {
	const user = userEvent.setup();
	const { container } = renderWorkspace();
	await flushPromises();
	const chatDraft = screen.getByRole('textbox', { name: 'Chat draft' });
	await user.type(chatDraft, 'Keep this draft');
	const files = within(screen.getByRole('complementary', { name: 'Repository panel' }));
	await user.click(files.getByRole('button', { name: 'All files' }));
	await user.click(await files.findByRole('button', { name: 'first.ts' }));
	await user.click(files.getByRole('button', { name: 'second.ts' }));
	await user.click(files.getByRole('button', { name: 'first.ts' }));
	expect(screen.getAllByRole('tab')).toHaveLength(3);
	expect(screen.getByRole('tabpanel', { name: 'first.ts' })).toHaveTextContent('// first.ts');
	expect(chatDraft).not.toBeVisible();

	await user.click(files.getByRole('button', { name: /^Changes/ }));
	await user.click(files.getByRole('button', { name: /first.ts/ }));
	await user.click((await screen.findAllByRole('button', { name: 'Comment on line 1' }))[1]);
	const comment = screen.getByRole('textbox', { name: 'Review comment' });
	await user.type(comment, 'Keep this review draft');
	await user.click(screen.getByRole('button', { name: 'Preview' }));
	const frame = within(await screen.findByRole('tabpanel', { name: 'Preview' })).getByTitle(
		'Preview',
	);
	expect(frame).toHaveAttribute('src', 'https://preview.example.test');

	await user.click(screen.getByRole('tab', { name: 'Chat' }));
	expect(screen.getByRole('textbox', { name: 'Chat draft' })).toBe(chatDraft);
	expect(chatDraft).toHaveValue('Keep this draft');
	expect(container.querySelector('iframe')).toBe(frame);
	expect(frame).not.toBeVisible();
	await user.click(screen.getByRole('tab', { name: 'Changes in first.ts' }));
	expect(screen.getByRole('textbox', { name: 'Review comment' })).toBe(comment);
	expect(comment).toHaveValue('Keep this review draft');
	await user.click(screen.getByRole('tab', { name: 'Preview' }));
	expect(frame).toBeVisible();
	expect(api.preview).toHaveBeenCalledOnce();

	await user.click(screen.getByRole('button', { name: 'Close Preview' }));
	expect(container.querySelector('iframe')).toBeNull();
	expect(api.action).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Close Changes in first.ts' }));
	await user.click(screen.getByRole('button', { name: 'Close second.ts' }));
	await user.click(screen.getByRole('button', { name: 'Close first.ts' }));
	expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
	expect(chatDraft).toBeVisible();
	expect(chatDraft).toHaveValue('Keep this draft');
});

it('ignores a late file response after its tab is closed and reopened', async () => {
	const firstRead = Promise.withResolvers<AgentCodingFileContent>();
	api.file.mockImplementationOnce(() => firstRead.promise);
	const user = userEvent.setup();
	renderWorkspace();
	await flushPromises();
	const files = within(screen.getByRole('complementary', { name: 'Repository panel' }));
	await user.click(files.getByRole('button', { name: 'All files' }));
	await user.click(await files.findByRole('button', { name: 'first.ts' }));
	await user.click(screen.getByRole('button', { name: 'Close first.ts' }));
	await user.click(files.getByRole('button', { name: 'first.ts' }));
	const firstPanel = screen.getByRole('tabpanel', { name: 'first.ts' });
	await user.click(files.getByRole('button', { name: 'second.ts' }));

	firstRead.resolve({ path: 'first.ts', content: 'stale content' });
	await flushPromises();
	expect(screen.getByRole('tab', { name: 'second.ts' })).toHaveAttribute('aria-selected', 'true');
	expect(firstPanel).toHaveTextContent('// first.ts');
	expect(firstPanel).not.toHaveTextContent('stale content');
	expect(screen.getAllByRole('tab')).toHaveLength(3);
});

it.each([
	['restarted', 'The sandbox restarted during setup'],
	['stopped', 'Setup stopped before it finished'],
] as const)('explains a %s setup and prepares the repository again', async (phase, label) => {
	const ready: AgentCodingStatus = await api.status();
	api.status.mockResolvedValue({ ...ready, phase, setupExitCode: null, app: 'stopped' });
	api.action.mockResolvedValue({ accepted: true });
	const user = userEvent.setup();
	renderWorkspace();
	await flushPromises();

	expect(screen.getByText(label)).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Prepare repository' }));

	expect(api.action).toHaveBeenCalledWith(expect.objectContaining({ action: 'prepare' }));
});

it('shows a check that stopped before it finished', async () => {
	const ready: AgentCodingStatus = await api.status();
	api.status.mockResolvedValue({ ...ready, check: 'stopped' });
	const user = userEvent.setup();
	renderWorkspace();
	await flushPromises();

	await user.click(screen.getByRole('button', { name: 'Logs' }));

	expect(screen.getByRole('button', { name: 'Check stopped before it finished' })).toBeVisible();
});
