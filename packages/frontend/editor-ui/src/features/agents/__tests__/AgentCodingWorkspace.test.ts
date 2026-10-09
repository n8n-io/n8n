import type { AgentCodingFileContent, AgentCodingStatus } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const showError = vi.hoisted(() => vi.fn());

vi.mock('../agentCoding.api', () => ({ createAgentCodingApi: () => api }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
// CodeMirror is slow to mount in jsdom and is not under test here.
vi.mock('../components/AgentCustomToolViewer.vue', () => ({
	default: { props: ['code'], template: '<pre data-testid="code-viewer">{{ code }}</pre>' },
}));

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
	api.preview.mockResolvedValue({ available: true, url: 'https://preview.example.test' });
	api.logs.mockResolvedValue({ content: '' });
	api.action.mockResolvedValue({ accepted: true });
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	localStorage.clear();
});

async function setStatus(overrides: Partial<AgentCodingStatus>) {
	const ready: AgentCodingStatus = await api.status();
	api.status.mockResolvedValue({ ...ready, ...overrides });
}

function renderWorkspace({ canExecute = true } = {}) {
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
			canExecute,
			sendReview: vi.fn().mockResolvedValue(true),
		},
		slots: { default: '<textarea aria-label="Chat draft" />' },
		global: { plugins: [createTestingPinia()] },
	});
}

it('keeps drafts and the preview mounted while opening, switching, and closing tabs', async () => {
	const user = userEvent.setup({ delay: null });
	const { container } = renderWorkspace();
	const chatDraft = await screen.findByRole('textbox', { name: 'Chat draft' });
	await user.type(chatDraft, 'Keep this draft');
	const files = within(screen.getByRole('complementary', { name: 'Repository panel' }));
	await user.click(files.getByRole('button', { name: 'All files' }));
	await user.click(await files.findByRole('button', { name: 'first.ts' }));
	await user.click(files.getByRole('button', { name: 'second.ts' }));
	await user.click(files.getByRole('button', { name: 'first.ts' }));
	expect(screen.getAllByRole('tab')).toHaveLength(3);
	// Wait for the file content, not for a fixed time.
	await waitFor(() =>
		expect(screen.getByRole('tabpanel', { name: 'first.ts' })).toHaveTextContent('// first.ts'),
	);
	expect(chatDraft).not.toBeVisible();

	await user.click(files.getByRole('button', { name: /^Changes/ }));
	await user.click(files.getByRole('button', { name: /first.ts/ }));
	await user.click((await screen.findAllByRole('button', { name: 'Comment on line 1' }))[1]);
	const comment = screen.getByRole('textbox', { name: 'Review comment' });
	await user.type(comment, 'Keep this review draft');
	await user.click(screen.getByRole('button', { name: 'Preview' }));
	const frame = await within(await screen.findByRole('tabpanel', { name: 'Preview' })).findByTitle(
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
	await setStatus({ phase, setupExitCode: null, app: 'stopped' });
	const user = userEvent.setup();
	renderWorkspace();
	await flushPromises();

	expect(screen.getByText(label)).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Prepare repository' }));

	expect(api.action).toHaveBeenCalledWith(expect.objectContaining({ action: 'prepare' }));
});

it('shows a check that stopped before it finished', async () => {
	await setStatus({ check: 'stopped' });
	const user = userEvent.setup();
	renderWorkspace();
	await flushPromises();

	await user.click(screen.getByRole('button', { name: 'Logs' }));

	expect(screen.getByRole('button', { name: 'Check stopped before it finished' })).toBeVisible();
});

async function openPreviewTab(options: { canExecute?: boolean } = {}) {
	const user = userEvent.setup({ delay: null });
	renderWorkspace(options);
	await user.click(await screen.findByRole('button', { name: 'Preview' }));
	const panel = await screen.findByRole('tabpanel', { name: 'Preview' });
	return { user, panel };
}

it('explains in the panel that this sandbox cannot show a preview, without an error toast', async () => {
	api.preview.mockResolvedValue({ available: false });
	const { user, panel } = await openPreviewTab();

	const state = await within(panel).findByRole('status');
	await waitFor(() => expect(state).toHaveAttribute('data-state', 'unavailable'));
	expect(state).toHaveTextContent('Preview is not available for this sandbox yet.');
	expect(state).not.toHaveTextContent('App running');
	expect(state).not.toHaveTextContent('Run the app');
	expect(panel.querySelector('iframe')).toBeNull();
	expect(showError).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: 'Open in browser' })).toBeDisabled();

	await user.click(within(state).getByRole('button', { name: 'Show app logs' }));
	expect(await screen.findByRole('button', { name: 'App running', pressed: true })).toBeVisible();
	expect(api.preview).toHaveBeenCalledOnce();
});

it('shows a failed preview request in the panel and lets the user try again', async () => {
	api.preview.mockRejectedValueOnce(new Error('The sandbox did not answer'));
	const { user, panel } = await openPreviewTab();

	const state = await within(panel).findByRole('status');
	await waitFor(() => expect(state).toHaveTextContent('Could not open the preview'));
	expect(showError).toHaveBeenCalledOnce();

	await user.click(within(state).getByRole('button', { name: 'Show preview' }));

	expect(await within(panel).findByTitle('Preview')).toHaveAttribute(
		'src',
		'https://preview.example.test',
	);
});

it('does not offer to run the app while it opens the preview of a running app', async () => {
	api.preview.mockReturnValue(new Promise(() => {}));
	const { panel } = await openPreviewTab();

	const state = await within(panel).findByRole('status');
	await waitFor(() => expect(state).toHaveAttribute('data-state', 'loading'));
	expect(state).toHaveTextContent('Opening the preview…');
	expect(state).not.toHaveTextContent('Run the app');
	expect(within(state).queryByRole('button')).toBeNull();
});

it.each(['running', 'starting'] as const)(
	'tells a user who cannot run the agent why a %s app has no preview',
	async (app) => {
		await setStatus({ app });
		const { panel } = await openPreviewTab({ canExecute: false });

		const state = await within(panel).findByRole('status');
		await waitFor(() => expect(state).toHaveAttribute('data-state', 'noAccess'));
		expect(within(state).getByRole('heading')).toHaveTextContent('You cannot open the preview');
		expect(state).toHaveTextContent('To open the preview, you need permission to run this agent.');
		expect(state).not.toHaveTextContent('Opening the preview');
		expect(within(state).queryByRole('button')).toBeNull();
		expect(api.preview).not.toHaveBeenCalled();
	},
);

it.each([
	['stopped', 'App stopped', 'Run the app to test your changes here.'],
	['error', 'App stopped with an error', 'Check the app logs, then run the app again.'],
	['starting', 'App starting…', 'The preview opens here when the app is ready.'],
] as const)('gives a %s app one matching heading and hint', async (app, title, hint) => {
	await setStatus({ app });
	const { panel } = await openPreviewTab();

	const state = await within(panel).findByRole('status');
	await waitFor(() => expect(state).toHaveAttribute('data-state', app));
	expect(within(state).getByRole('heading')).toHaveTextContent(title);
	expect(state).toHaveTextContent(hint);
	const run = within(state).queryByRole('button', { name: 'Run app' });
	expect(Boolean(run)).toBe(app !== 'starting');
});

describe('logs', () => {
	const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');

	beforeEach(() => {
		// jsdom has no layout, so give every element a fixed content height.
		Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
			configurable: true,
			get: () => 900,
		});
	});

	afterEach(() => {
		if (scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeight);
	});

	it('open at the end of the output', async () => {
		api.logs.mockResolvedValue({ content: 'line 1\nline 2\nready' });
		const user = userEvent.setup({ delay: null });
		const { container } = renderWorkspace();

		await user.click(await screen.findByRole('button', { name: 'Logs' }));
		const output = await waitFor(() => {
			const element = container.querySelector<HTMLElement>('[data-testid="agent-coding-logs"]');
			expect(element).toHaveTextContent('ready');
			return element;
		});

		expect(output?.scrollTop).toBe(900);
	});
});
