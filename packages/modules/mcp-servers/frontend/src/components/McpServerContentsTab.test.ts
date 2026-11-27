import type {
	McpServerDetailResponse,
	McpServerToolCandidate,
	McpServerToolResponse,
} from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter } from 'vue-router';

import McpServerContentsTab from './McpServerContentsTab.vue';

const api = vi.hoisted(() => ({
	getMcpServer: vi.fn(),
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

function server(
	tools: McpServerToolResponse[],
	toolDraftsAvailable = true,
): McpServerDetailResponse {
	return {
		id: SERVER_ID,
		projectId: PROJECT_ID,
		project: { name: 'Marketing', type: 'team' },
		name: 'Marketing tools',
		slug: 'marketing-tools',
		description: '',
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

function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: { render: () => null } },
			{ path: '/workflow/:workflowId', name: VIEWS.WORKFLOW, component: { render: () => null } },
		],
	});
}

const renderComponent = createComponentRenderer(McpServerContentsTab, {
	props: { projectId: PROJECT_ID, serverId: SERVER_ID },
});

function render() {
	return renderComponent({ global: { plugins: [createTestRouter()] } });
}

beforeEach(() => {
	vi.clearAllMocks();
	permissions.canUpdate = true;
	api.listToolCandidates.mockResolvedValue(candidates);
});

describe('McpServerContentsTab', () => {
	describe('workflow picker', () => {
		async function openPicker() {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const result = render();
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

		it('adds the selected workflows as tools and shows the new rows', async () => {
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
			expect(getByTestId('mcp-server-tools-count')).toHaveTextContent('2');
		});
	});

	describe('tool rows', () => {
		it('warns about a tool with an empty description', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ description: '' })]));
			const { findByTestId } = render();

			expect(await findByTestId('mcp-tool-row-missing-description')).toHaveTextContent(
				'Add a description',
			);
		});

		it('keeps a broken tool in the list and shows the reason', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ brokenReason: 'not_published' })]));
			const { findByTestId, getByTestId } = render();

			expect(await findByTestId('mcp-tool-row-broken')).toHaveTextContent('Not published');
			await userEvent.click(getByTestId('mcp-tool-row-toggle'));
			expect(getByTestId('mcp-tool-row-broken-callout')).toHaveTextContent(
				'The workflow is not published',
			);
		});

		it('saves an edit of the description when the field loses focus', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.updateTool.mockImplementation(async (_c, _p, _s, _t, changes) =>
				tool({ ...changes, draftSource: 'edited' }),
			);
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			const description = getByTestId('mcp-tool-row-description-input');
			await userEvent.clear(description);
			await userEvent.type(description, 'Use it for campaign questions.');
			await fireEvent.blur(description);

			await waitFor(() =>
				expect(api.updateTool).toHaveBeenCalledWith(
					expect.anything(),
					PROJECT_ID,
					SERVER_ID,
					tool().id,
					{ description: 'Use it for campaign questions.' },
				),
			);
		});

		it('resets the field to the saved text when the save fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.updateTool.mockRejectedValue(new Error('The name is taken.'));
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			const name = getByTestId('mcp-tool-row-name-input');
			await userEvent.clear(name);
			await userEvent.type(name, 'get_numbers');
			await fireEvent.blur(name);

			await waitFor(() => expect(name).toHaveValue('get_campaign_numbers'));
			expect(toast.showError).toHaveBeenCalledTimes(1);
		});

		it('limits the description to the length that the server accepts', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));

			expect(getByTestId('mcp-tool-row-description-input')).toHaveAttribute('maxlength', '2000');
		});

		it('does not save a tool name that breaks the rules', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			const name = getByTestId('mcp-tool-row-name-input');
			await userEvent.clear(name);
			await userEvent.type(name, 'Get-Numbers');
			await fireEvent.blur(name);

			expect(getByTestId('mcp-tool-row-name-error')).toBeInTheDocument();
			expect(api.updateTool).not.toHaveBeenCalled();
		});

		it('links "From workflow" to the workflow in a new tab', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));

			const link = getByTestId('mcp-tool-row-source-link');
			expect(link).toHaveTextContent('From workflow');
			expect(link.closest('a') ?? link).toHaveAttribute('href', '/workflow/wf-5');
		});

		it('removes a tool from its menu', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.removeTool.mockResolvedValue(undefined);
			const { findByTestId, getByTestId, findByText, queryByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			await userEvent.click(within(getByTestId('mcp-tool-row-menu')).getByRole('button'));
			await userEvent.click(await findByText('Remove'));

			await waitFor(() => expect(queryByTestId('mcp-tool-row')).not.toBeInTheDocument());
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

	describe('two fields that save at the same time', () => {
		function deferred<T>() {
			let resolve!: (value: T) => void;
			let reject!: (error: unknown) => void;
			const promise = new Promise<T>((res, rej) => {
				resolve = res;
				reject = rej;
			});
			return { promise, resolve, reject };
		}

		it('keeps the text of the other field when a save of one field ends', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const nameSave = deferred<McpServerToolResponse>();
			api.updateTool.mockReturnValueOnce(nameSave.promise);
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			const name = getByTestId('mcp-tool-row-name-input');
			await userEvent.clear(name);
			await userEvent.type(name, 'campaign_numbers');
			await fireEvent.blur(name);
			const description = getByTestId('mcp-tool-row-description-input');
			await userEvent.clear(description);
			await userEvent.type(description, 'Still typing');

			nameSave.resolve(tool({ toolName: 'campaign_numbers', draftSource: 'edited' }));
			await nameSave.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(getByTestId('mcp-tool-row-name-input')).toHaveValue('campaign_numbers');
			expect(getByTestId('mcp-tool-row-description-input')).toHaveValue('Still typing');
		});

		it('keeps a saved name when a later save of the description fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const nameSave = deferred<McpServerToolResponse>();
			const descriptionSave = deferred<McpServerToolResponse>();
			api.updateTool
				.mockReturnValueOnce(nameSave.promise)
				.mockReturnValueOnce(descriptionSave.promise);
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			const name = getByTestId('mcp-tool-row-name-input');
			await userEvent.clear(name);
			await userEvent.type(name, 'campaign_numbers');
			await fireEvent.blur(name);
			const description = getByTestId('mcp-tool-row-description-input');
			await userEvent.clear(description);
			await userEvent.type(description, 'New text.');
			await fireEvent.blur(description);

			nameSave.resolve(tool({ toolName: 'campaign_numbers', draftSource: 'edited' }));
			await waitFor(() =>
				expect(getByTestId('mcp-tool-row-name-input')).toHaveValue('campaign_numbers'),
			);
			descriptionSave.reject(new Error('Server error'));

			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(getByTestId('mcp-tool-row-name-input')).toHaveValue('campaign_numbers');
			expect(getByTestId('mcp-tool-row-description-input')).toHaveValue('Numbers of a campaign.');
		});
	});

	describe('a failed request', () => {
		it.each([
			['tool name', 'mcp-tool-row-name-input', 'campaign_numbers', 'get_campaign_numbers'],
			['description', 'mcp-tool-row-description-input', 'New text.', 'Numbers of a campaign.'],
		])('shows the saved %s again when the save fails', async (_field, testId, typed, saved) => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.updateTool.mockRejectedValue(new Error('Conflict'));
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			const input = getByTestId(testId);
			await userEvent.clear(input);
			await userEvent.type(input, typed);
			await fireEvent.blur(input);

			await waitFor(() => expect(getByTestId(testId)).toHaveValue(saved));
			expect(toast.showError).toHaveBeenCalledTimes(1);
		});

		it('keeps the row when the remove fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.removeTool.mockRejectedValue(new Error('Server error'));
			const { findByTestId, getByTestId, findByText } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			await userEvent.click(within(getByTestId('mcp-tool-row-menu')).getByRole('button'));
			await userEvent.click(await findByText('Remove'));

			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(getByTestId('mcp-tool-row')).toBeInTheDocument();
			expect(toast.showMessage).not.toHaveBeenCalled();
		});

		it('keeps the tool count when the add fails', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			api.addWorkflowTools.mockRejectedValue(new Error('Server error'));
			const { findByTestId, findAllByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-server-add-workflow'));
			const rows = await findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Escalate to on-call'))!);
			await userEvent.click(getByTestId('mcp-workflow-picker-confirm'));

			await waitFor(() => expect(toast.showError).toHaveBeenCalledTimes(1));
			expect(getByTestId('mcp-server-tools-count')).toHaveTextContent('1');
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
			const result = render();
			await userEvent.click(await result.findByTestId('mcp-server-add-workflow'));
			const rows = await result.findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Get campaign'))!);
			await userEvent.click(rows.find((row) => row.textContent?.includes('Escalate'))!);
			await userEvent.click(result.getByTestId('mcp-workflow-picker-confirm'));
			return result;
		}

		it('asks for a draft of each new tool in parallel, and shows the loading line until it arrives', async () => {
			const first = deferred<unknown>();
			const other = deferred<unknown>();
			api.draftTool.mockReturnValueOnce(first.promise).mockReturnValueOnce(other.promise);
			const { findAllByTestId, findByText, queryAllByTestId } = await addTwoTools();

			expect(await findAllByTestId('mcp-tool-row-drafting')).toHaveLength(2);
			expect(api.draftTool).toHaveBeenCalledTimes(2);
			expect(api.draftTool).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				tool().id,
				undefined,
			);
			expect(api.draftTool).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				SERVER_ID,
				second.id,
				undefined,
			);

			first.resolve({
				status: 'drafted',
				tool: tool({ toolName: 'get_campaign_kpis', draftSource: 'ai' }),
			});

			expect(await findByText('get_campaign_kpis')).toBeInTheDocument();
			expect(queryAllByTestId('mcp-tool-row-drafting')).toHaveLength(1);

			other.resolve({ status: 'not_available', tool: second });
			await waitFor(() => expect(queryAllByTestId('mcp-tool-row-drafting')).toHaveLength(0));
			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
		});

		it('keeps the text and reports the failed drafts of one add in one toast', async () => {
			api.draftTool.mockRejectedValue(new Error('The draft breaks the rules.'));
			const { queryAllByTestId, findByText } = await addTwoTools();

			await waitFor(() => expect(queryAllByTestId('mcp-tool-row-drafting')).toHaveLength(0));
			expect(toast.showError).toHaveBeenCalledExactlyOnceWith(
				expect.any(Error),
				'Could not write 2 drafts',
			);
			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
		});

		it('runs at most four drafts at a time, and shows the loading line on every new row', async () => {
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
			const result = render();
			await userEvent.click(await result.findByTestId('mcp-server-add-workflow'));
			const rows = await result.findAllByTestId('mcp-workflow-picker-row');
			await userEvent.click(rows.find((row) => row.textContent?.includes('Get campaign'))!);
			await userEvent.click(result.getByTestId('mcp-workflow-picker-confirm'));

			expect(await result.findAllByTestId('mcp-tool-row-drafting')).toHaveLength(6);
			expect(api.draftTool).toHaveBeenCalledTimes(4);

			calls[0].resolve({ status: 'drafted', tool: added[0] });
			await waitFor(() => expect(api.draftTool).toHaveBeenCalledTimes(5));
			calls[1].reject(new Error('Invalid key'));
			await waitFor(() => expect(api.draftTool).toHaveBeenCalledTimes(6));
			for (const [index, call] of calls.slice(2).entries()) {
				call.resolve({ status: 'drafted', tool: added[index + 2] });
			}

			await waitFor(() => expect(result.queryAllByTestId('mcp-tool-row-drafting')).toHaveLength(0));
			expect(toast.showError).toHaveBeenCalledExactlyOnceWith(
				expect.any(Error),
				'Could not write the draft',
			);
		});

		it('asks for no draft without the Assistant', async () => {
			const { findByText, queryAllByTestId } = await addTwoTools(false);

			expect(await findByText('escalate_to_on_call')).toBeInTheDocument();
			expect(queryAllByTestId('mcp-tool-row-drafting')).toHaveLength(0);
			expect(api.draftTool).not.toHaveBeenCalled();
		});

		it.each([
			['toolName', 'name'],
			['description', 'description'],
		] as const)(
			'"Generate" below the %s writes that field, with a loading state meanwhile',
			async (field, testId) => {
				api.getMcpServer.mockResolvedValue(server([tool()]));
				const call = deferred<unknown>();
				api.draftTool.mockReturnValue(call.promise);
				const { findByTestId, getByTestId, queryByTestId } = render();

				await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
				await userEvent.click(getByTestId(`mcp-tool-row-generate-${testId}`));

				expect(api.draftTool).toHaveBeenCalledWith(
					expect.anything(),
					PROJECT_ID,
					SERVER_ID,
					tool().id,
					field,
				);
				expect(getByTestId(`mcp-tool-row-generating-${testId}`)).toBeInTheDocument();
				expect(getByTestId(`mcp-tool-row-generate-${testId}`)).toBeDisabled();

				const text = field === 'toolName' ? 'get_campaign_kpis' : 'Returns the KPIs.';
				call.resolve({ status: 'drafted', tool: tool({ [field]: text, draftSource: 'ai' }) });

				await waitFor(() =>
					expect(queryByTestId(`mcp-tool-row-generating-${testId}`)).not.toBeInTheDocument(),
				);
				expect(getByTestId(`mcp-tool-row-${testId}-input`)).toHaveValue(text);
			},
		);

		it('keeps the name that the builder types while "Generate" writes the description', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const call = deferred<unknown>();
			api.draftTool.mockReturnValue(call.promise);
			const { findByTestId, getByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));
			await userEvent.click(getByTestId('mcp-tool-row-generate-description'));
			const name = getByTestId('mcp-tool-row-name-input');
			await userEvent.clear(name);
			await userEvent.type(name, 'get_kpis');
			call.resolve({
				status: 'drafted',
				tool: tool({ description: 'Returns the KPIs.', draftSource: 'ai' }),
			});

			await waitFor(() =>
				expect(getByTestId('mcp-tool-row-description-input')).toHaveValue('Returns the KPIs.'),
			);
			expect(name).toHaveValue('get_kpis');
		});

		it('hides the "Generate" buttons without the Assistant', async () => {
			api.getMcpServer.mockResolvedValue(server([tool()], false));
			const { findByTestId, getByTestId, queryByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));

			expect(getByTestId('mcp-tool-row-name-input')).toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-generate-name')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-generate-description')).not.toBeInTheDocument();
		});

		it('hides the "Generate" buttons on a broken tool', async () => {
			api.getMcpServer.mockResolvedValue(server([tool({ brokenReason: 'not_published' })]));
			const { findByTestId, getByTestId, queryByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));

			expect(getByTestId('mcp-tool-row-name-input')).toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-generate-name')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-generate-description')).not.toBeInTheDocument();
		});
	});

	describe('a project viewer', () => {
		it('sees the tools, but not the add, edit, and remove controls', async () => {
			permissions.canUpdate = false;
			api.getMcpServer.mockResolvedValue(server([tool()]));
			const { findByTestId, getByTestId, queryByTestId } = render();

			await userEvent.click(await findByTestId('mcp-tool-row-toggle'));

			expect(getByTestId('mcp-tool-row')).toHaveTextContent('get_campaign_numbers');
			expect(queryByTestId('mcp-server-add-workflow')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-menu')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-name-input')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-description-input')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-generate-name')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-tool-row-generate-description')).not.toBeInTheDocument();
		});
	});

	it('shows the empty state with "Add workflow" for a server without tools', async () => {
		api.getMcpServer.mockResolvedValue(server([]));
		const { findByTestId } = render();

		const empty = await findByTestId('mcp-server-empty-contents');
		expect(within(empty).getByTestId('mcp-server-add-workflow')).toBeInTheDocument();
	});

	describe('the Assistant', () => {
		function renderWith(props: Record<string, unknown>) {
			return renderComponent({
				props: { projectId: PROJECT_ID, serverId: SERVER_ID, ...props },
				global: { plugins: [createTestRouter()] },
			});
		}

		it('offers "Build with the Assistant" on an empty server', async () => {
			api.getMcpServer.mockResolvedValue(server([]));
			const { findByTestId, getByTestId, emitted } = renderWith({ assistantAvailable: true });

			const card = await findByTestId('mcp-server-build-with-assistant');
			expect(card).toHaveTextContent('Build with the Assistant');
			expect(
				within(getByTestId('mcp-server-empty-contents')).getByTestId('mcp-server-add-workflow'),
			).toBeInTheDocument();

			await userEvent.click(getByTestId('mcp-server-build-with-assistant-button'));

			expect(emitted('build-with-assistant')).toHaveLength(1);
		});

		it('disables "Build with Assistant" while the panel is open', async () => {
			api.getMcpServer.mockResolvedValue(server([]));
			const { findByTestId } = renderWith({ assistantAvailable: true, assistantOpen: true });

			expect(await findByTestId('mcp-server-build-with-assistant-button')).toBeDisabled();
		});

		it('does not offer the Assistant without it, or to a project viewer', async () => {
			api.getMcpServer.mockResolvedValue(server([]));
			const first = renderWith({ assistantAvailable: false });
			await first.findByTestId('mcp-server-empty-contents');
			expect(first.queryByTestId('mcp-server-build-with-assistant')).not.toBeInTheDocument();
			first.unmount();

			permissions.canUpdate = false;
			const second = renderWith({ assistantAvailable: true });
			await second.findByTestId('mcp-server-empty-contents');
			expect(second.queryByTestId('mcp-server-build-with-assistant')).not.toBeInTheDocument();
		});

		it('loads the tools again on a change, and highlights the new rows', async () => {
			const first = tool();
			const added = tool({
				id: '0190a8d6-4a2e-7000-8000-0000000000a2',
				targetId: 'wf-6',
				toolName: 'escalate_to_on_call',
			});
			api.getMcpServer.mockResolvedValue(server([first]));
			const { findAllByTestId, rerender } = renderWith({ refreshKey: 0 });
			await findAllByTestId('mcp-tool-row');
			api.getMcpServer.mockResolvedValue(server([first, added]));

			await rerender({ refreshKey: 1 });

			await waitFor(async () => expect(await findAllByTestId('mcp-tool-row')).toHaveLength(2));
			const rows = await findAllByTestId('mcp-tool-row');
			const byName = (name: string) => rows.find((row) => row.dataset.toolName === name);
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
			const { findAllByTestId, rerender } = renderWith({ refreshKey: 0 });
			await findAllByTestId('mcp-tool-row');
			const slow = deferred<McpServerDetailResponse>();
			api.getMcpServer.mockReturnValueOnce(slow.promise);
			await rerender({ refreshKey: 1 });
			api.getMcpServer.mockResolvedValueOnce(server([first, added]));
			await rerender({ refreshKey: 2 });
			await waitFor(async () => expect(await findAllByTestId('mcp-tool-row')).toHaveLength(2));

			slow.resolve(server([first]));
			await slow.promise;
			await new Promise((resolve) => setTimeout(resolve));

			expect(await findAllByTestId('mcp-tool-row')).toHaveLength(2);
		});

		it('highlights no row when a reload replaces the first load', async () => {
			const firstLoad = deferred<McpServerDetailResponse>();
			api.getMcpServer.mockReturnValueOnce(firstLoad.promise);
			const { findAllByTestId, rerender } = renderWith({ refreshKey: 0 });
			api.getMcpServer.mockResolvedValueOnce(server([tool()]));

			await rerender({ refreshKey: 1 });
			firstLoad.resolve(server([]));

			const rows = await findAllByTestId('mcp-tool-row');
			expect(rows).toHaveLength(1);
			expect(rows[0]).toHaveAttribute('data-highlighted', 'false');
		});
	});
});
