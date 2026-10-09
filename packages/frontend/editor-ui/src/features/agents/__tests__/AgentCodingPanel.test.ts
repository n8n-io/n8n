import type { AgentCodingConfig, AgentCodingStatus } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import AgentCodingPanel from '../components/AgentCodingPanel.vue';

const api = vi.hoisted(() => ({ status: vi.fn(), action: vi.fn() }));

vi.mock('../agentCoding.api', () => ({ createAgentCodingApi: () => api }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('@/features/credentials/components/CredentialPicker/CredentialPicker.vue', () => ({
	default: {
		name: 'CredentialPicker',
		props: ['createButtonVariant'],
		template: '<div data-testid="credential-picker" :data-create-variant="createButtonVariant" />',
	},
}));

const config: AgentCodingConfig = {
	repositoryUrl: 'https://github.com/example/demo',
	branch: 'main',
	setupCommand: 'pnpm install',
	runCommand: 'pnpm dev',
	checkCommand: 'pnpm test',
	port: 3000,
};

function status(overrides: Partial<AgentCodingStatus> = {}): AgentCodingStatus {
	return {
		phase: 'ready',
		branch: 'main',
		changes: [],
		uncommittedChanges: 0,
		uncommittedPaths: [],
		app: 'stopped',
		check: 'not_started',
		setupExitCode: 0,
		checkExitCode: null,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	api.status.mockResolvedValue(status());
	api.action.mockResolvedValue({ accepted: true });
});

afterEach(() => {
	cleanup();
});

/** The agents components use `data-testid`, which `getByTestId` does not read here. */
function byTestId(id: string): HTMLElement {
	const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
	if (!element) throw new Error(`No element with data-testid "${id}"`);
	return element;
}

function renderPanel(panelConfig: AgentCodingConfig | null = config) {
	return render(AgentCodingPanel, {
		props: { config: panelConfig, projectId: 'project', agentId: 'agent', canExecute: true },
		global: { plugins: [createTestingPinia()] },
	});
}

async function openSettings() {
	const user = userEvent.setup();
	await flushPromises();
	await user.click(screen.getByRole('button', { name: 'Edit coding settings' }));
	return { user, timeLimit: await screen.findByLabelText('Check time limit (minutes)') };
}

it('shows an empty time limit with the default of the repository as placeholder', async () => {
	renderPanel();
	const { timeLimit } = await openSettings();

	expect(timeLimit).toHaveValue(null);
	expect(timeLimit).toHaveAttribute('placeholder', '10');
});

it('saves the check time limit that the user enters', async () => {
	const { emitted } = renderPanel();
	const { user, timeLimit } = await openSettings();

	await user.type(timeLimit, '45');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await flushPromises();

	expect(emitted()['update:config']).toEqual([[{ ...config, checkTimeoutMinutes: 45 }]]);
	expect(api.action).toHaveBeenCalledWith({ action: 'prepare' });
});

it('keeps a saved time limit, and saves no limit when the field is cleared', async () => {
	const { emitted } = renderPanel({ ...config, checkTimeoutMinutes: 20 });
	const { user, timeLimit } = await openSettings();
	expect(timeLimit).toHaveValue(20);

	await user.clear(timeLimit);
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await flushPromises();

	expect(emitted()['update:config']).toEqual([[{ ...config, checkTimeoutMinutes: undefined }]]);
});

it('rejects a time limit out of range without saving', async () => {
	const { emitted } = renderPanel();
	const { user, timeLimit } = await openSettings();

	await user.type(timeLimit, '0');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await flushPromises();

	expect(screen.getByText('Enter a check time limit from 1 to 240 minutes')).toBeInTheDocument();
	expect(emitted()['update:config']).toBeUndefined();
	expect(api.action).not.toHaveBeenCalled();
});

it('uses the longer limit of the monorepo for the n8n repository only', async () => {
	renderPanel(null);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Set up coding' }));
	const timeLimit = await screen.findByLabelText('Check time limit (minutes)');
	const repository = screen.getByPlaceholderText('https://github.com/n8n-io/n8n.git');
	expect(repository).toHaveValue('https://github.com/n8n-io/n8n.git');
	expect(timeLimit).toHaveValue(30);

	await user.clear(repository);
	await user.type(repository, 'https://github.com/example/demo');
	expect(timeLimit).toHaveValue(null);
	expect(timeLimit).toHaveAttribute('placeholder', '10');

	await user.clear(repository);
	await user.type(repository, 'https://github.com/n8n-io/n8n.git');
	expect(timeLimit).toHaveValue(30);
	expect(timeLimit).toHaveAttribute('placeholder', '30');
});

it.each([
	['restarted', 'The sandbox restarted during setup'],
	['stopped', 'Setup stopped before it finished'],
] as const)('shows the %s setup phase', async (phase, label) => {
	api.status.mockResolvedValue(status({ phase, setupExitCode: null }));
	renderPanel();
	await flushPromises();

	expect(screen.getByText(label)).toBeInTheDocument();
});

it('names the dialog for an agent with coding, and saves with Save', async () => {
	renderPanel();
	await openSettings();

	const dialog = screen.getByRole('dialog', { name: 'Coding settings' });
	expect(within(dialog).getByRole('button', { name: 'Save' })).toBeVisible();
	expect(within(dialog).queryByRole('button', { name: 'Connect repository' })).toBeNull();
	expect(within(dialog).queryByText('Set up coding')).toBeNull();
});

it('keeps the setup title and action for an agent without coding', async () => {
	renderPanel(null);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Set up coding' }));

	const dialog = await screen.findByRole('dialog', { name: 'Set up coding' });
	expect(within(dialog).getByRole('button', { name: 'Connect repository' })).toBeVisible();
	expect(within(dialog).queryByRole('button', { name: 'Remove coding' })).toBeNull();
});

it('makes creating a credential a secondary action', async () => {
	renderPanel();
	await openSettings();

	expect(byTestId('credential-picker')).toHaveAttribute('data-create-variant', 'outline');
});

it('removes coding with a destructive action', async () => {
	const { emitted } = renderPanel();
	const { user } = await openSettings();

	const remove = screen.getByRole('button', { name: 'Remove coding' });
	expect(remove).toHaveClass('destructive');
	await user.click(remove);

	expect(emitted()['update:config']).toEqual([[null]]);
	expect(api.action).not.toHaveBeenCalled();
});

it('shows a ready repository as a success badge, with one settings action and no Open coding', async () => {
	renderPanel();
	await flushPromises();

	const row = byTestId('agent-coding-capability');
	const badge = byTestId('agent-coding-status');
	expect(badge).toHaveTextContent('Ready');
	expect(badge).toHaveAttribute('data-phase', 'ready');
	expect(badge).toHaveClass('success');
	expect(within(row).getAllByRole('button')).toHaveLength(1);
	expect(within(row).getByRole('button', { name: 'Edit coding settings' })).toBeVisible();
	expect(within(row).queryByRole('button', { name: 'Open coding' })).toBeNull();
});

it.each([
	['error', 'Preparation failed', 'danger'],
	['installing', 'Running setup…', 'info'],
	['not_started', 'Not prepared', 'outline'],
] as const)('shows the %s phase in a %s badge', async (phase, label, variant) => {
	api.status.mockResolvedValue(status({ phase }));
	renderPanel();
	await flushPromises();

	const badge = byTestId('agent-coding-status');
	expect(badge).toHaveTextContent(label);
	expect(badge).toHaveClass(variant);
});
