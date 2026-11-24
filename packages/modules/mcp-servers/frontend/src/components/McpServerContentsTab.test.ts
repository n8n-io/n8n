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
		targetId: 'wf-1',
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

function server(tools: McpServerToolResponse[]): McpServerDetailResponse {
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
	};
}

const candidates: McpServerToolCandidate[] = [
	{ workflowId: 'wf-1', name: 'Get campaign numbers', description: 'Numbers', reason: null },
	{ workflowId: 'wf-2', name: 'Draft only', description: null, reason: 'not_published' },
	{ workflowId: 'wf-3', name: 'Manual start', description: null, reason: 'missing_trigger' },
	{ workflowId: 'wf-4', name: 'Closed', description: null, reason: 'caller_policy' },
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
			expect(link.closest('a') ?? link).toHaveAttribute('href', '/workflow/wf-1');
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
		});
	});

	it('shows the empty state with "Add workflow" for a server without tools', async () => {
		api.getMcpServer.mockResolvedValue(server([]));
		const { findByTestId } = render();

		const empty = await findByTestId('mcp-server-empty-contents');
		expect(within(empty).getByTestId('mcp-server-add-workflow')).toBeInTheDocument();
	});
});
