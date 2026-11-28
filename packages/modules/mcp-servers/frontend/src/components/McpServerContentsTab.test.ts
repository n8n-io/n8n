import type {
	McpServerDetailResponse,
	McpServerToolCandidate,
	McpServerToolDetailResponse,
	McpServerToolResponse,
} from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter } from 'vue-router';

import McpServerContentsTab from './McpServerContentsTab.vue';

const api = vi.hoisted(() => ({
	getMcpServer: vi.fn(),
	getToolDetail: vi.fn(),
	updateMcpServer: vi.fn(),
	listToolCandidates: vi.fn(),
	addWorkflowTools: vi.fn(),
	updateTool: vi.fn(),
	removeTool: vi.fn(),
	draftTool: vi.fn(),
}));
vi.mock('../mcp-servers.api', () => api);

const permissions = vi.hoisted(() => ({ canUpdate: true }));
vi.mock('../mcp-servers.permissions', () => ({
	getMcpServerPermissions: () => ({ canList: true, canRead: true, ...permissions }),
}));

const toast = vi.hoisted(() => ({ showError: vi.fn(), showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const PROJECT_ID = 'project-1';
const SERVER_ID = '0190a8d6-4a2e-7000-8000-000000000001';

function tool(overrides: Partial<McpServerToolResponse> = {}): McpServerToolResponse {
	return {
		id: '0190a8d6-4a2e-7000-8000-0000000000a1',
		serverId: SERVER_ID,
		kind: 'workflow',
		targetId: 'wf-5',
		toolName: 'get_campaign_numbers',
		description: 'Numbers of a campaign.',
		draftSource: 'defaults',
		position: 0,
		brokenReason: null,
		createdAt: '2026-11-24T10:00:00.000Z',
		updatedAt: '2026-11-24T10:00:00.000Z',
		...overrides,
	};
}

function toolDetail(
	overrides: Partial<McpServerToolDetailResponse> = {},
): McpServerToolDetailResponse {
	return {
		...tool(overrides),
		sourceName: 'Get campaign numbers',
		inputs: [
			{ name: 'campaign_id', type: 'string' },
			{ name: 'days', type: 'number' },
		],
		outputs: [
			{ name: 'clicks', type: 'number' },
			{ name: 'active', type: 'boolean' },
		],
		...overrides,
	};
}

/** Edit the inline modal title via N8nInlineTextEdit. */
async function editModalTitle(nextValue: string) {
	const titleArea = await screen.findByTestId('inline-editable-area');
	await userEvent.click(titleArea);
	const input = screen.getByTestId('inline-edit-input');
	await userEvent.clear(input);
	await userEvent.type(input, `${nextValue}{Enter}`);
}

function server(
	tools: McpServerToolResponse[],
	toolDraftsAvailable = true,
	description = '',
): McpServerDetailResponse {
	return {
		id: SERVER_ID,
		projectId: PROJECT_ID,
		project: { name: 'Marketing', type: 'team' },
		name: 'Marketing tools',
		slug: 'marketing-tools',
		description,
		createdAt: '2026-11-24T10:00:00.000Z',
		updatedAt: '2026-11-24T10:00:00.000Z',
		tools,
		toolDraftsAvailable,
	};
}

/** A promise that the test settles, to see the state while a call runs. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const candidates: McpServerToolCandidate[] = [
	{ workflowId: 'wf-1', name: 'Get campaign numbers', description: 'Numbers', reason: null },
	{ workflowId: 'wf-2', name: 'Draft only', description: null, reason: 'not_published' },
	{ workflowId: 'wf-3', name: 'Manual start', description: null, reason: 'missing_trigger' },
	{ workflowId: 'wf-4', name: 'Closed', description: null, reason: 'caller_policy' },
	{ workflowId: 'wf-7', name: 'Has a form', description: null, reason: 'incompatible_nodes' },
	{ workflowId: 'wf-5', name: 'Old one', description: null, reason: 'already_added' },
	{ workflowId: 'wf-6', name: 'Escalate to on-call', description: null, reason: null },
];

async function createTestRouter(initialPath = '/') {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: { render: () => null } },
			{ path: '/workflow/:workflowId', name: VIEWS.WORKFLOW, component: { render: () => null } },
		],
	});
	await router.push(initialPath);
	await router.isReady();
	return router;
}

const renderComponent = createComponentRenderer(McpServerContentsTab, {
	props: { projectId: PROJECT_ID, serverId: SERVER_ID },
});

async function render(options?: { props?: Record<string, unknown>; path?: string }) {
	const router = await createTestRouter(options?.path ?? '/');
	return renderComponent({
		props: { projectId: PROJECT_ID, serverId: SERVER_ID, ...options?.props },
		global: { plugins: [router] },
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	permissions.canUpdate = true;
	api.listToolCandidates.mockResolvedValue(candidates);
	api.getToolDetail.mockResolvedValue(toolDetail());
	api.updateMcpServer.mockImplementation(async (_ctx, _projectId, _serverId, body) => ({
		...server([]),
		...body,
	}));
});

describe('McpServerContentsTab', () => {
	describe('panels layout', () => {
		it('renders Description and Capabilities panels and hides P1 rows and Skills', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()], true, 'Use for campaign metrics.'));
			const { findByTestId, queryByText } = await render();

			const descriptionPanel = await findByTestId('mcp-server-description-panel');
			expect(descriptionPanel).toHaveTextContent('Description');
			expect(descriptionPanel).toHaveTextContent(
				'AI clients get this text as the instructions of the server.',
			);

			const capabilitiesPanel = await findByTestId('mcp-server-capabilities-panel');
			expect(capabilitiesPanel).toHaveTextContent('Capabilities');
			expect(capabilitiesPanel).toHaveTextContent('Each item is a tool that AI clients can call.');
			expect(capabilitiesPanel).toHaveTextContent('Workflows');

			expect(queryByText('Tools')).not.toBeInTheDocument();
			expect(queryByText('Agents')).not.toBeInTheDocument();
			expect(queryByText('Skills')).not.toBeInTheDocument();
		});
	});

	describe('description panel', () => {
		it('limits the description to 2,000 characters and saves line breaks on blur', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Pipeline numbers'));
			const { findByTestId, emitted } = await render();

			const input = await findByTestId('mcp-server-description-input');
			expect(input).toHaveAttribute('maxlength', '2000');
			expect(input).toHaveValue('Pipeline numbers');

			await userEvent.clear(input);
			await userEvent.type(input, 'For the revenue team{Enter}Ask before you send mail');
			await fireEvent.blur(input);

			await waitFor(() =>
				expect(api.updateMcpServer).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, SERVER_ID, {
					description: 'For the revenue team\nAsk before you send mail',
				}),
			);
			expect(emitted('server-updated')).toHaveLength(1);
		});

		it('saves an empty description', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Pipeline numbers'));
			const { findByTestId } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await fireEvent.blur(input);

			await waitFor(() =>
				expect(api.updateMcpServer).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, SERVER_ID, {
					description: '',
				}),
			);
		});

		it('reverts the description when the builder presses Escape', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Pipeline numbers'));
			const { findByTestId } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.type(input, ' and more{Escape}');

			expect(input).toHaveValue('Pipeline numbers');
			expect(api.updateMcpServer).not.toHaveBeenCalled();
		});

		it('restores the saved description when saving fails', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Pipeline numbers'));
			api.updateMcpServer.mockRejectedValue(new Error('Server error'));
			const { findByTestId } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'New instructions');
			await fireEvent.blur(input);

			await waitFor(() => expect(input).toHaveValue('Pipeline numbers'));
			expect(toast.showError).toHaveBeenCalledTimes(1);
		});

		it('keeps an in-progress description edit when an earlier save resolves or fails', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const firstSave = deferred<McpServerDetailResponse>();
			const secondSave = deferred<McpServerDetailResponse>();
			api.updateMcpServer
				.mockReturnValueOnce(firstSave.promise)
				.mockReturnValueOnce(secondSave.promise);
			const { findByTestId } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'First draft');
			await fireEvent.blur(input);

			await userEvent.click(input);
			await userEvent.type(input, ' and more');

			firstSave.resolve(server([], true, 'First draft'));
			await firstSave.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(input).toHaveValue('First draft and more');

			await fireEvent.blur(input);
			await userEvent.click(input);
			await userEvent.type(input, ' still typing');

			secondSave.reject(new Error('Server error'));
			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));

			expect(input).toHaveValue('First draft and more still typing');
		});

		it('ignores stale responses and failures from superseded description saves', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const firstSave = deferred<McpServerDetailResponse>();
			const secondSave = deferred<McpServerDetailResponse>();
			const thirdSave = deferred<McpServerDetailResponse>();
			api.updateMcpServer
				.mockReturnValueOnce(firstSave.promise)
				.mockReturnValueOnce(secondSave.promise)
				.mockReturnValueOnce(thirdSave.promise);
			const { findByTestId, emitted } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'First');
			await fireEvent.blur(input);

			await userEvent.clear(input);
			await userEvent.type(input, 'Second');
			await fireEvent.blur(input);

			secondSave.resolve(server([], true, 'Second'));
			await waitFor(() => expect(emitted('server-updated')).toHaveLength(1));

			firstSave.resolve(server([], true, 'First'));
			await firstSave.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(input).toHaveValue('Second');
			expect(emitted('server-updated')).toHaveLength(1);
			expect(emitted('server-updated')?.[0]).toEqual([
				expect.objectContaining({ description: 'Second' }),
			]);

			// A late failure from an older save must not revert a newer save or show an error toast.
			const fourthSave = deferred<McpServerDetailResponse>();
			api.updateMcpServer.mockReturnValueOnce(fourthSave.promise);
			await userEvent.clear(input);
			await userEvent.type(input, 'Third');
			await fireEvent.blur(input);
			await userEvent.clear(input);
			await userEvent.type(input, 'Fourth');
			await fireEvent.blur(input);

			fourthSave.resolve(server([], true, 'Fourth'));
			await waitFor(() => expect(emitted('server-updated')).toHaveLength(2));

			thirdSave.reject(new Error('Stale error'));
			await new Promise((resolve) => setTimeout(resolve));

			expect(input).toHaveValue('Fourth');
			expect(toast.showError).not.toHaveBeenCalled();
		});

		it('still saves when reverting back to the initial description while an earlier save runs', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const firstSave = deferred<McpServerDetailResponse>();
			const revertSave = deferred<McpServerDetailResponse>();
			api.updateMcpServer
				.mockReturnValueOnce(firstSave.promise)
				.mockReturnValueOnce(revertSave.promise);
			const { findByTestId } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Temporary');
			await fireEvent.blur(input);

			await userEvent.clear(input);
			await userEvent.type(input, 'Initial');
			await fireEvent.blur(input);

			expect(api.updateMcpServer).toHaveBeenCalledTimes(2);
			expect(api.updateMcpServer).toHaveBeenLastCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				{ description: 'Initial' },
			);

			revertSave.resolve(server([], true, 'Initial'));
			firstSave.resolve(server([], true, 'Temporary'));
			await firstSave.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(input).toHaveValue('Initial');
		});

		it('does not send a duplicate PATCH when blurring after Ctrl+Enter while saving', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const save = deferred<McpServerDetailResponse>();
			api.updateMcpServer.mockReturnValueOnce(save.promise);
			const { findByTestId } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Saved with shortcut');
			await fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
			await fireEvent.blur(input);

			expect(api.updateMcpServer).toHaveBeenCalledTimes(1);

			save.resolve(server([], true, 'Saved with shortcut'));
			await save.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(input).toHaveValue('Saved with shortcut');
		});

		it('syncs external description updates when the field is focused without edits', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const { findByTestId, rerender } = await render({ props: { refreshKey: 0 } });

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.click(input);

			api.getMcpServer.mockResolvedValueOnce(server([], true, 'Updated by Assistant'));
			await rerender({ refreshKey: 1 });

			await waitFor(() => expect(input).toHaveValue('Updated by Assistant'));

			await fireEvent.blur(input);
			expect(api.updateMcpServer).not.toHaveBeenCalled();
			expect(input).toHaveValue('Updated by Assistant');
		});

		it('syncs a deferred external description update on blur if the edit returns to the starting text', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const { findByTestId, rerender } = await render({ props: { refreshKey: 0 } });

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.click(input);
			await userEvent.type(input, '!');

			api.getMcpServer.mockResolvedValueOnce(server([], true, 'Updated by Assistant'));
			await rerender({ refreshKey: 1 });
			await new Promise((resolve) => setTimeout(resolve));
			expect(input).toHaveValue('Initial!');

			await userEvent.type(input, '{Backspace}');
			await fireEvent.blur(input);

			expect(api.updateMcpServer).not.toHaveBeenCalled();
			expect(input).toHaveValue('Updated by Assistant');
		});

		it('reverts a failed second description save to the earlier successful save', async () => {
			api.getMcpServer.mockResolvedValue(server([], true, 'Initial'));
			const firstSave = deferred<McpServerDetailResponse>();
			const secondSave = deferred<McpServerDetailResponse>();
			api.updateMcpServer
				.mockReturnValueOnce(firstSave.promise)
				.mockReturnValueOnce(secondSave.promise);
			const { findByTestId, emitted } = await render();

			const input = await findByTestId('mcp-server-description-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'First saved');
			await fireEvent.blur(input);

			await userEvent.clear(input);
			await userEvent.type(input, 'Second fails');
			await fireEvent.blur(input);

			firstSave.resolve(server([], true, 'First saved'));
			await waitFor(() => expect(emitted('server-updated')).toHaveLength(1));
			expect(emitted('server-updated')?.[0]).toEqual([
				expect.objectContaining({ description: 'First saved' }),
			]);
			// Keeps the in-flight second draft visible until the second save settles.
			expect(input).toHaveValue('Second fails');

			secondSave.reject(new Error('Validation error'));
			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(input).toHaveValue('First saved');
		});
	});

	describe('workflow picker', () => {
		async function openPicker() {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const result = await render();
			await userEvent.click(await result.findByTestId('mcp-server-add-workflow'));
			await result.findByTestId('mcp-workflow-picker');
			return result;
		}

		it('lists the workflows of the project, with the reason of each workflow that cannot be a tool', async () => {
			const { findAllByTestId } = await openPicker();

			const rows = await findAllByTestId('mcp-workflow-picker-row');
			const texts = rows.map((row) => row.textContent ?? '');
			expect(texts.find((text) => text.includes('Draft only'))).toContain('Not published');
			expect(texts.find((text) => text.includes('Manual start'))).toContain(
				"Needs the trigger 'When Executed by Another Workflow'",
			);
			expect(texts.find((text) => text.includes('Closed'))).toContain(
				'Its settings do not allow calls from other workflows',
			);
			expect(texts.find((text) => text.includes('Has a form'))).toContain(
				'Uses a node that cannot run as a tool',
			);
			expect(texts.find((text) => text.includes('Old one'))).toContain('Already added');
		});

		it('shows an info tooltip only on the trigger reason', async () => {
			const { findAllByTestId } = await openPicker();

			const tooltips = await findAllByTestId('mcp-workflow-picker-reason-tooltip');
			expect(tooltips).toHaveLength(1);
			expect(tooltips[0].closest('[data-test-id="mcp-workflow-picker-row"]')).toHaveTextContent(
				'Manual start',
			);
		});

		it('links each workflow to a new tab, and a click on the link does not select it', async () => {
			const { findAllByTestId, getByTestId } = await openPicker();

			const rows = await findAllByTestId('mcp-workflow-picker-row');
			const available = rows.find((row) => row.textContent?.includes('Get campaign numbers'));
			const link = within(available!).getByTestId('mcp-workflow-picker-open');
			expect(link).toHaveAttribute('href', '/workflow/wf-1');
			expect(link).toHaveAttribute('target', '_blank');

			await userEvent.click(link);

			expect(getByTestId('mcp-workflow-picker-confirm')).toBeDisabled();
		});

		it('does not select a workflow that cannot be a tool', async () => {
			const { findAllByTestId, getByTestId } = await openPicker();

			const rows = await findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Draft only'))!);

			expect(getByTestId('mcp-workflow-picker-confirm')).toBeDisabled();
		});

		it('adds the selected workflows as tools and shows the new chips', async () => {
			const { findAllByTestId, getByTestId, findByText } = await openPicker();
			api.addWorkflowTools.mockResolvedValue([
				tool({
					id: '0190a8d6-4a2e-7000-8000-0000000000a2',
					targetId: 'wf-6',
					toolName: 'escalate_to_on_call',
					description: '',
					position: 1,
				}),
			]);

			const rows = await findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Escalate to on-call'))!);
			await userEvent.click(getByTestId('mcp-workflow-picker-confirm'));

			expect(api.addWorkflowTools).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, SERVER_ID, [
				'wf-6',
			]);
			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
			expect(await findAllByTestId('mcp-tool-chip')).toHaveLength(2);
		});
	});

	describe('tool chips and modal', () => {
		it('warns on a chip with an empty description and shows the reason in a tooltip', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ description: '' })]));
			const { findByTestId } = await render();

			const chip = await findByTestId('mcp-tool-chip');
			expect(chip).toHaveAttribute('data-warning', 'true');
			expect(within(chip).getByTestId('mcp-tool-chip-warning')).toBeInTheDocument();

			await userEvent.hover(chip);
			expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(
				'Add a description. AI clients use it to pick the right tool.',
			);
		});

		it('keeps a broken tool chip in the row with warning tooltip and callout in the modal', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ brokenReason: 'not_published' })]));
			api.getToolDetail.mockResolvedValue(toolDetail({ brokenReason: 'not_published' }));
			const { findByTestId } = await render();

			const chip = await findByTestId('mcp-tool-chip');
			expect(chip).toHaveAttribute('data-warning', 'true');
			expect(within(chip).getByTestId('mcp-tool-chip-warning')).toBeInTheDocument();

			await userEvent.hover(chip);
			expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(
				'The workflow is not published. Calls return an error until you publish it.',
			);

			await userEvent.click(chip);
			expect(await screen.findByTestId('mcp-tool-dialog-broken-callout')).toHaveTextContent(
				'The workflow is not published',
			);
		});

		it('opens the tool modal from an old ?expand=<tool> deep link and closes on Cancel', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			await render({ path: '/?expand=get_campaign_numbers' });

			expect(await screen.findByTestId('mcp-tool-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('inline-edit-preview')).toHaveTextContent('get_campaign_numbers');

			await userEvent.click(screen.getByTestId('mcp-tool-dialog-cancel'));
			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
		});

		it('does not open a hidden capability tool from ?expand=<tool>', async () => {
			api.getMcpServer.mockResolvedValue(
				server([
					tool({ kind: 'node', toolName: 'hidden_node_tool' }),
					tool({
						id: '0190a8d6-4a2e-7000-8000-0000000000a2',
						kind: 'agent',
						toolName: 'hidden_agent_tool',
					}),
					tool({
						id: '0190a8d6-4a2e-7000-8000-0000000000a3',
						kind: 'skill',
						toolName: 'hidden_skill_tool',
					}),
				]),
			);
			const { findByTestId } = await render({ path: '/?expand=hidden_node_tool' });
			await findByTestId('mcp-server-capabilities-panel');

			expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument();
		});

		it('applies name and description edits only when clicking Save', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.updateTool.mockImplementation(async (_c, _p, _s, _t, changes) =>
				tool({ ...changes, draftSource: 'edited' }),
			);
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await editModalTitle('campaign_numbers');
			const description = await screen.findByTestId('mcp-tool-dialog-description-input');
			await userEvent.clear(description);
			await userEvent.type(description, 'Use it for campaign questions.');
			await fireEvent.blur(description);

			expect(api.updateTool).not.toHaveBeenCalled();

			await userEvent.click(screen.getByTestId('mcp-tool-dialog-save'));

			await waitFor(() =>
				expect(api.updateTool).toHaveBeenCalledExactlyOnceWith(
					expect.anything(),
					PROJECT_ID,
					SERVER_ID,
					tool().id,
					{ toolName: 'campaign_numbers', description: 'Use it for campaign questions.' },
				),
			);
			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
		});

		it('closes on Cancel and Escape with no change and discards unsaved edits', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId } = await render();

			// Edit and cancel via Cancel button
			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await editModalTitle('temporary_name');
			const description = await screen.findByTestId('mcp-tool-dialog-description-input');
			await userEvent.clear(description);
			await userEvent.type(description, 'Discarded on cancel.');
			await userEvent.click(screen.getByTestId('mcp-tool-dialog-cancel'));

			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
			expect(api.updateTool).not.toHaveBeenCalled();

			// Re-open, confirm original values, edit and close via Escape
			await userEvent.click(await findByTestId('mcp-tool-chip'));
			expect(await screen.findByTestId('inline-edit-preview')).toHaveTextContent(
				'get_campaign_numbers',
			);
			const reopenedDescription = await screen.findByTestId('mcp-tool-dialog-description-input');
			expect(reopenedDescription).toHaveValue('Numbers of a campaign.');
			await userEvent.clear(reopenedDescription);
			await userEvent.type(reopenedDescription, 'Discarded on escape.');
			await userEvent.keyboard('{Escape}');

			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
			expect(api.updateTool).not.toHaveBeenCalled();
		});

		it('closes without sending PATCH when Save is clicked with no changes', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-save'));

			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
			expect(api.updateTool).not.toHaveBeenCalled();
		});

		it('keeps the modal open with the edited values when Save fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.updateTool.mockRejectedValue(new Error('The name is taken.'));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await editModalTitle('get_numbers');
			await userEvent.click(screen.getByTestId('mcp-tool-dialog-save'));

			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(screen.getByTestId('mcp-tool-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('inline-edit-preview')).toHaveTextContent('get_numbers');
		});

		it('limits the tool description to the length that the server accepts', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));

			expect(await screen.findByTestId('mcp-tool-dialog-description-input')).toHaveAttribute(
				'maxlength',
				'2000',
			);
		});

		it('does not save a tool name that breaks the rules', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await editModalTitle('Get-Numbers');

			expect(screen.getByTestId('mcp-tool-dialog-name-error')).toBeInTheDocument();
			await userEvent.click(screen.getByTestId('mcp-tool-dialog-save'));
			expect(api.updateTool).not.toHaveBeenCalled();
			expect(screen.getByTestId('mcp-tool-dialog')).toBeInTheDocument();
		});

		it('shows the source line with workflow name and "Open workflow" link in a new tab', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));

			const source = await screen.findByTestId('mcp-tool-dialog-source');
			await waitFor(() => expect(source).toHaveTextContent('From workflow Get campaign numbers'));
			const link = within(source).getByTestId('mcp-tool-dialog-source-link');
			expect(link).toHaveTextContent('Open workflow');
			expect(link.closest('a') ?? link).toHaveAttribute('href', '/workflow/wf-5');
			expect(link.closest('a') ?? link).toHaveAttribute('target', '_blank');
		});

		it('lists trigger inputs and last-execution output fields in open sections', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));

			expect(api.getToolDetail).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				tool().id,
			);

			const inputRows = await screen.findAllByTestId('mcp-tool-dialog-input-row');
			expect(inputRows).toHaveLength(2);
			expect(within(inputRows[0]).getByTestId('mcp-tool-dialog-input-name')).toHaveTextContent(
				'campaign_id',
			);
			expect(within(inputRows[0]).getByTestId('mcp-tool-dialog-input-type')).toHaveTextContent(
				'string',
			);
			expect(within(inputRows[1]).getByTestId('mcp-tool-dialog-input-name')).toHaveTextContent(
				'days',
			);
			expect(within(inputRows[1]).getByTestId('mcp-tool-dialog-input-type')).toHaveTextContent(
				'number',
			);

			const outputRows = await screen.findAllByTestId('mcp-tool-dialog-output-row');
			expect(outputRows).toHaveLength(2);
			expect(within(outputRows[0]).getByTestId('mcp-tool-dialog-output-name')).toHaveTextContent(
				'clicks',
			);
			expect(within(outputRows[0]).getByTestId('mcp-tool-dialog-output-type')).toHaveTextContent(
				'number',
			);
			expect(within(outputRows[1]).getByTestId('mcp-tool-dialog-output-name')).toHaveTextContent(
				'active',
			);
			expect(within(outputRows[1]).getByTestId('mcp-tool-dialog-output-type')).toHaveTextContent(
				'boolean',
			);
		});

		it('shows the empty states when the workflow has no inputs or no successful execution', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.getToolDetail.mockResolvedValue(toolDetail({ inputs: [], outputs: null }));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));

			expect(await screen.findByTestId('mcp-tool-dialog-inputs-empty')).toHaveTextContent(
				'This workflow does not declare any inputs.',
			);
			expect(await screen.findByTestId('mcp-tool-dialog-outputs-no-execution')).toHaveTextContent(
				'Run the workflow once to see its output fields.',
			);
		});

		it('shows a retry button when loading tool inputs and output fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.getToolDetail
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(toolDetail());
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			const retry = await screen.findByTestId('mcp-tool-dialog-detail-retry');
			await userEvent.click(retry);

			expect(await screen.findAllByTestId('mcp-tool-dialog-input-row')).toHaveLength(2);
			expect(await screen.findAllByTestId('mcp-tool-dialog-output-row')).toHaveLength(2);
		});

		it('disables Remove while deleting so double clicks do not send a second delete', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const remove = deferred<undefined>();
			api.removeTool.mockReturnValueOnce(remove.promise);
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			const removeButton = await screen.findByTestId('mcp-tool-dialog-remove');
			await userEvent.click(removeButton);
			expect(removeButton).toBeDisabled();
			await userEvent.click(removeButton);

			expect(api.removeTool).toHaveBeenCalledTimes(1);

			remove.resolve(undefined);
			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
		});

		it('tells the page the number of shareable tools after the load and after a remove', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.removeTool.mockResolvedValue(undefined);
			const { findByTestId, emitted } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-remove'));

			await waitFor(() => expect(emitted('tools-changed')).toEqual([[1], [0]]));
		});

		it('does not count broken tools as shareable', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ brokenReason: 'moved' })]));
			const { findByTestId, emitted } = await render();

			await findByTestId('mcp-tool-chip');

			await waitFor(() => expect(emitted('tools-changed')).toEqual([[0]]));
		});

		it('removes a tool from the modal and closes it', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.removeTool.mockResolvedValue(undefined);
			const { findByTestId, queryByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-remove'));

			await waitFor(() => expect(queryByTestId('mcp-tool-chip')).not.toBeInTheDocument());
			expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument();
			expect(api.removeTool).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				tool().id,
			);
			// The title capitalizes its first letter, so the exact name is in the message.
			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
					title: 'Tool removed',
					message: expect.objectContaining({ children: 'get_campaign_numbers' }),
				}),
			);
		});
	});

	describe('a failed request', () => {
		it('keeps the chip when the remove fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.removeTool.mockRejectedValue(new Error('Server error'));
			const { findByTestId, getByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-remove'));

			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(getByTestId('mcp-tool-chip')).toBeInTheDocument();
			expect(toast.showMessage).not.toHaveBeenCalled();
		});

		it('keeps the tool count when the add fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.addWorkflowTools.mockRejectedValue(new Error('Server error'));
			const { findByTestId, findAllByTestId, getByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-server-add-workflow'));
			const rows = await findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Escalate to on-call'))!);
			await userEvent.click(getByTestId('mcp-workflow-picker-confirm'));

			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(await findAllByTestId('mcp-tool-chip')).toHaveLength(1);
		});
	});

	describe('AI drafts', () => {
		const second = tool({
			id: '0190a8d6-4a2e-7000-8000-0000000000a2',
			targetId: 'wf-6',
			toolName: 'escalate_to_on_call',
			description: '',
			position: 1,
		});

		async function addTwoTools(toolDraftsAvailable = true) {
			api.getMcpServer.mockResolvedValue(server([], toolDraftsAvailable));
			const added = [tool(), second];
			api.addWorkflowTools.mockResolvedValue(added);
			const result = await render();
			await userEvent.click(await result.findByTestId('mcp-server-add-workflow'));
			const rows = await result.findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Get campaign'))!);
			await userEvent.click(rows.find((row) => row.textContent?.includes('Escalate'))!);
			await userEvent.click(result.getByTestId('mcp-workflow-picker-confirm'));
			return result;
		}

		it('asks for a draft of each new tool in parallel and shows a spinner on each new chip', async () => {
			const first = deferred<unknown>();
			const other = deferred<unknown>();
			api.draftTool.mockReturnValueOnce(first.promise).mockReturnValueOnce(other.promise);
			const { findAllByTestId, findByText, queryAllByTestId } = await addTwoTools();

			expect(await findAllByTestId('mcp-tool-chip-drafting')).toHaveLength(2);
			expect(queryAllByTestId('mcp-tool-chip-warning')).toHaveLength(0);
			expect(api.draftTool).toHaveBeenCalledTimes(2);
			expect(api.draftTool).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				tool().id,
			);
			expect(api.draftTool).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				second.id,
			);

			first.resolve({
				status: 'drafted',
				tool: tool({ toolName: 'get_campaign_kpis', draftSource: 'ai' }),
			});

			expect(await findByText('get_campaign_kpis')).toBeInTheDocument();
			expect(queryAllByTestId('mcp-tool-chip-drafting')).toHaveLength(1);

			other.resolve({ status: 'not_available', tool: second });
			await waitFor(() => expect(queryAllByTestId('mcp-tool-chip-drafting')).toHaveLength(0));
			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
			// Now that drafting finished, the empty-description warning shows on the second chip.
			expect(queryAllByTestId('mcp-tool-chip-warning')).toHaveLength(1);
		});

		it('keeps the text and reports the failed drafts of one add in one toast', async () => {
			api.draftTool.mockRejectedValue(new Error('The draft breaks the rules.'));
			const { queryAllByTestId, findByText } = await addTwoTools();

			await waitFor(() => expect(queryAllByTestId('mcp-tool-chip-drafting')).toHaveLength(0));
			expect(toast.showError).toHaveBeenCalledExactlyOnceWith(
				expect.any(Error),
				'Could not write 2 drafts',
			);
			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
		});

		it('runs at most four drafts at a time and shows the spinner on every new chip', async () => {
			const added = Array.from({ length: 6 }, (_, index) =>
				tool({
					id: `0190a8d6-4a2e-7000-8000-0000000000b${index}`,
					targetId: `wf-${index + 1}`,
					toolName: `tool_${index}`,
					position: index,
				}),
			);
			api.getMcpServer.mockResolvedValue(server([]));
			api.addWorkflowTools.mockResolvedValue(added);
			const calls = added.map(() => deferred<unknown>());
			let started = 0;
			api.draftTool.mockImplementation(async () => await calls[started++].promise);
			const result = await render();
			await userEvent.click(await result.findByTestId('mcp-server-add-workflow'));
			const rows = await result.findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Get campaign'))!);
			await userEvent.click(result.getByTestId('mcp-workflow-picker-confirm'));

			expect(await result.findAllByTestId('mcp-tool-chip-drafting')).toHaveLength(6);
			expect(api.draftTool).toHaveBeenCalledTimes(4);

			calls[0].resolve({ status: 'drafted', tool: added[0] });
			await waitFor(() => expect(api.draftTool).toHaveBeenCalledTimes(5));
			calls[1].reject(new Error('Invalid key'));
			await waitFor(() => expect(api.draftTool).toHaveBeenCalledTimes(6));
			for (const [index, call] of calls.slice(2).entries()) {
				call.resolve({ status: 'drafted', tool: added[index + 2] });
			}

			await waitFor(() =>
				expect(result.queryAllByTestId('mcp-tool-chip-drafting')).toHaveLength(0),
			);
			expect(toast.showError).toHaveBeenCalledExactlyOnceWith(
				expect.any(Error),
				'Could not write the draft',
			);
		});

		it('asks for no draft without the Assistant', async () => {
			const { findByText, queryAllByTestId } = await addTwoTools(false);

			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
			expect(queryAllByTestId('mcp-tool-chip-drafting')).toHaveLength(0);
			expect(api.draftTool).not.toHaveBeenCalled();
		});

		it.each([
			['toolName', 'name'],
			['description', 'description'],
		] as const)(
			'"Generate" below the %s writes only that field in the modal and applies it on Save',
			async (field, testId) => {
				api.getMcpServer.mockResolvedValue(server([tool()]));
				api.updateTool.mockImplementation(async (_c, _p, _s, _t, changes) =>
					tool({ ...changes, draftSource: 'edited' }),
				);
				const call = deferred<unknown>();
				api.draftTool.mockReturnValue(call.promise);
				const { findByTestId } = await render();

				await userEvent.click(await findByTestId('mcp-tool-chip'));
				await userEvent.click(await screen.findByTestId(`mcp-tool-dialog-generate-${testId}`));

				expect(api.draftTool).toHaveBeenCalledWith(
					expect.anything(),
					PROJECT_ID,
					SERVER_ID,
					tool().id,
					field,
					{ persist: false },
				);
				expect(screen.getByTestId(`mcp-tool-dialog-generating-${testId}`)).toBeInTheDocument();
				expect(screen.getByTestId(`mcp-tool-dialog-generate-${testId}`)).toBeDisabled();

				const text = field === 'toolName' ? 'get_campaign_kpis' : 'Returns the KPIs.';
				call.resolve({ status: 'drafted', tool: tool({ [field]: text, draftSource: 'ai' }) });

				await waitFor(() =>
					expect(
						screen.queryByTestId(`mcp-tool-dialog-generating-${testId}`),
					).not.toBeInTheDocument(),
				);
				if (field === 'toolName') {
					expect(screen.getByTestId('inline-edit-preview')).toHaveTextContent(text);
					// Chip on the page stays unchanged until Save.
					expect(await findByTestId('mcp-tool-chip')).toHaveTextContent('get_campaign_numbers');
				} else {
					expect(screen.getByTestId('mcp-tool-dialog-description-input')).toHaveValue(text);
				}

				await userEvent.click(screen.getByTestId('mcp-tool-dialog-save'));
				await waitFor(() =>
					expect(api.updateTool).toHaveBeenCalledExactlyOnceWith(
						expect.anything(),
						PROJECT_ID,
						SERVER_ID,
						tool().id,
						{ [field]: text },
					),
				);
			},
		);

		it('discards a generated field when Cancel is clicked without saving it', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.draftTool.mockResolvedValue({
				status: 'drafted',
				tool: tool({ toolName: 'get_campaign_kpis', draftSource: 'ai' }),
			});
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-generate-name'));
			await waitFor(() =>
				expect(screen.getByTestId('inline-edit-preview')).toHaveTextContent('get_campaign_kpis'),
			);

			await userEvent.click(screen.getByTestId('mcp-tool-dialog-cancel'));
			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
			expect(api.updateTool).not.toHaveBeenCalled();
			expect(await findByTestId('mcp-tool-chip')).toHaveTextContent('get_campaign_numbers');
		});

		it('clears the generating state when reopening a tool after canceling an in-flight Generate', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const firstCall = deferred<unknown>();
			const secondCall = deferred<unknown>();
			api.draftTool.mockReturnValueOnce(firstCall.promise).mockReturnValueOnce(secondCall.promise);
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-generate-name'));
			expect(screen.getByTestId('mcp-tool-dialog-generating-name')).toBeInTheDocument();
			expect(screen.getByTestId('mcp-tool-dialog-save')).toBeDisabled();

			// Cancel while the first Generate is still in flight, then reopen the same tool.
			await userEvent.click(screen.getByTestId('mcp-tool-dialog-cancel'));
			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await screen.findByTestId('mcp-tool-dialog');
			expect(screen.queryByTestId('mcp-tool-dialog-generating-name')).not.toBeInTheDocument();
			expect(screen.getByTestId('mcp-tool-dialog-save')).toBeEnabled();
			expect(screen.getByTestId('mcp-tool-dialog-generate-name')).toBeEnabled();

			// Start a fresh Generate in the reopened session; the stale first response must not
			// overwrite the field or clear the new session's spinner.
			await userEvent.click(screen.getByTestId('mcp-tool-dialog-generate-name'));
			expect(screen.getByTestId('mcp-tool-dialog-generating-name')).toBeInTheDocument();

			firstCall.resolve({
				status: 'drafted',
				tool: tool({ toolName: 'stale_name', draftSource: 'ai' }),
			});
			await Promise.resolve();
			expect(screen.getByTestId('mcp-tool-dialog-generating-name')).toBeInTheDocument();

			secondCall.resolve({
				status: 'drafted',
				tool: tool({ toolName: 'fresh_name', draftSource: 'ai' }),
			});
			await waitFor(() =>
				expect(screen.queryByTestId('mcp-tool-dialog-generating-name')).not.toBeInTheDocument(),
			);
			expect(screen.getByTestId('inline-edit-preview')).toHaveTextContent('fresh_name');
		});

		it('disables the description input and Generate button while Save is in flight', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const save = deferred<McpServerToolResponse>();
			api.updateTool.mockReturnValueOnce(save.promise);
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			const description = await screen.findByTestId('mcp-tool-dialog-description-input');
			await userEvent.clear(description);
			await userEvent.type(description, 'Updated description.');
			await userEvent.click(screen.getByTestId('mcp-tool-dialog-save'));

			expect(description).toBeDisabled();
			expect(screen.getByTestId('mcp-tool-dialog-generate-description')).toBeDisabled();
			expect(screen.getByTestId('mcp-tool-dialog-generate-name')).toBeDisabled();

			save.resolve(tool({ description: 'Updated description.', draftSource: 'edited' }));
			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());
		});

		it('keeps the name that the builder edits while "Generate" writes the description', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const call = deferred<unknown>();
			api.draftTool.mockReturnValue(call.promise);
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await userEvent.click(await screen.findByTestId('mcp-tool-dialog-generate-description'));
			await editModalTitle('get_kpis');
			call.resolve({
				status: 'drafted',
				tool: tool({ description: 'Returns the KPIs.', draftSource: 'ai' }),
			});

			await waitFor(() =>
				expect(screen.getByTestId('mcp-tool-dialog-description-input')).toHaveValue(
					'Returns the KPIs.',
				),
			);
			expect(screen.getByTestId('inline-edit-preview')).toHaveTextContent('get_kpis');
		});

		it('hides the "Generate" buttons without the Assistant', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()], false));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));

			expect(await screen.findByTestId('inline-edit-preview')).toHaveTextContent(
				'get_campaign_numbers',
			);
			expect(screen.queryByTestId('mcp-tool-dialog-generate-name')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-generate-description')).not.toBeInTheDocument();
		});

		it('hides the "Generate" buttons on a broken tool', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ brokenReason: 'not_published' })]));
			api.getToolDetail.mockResolvedValue(toolDetail({ brokenReason: 'not_published' }));
			const { findByTestId } = await render();

			await userEvent.click(await findByTestId('mcp-tool-chip'));

			expect(await screen.findByTestId('mcp-tool-dialog-broken-callout')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-generate-name')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-generate-description')).not.toBeInTheDocument();
		});
	});

	describe('a project viewer', () => {
		it('sees the read-only description, inputs, and outputs, without add, edit, or remove controls', async () => {
			permissions.canUpdate = false;
			api.getMcpServer.mockResolvedValue(server([tool()], true, 'Pipeline numbers'));
			const { findByTestId, getByTestId, queryByTestId } = await render();

			expect(await findByTestId('mcp-server-description-readonly')).toHaveTextContent(
				'Pipeline numbers',
			);
			expect(queryByTestId('mcp-server-description-input')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-server-add-workflow')).not.toBeInTheDocument();

			await userEvent.click(getByTestId('mcp-tool-chip'));

			expect(await screen.findByTestId('mcp-tool-dialog-title-readonly')).toHaveTextContent(
				'get_campaign_numbers',
			);
			expect(await screen.findAllByTestId('mcp-tool-dialog-input-row')).toHaveLength(2);
			expect(await screen.findAllByTestId('mcp-tool-dialog-output-row')).toHaveLength(2);
			expect(screen.getByTestId('mcp-tool-dialog-close')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-remove')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-save')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-cancel')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-title-edit')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-description-input')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-generate-name')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-generate-description')).not.toBeInTheDocument();
		});
	});

	it('shows the "+ Add workflow" action in Capabilities for an empty server', async () => {
		api.getMcpServer.mockResolvedValue(server([]));
		const { findByTestId } = await render();

		const capabilities = await findByTestId('mcp-server-capabilities-panel');
		const addButton = within(capabilities).getByTestId('mcp-server-add-workflow');
		expect(addButton).toHaveTextContent('Add workflow');
	});

	describe('the Assistant', () => {
		it('offers "Build with Assistant" as the first panel of an empty server', async () => {
			api.getMcpServer.mockResolvedValue(server([]));
			const { findByTestId, getByTestId, emitted } = await render({
				props: { assistantAvailable: true },
			});

			const card = await findByTestId('mcp-server-build-with-assistant');
			expect(card).toHaveTextContent('Build with the Assistant');
			expect(getByTestId('mcp-server-contents').firstElementChild).toBe(card);
			expect(
				within(getByTestId('mcp-server-capabilities-panel')).queryByTestId(
					'mcp-server-build-with-assistant',
				),
			).not.toBeInTheDocument();
			expect(
				within(getByTestId('mcp-server-capabilities-panel')).getByTestId('mcp-server-add-workflow'),
			).toHaveTextContent('Add workflow');

			await userEvent.click(getByTestId('mcp-server-build-with-assistant-button'));

			expect(emitted('build-with-assistant')).toHaveLength(1);
		});

		it('disables "Build with Assistant" while the panel is open', async () => {
			api.getMcpServer.mockResolvedValue(server([]));
			const { findByTestId } = await render({
				props: { assistantAvailable: true, assistantOpen: true },
			});

			expect(await findByTestId('mcp-server-build-with-assistant-button')).toBeDisabled();
		});

		it('does not offer the Assistant without it, or to a project viewer', async () => {
			api.getMcpServer.mockResolvedValue(server([]));
			const first = await render({ props: { assistantAvailable: false } });
			await first.findByTestId('mcp-server-capabilities-panel');
			expect(first.queryByTestId('mcp-server-build-with-assistant')).not.toBeInTheDocument();
			first.unmount();

			permissions.canUpdate = false;
			const second = await render({ props: { assistantAvailable: true } });
			await second.findByTestId('mcp-server-capabilities-panel');
			expect(second.queryByTestId('mcp-server-build-with-assistant')).not.toBeInTheDocument();
			expect(second.getByTestId('mcp-server-empty-workflows')).toBeInTheDocument();
		});

		it('loads the tools again on a change and highlights the new chips', async () => {
			const first = tool();
			const added = tool({
				id: '0190a8d6-4a2e-7000-8000-0000000000a2',
				targetId: 'wf-6',
				toolName: 'escalate_to_on_call',
			});
			api.getMcpServer.mockResolvedValue(server([first]));
			const { findAllByTestId, rerender } = await render({ props: { refreshKey: 0 } });
			await findAllByTestId('mcp-tool-chip');
			api.getMcpServer.mockResolvedValue(server([first, added]));

			await rerender({ refreshKey: 1 });

			await waitFor(async () => expect(await findAllByTestId('mcp-tool-chip')).toHaveLength(2));
			const chips = await findAllByTestId('mcp-tool-chip');
			const byName = (name: string) => chips.find((chip) => chip.dataset.toolName === name);
			expect(byName('escalate_to_on_call')).toHaveAttribute('data-highlighted', 'true');
			expect(byName('get_campaign_numbers')).toHaveAttribute('data-highlighted', 'false');
		});

		it('keeps the newest tools when an older reload answers last', async () => {
			const first = tool();
			const added = tool({
				id: '0190a8d6-4a2e-7000-8000-0000000000a2',
				targetId: 'wf-6',
				toolName: 'escalate_to_on_call',
			});
			api.getMcpServer.mockResolvedValue(server([first]));
			const { findAllByTestId, rerender } = await render({ props: { refreshKey: 0 } });
			await findAllByTestId('mcp-tool-chip');
			const slow = deferred<McpServerDetailResponse>();
			api.getMcpServer.mockReturnValueOnce(slow.promise);
			await rerender({ refreshKey: 1 });
			api.getMcpServer.mockResolvedValueOnce(server([first, added]));
			await rerender({ refreshKey: 2 });
			await waitFor(async () => expect(await findAllByTestId('mcp-tool-chip')).toHaveLength(2));

			slow.resolve(server([first]));
			await slow.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(await findAllByTestId('mcp-tool-chip')).toHaveLength(2);
		});

		it('highlights no chip when a reload replaces the first load', async () => {
			const firstLoad = deferred<McpServerDetailResponse>();
			api.getMcpServer.mockReturnValueOnce(firstLoad.promise);
			const { findAllByTestId, rerender } = await render({ props: { refreshKey: 0 } });
			api.getMcpServer.mockResolvedValueOnce(server([tool()]));

			await rerender({ refreshKey: 1 });
			firstLoad.resolve(server([]));

			const chips = await findAllByTestId('mcp-tool-chip');
			expect(chips).toHaveLength(1);
			expect(chips[0]).toHaveAttribute('data-highlighted', 'false');
		});

		it('invalidates a pending tool detail request on refresh and refetches fresh detail', async () => {
			const staleDetail = deferred<McpServerToolDetailResponse>();
			const freshDetail = deferred<McpServerToolDetailResponse>();
			api.getMcpServer.mockResolvedValueOnce(server([tool({ brokenReason: 'not_published' })]));
			api.getToolDetail
				.mockReturnValueOnce(staleDetail.promise)
				.mockReturnValueOnce(freshDetail.promise);

			const { findByTestId, rerender } = await render({ props: { refreshKey: 0 } });
			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await screen.findByTestId('mcp-tool-dialog');

			api.getMcpServer.mockResolvedValueOnce(server([tool({ brokenReason: null })]));
			await rerender({ refreshKey: 1 });

			await waitFor(() => expect(api.getToolDetail).toHaveBeenCalledTimes(2));

			// A late pre-refresh response must not populate stale fields or restore brokenReason.
			staleDetail.resolve(
				toolDetail({
					brokenReason: 'not_published',
					inputs: [{ name: 'stale_input', type: 'string' }],
					outputs: [{ name: 'stale_output', type: 'string' }],
				}),
			);
			await staleDetail.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(screen.queryByTestId('mcp-tool-dialog-broken-callout')).not.toBeInTheDocument();
			expect(screen.queryByText('stale_input')).not.toBeInTheDocument();

			freshDetail.resolve(
				toolDetail({
					brokenReason: null,
					inputs: [{ name: 'fresh_input', type: 'number' }],
					outputs: [{ name: 'fresh_output', type: 'boolean' }],
				}),
			);

			expect(await screen.findByText('fresh_input')).toBeInTheDocument();
			expect(await screen.findByText('fresh_output')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-tool-dialog-broken-callout')).not.toBeInTheDocument();
		});

		it('closes the open tool modal and ignores a late detail response when refresh removes the tool', async () => {
			const staleDetail = deferred<McpServerToolDetailResponse>();
			api.getMcpServer.mockResolvedValueOnce(server([tool()]));
			api.getToolDetail.mockReturnValueOnce(staleDetail.promise);

			const { findByTestId, rerender } = await render({ props: { refreshKey: 0 } });
			await userEvent.click(await findByTestId('mcp-tool-chip'));
			await screen.findByTestId('mcp-tool-dialog');

			api.getMcpServer.mockResolvedValueOnce(server([]));
			await rerender({ refreshKey: 1 });

			await waitFor(() => expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument());

			staleDetail.resolve(toolDetail({ inputs: [{ name: 'stale_input', type: 'string' }] }));
			await staleDetail.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(screen.queryByTestId('mcp-tool-dialog')).not.toBeInTheDocument();
			expect(api.getToolDetail).toHaveBeenCalledTimes(1);
		});
	});
});
