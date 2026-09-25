import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import McpConnectedClientRow from '@/features/ai/mcpAccess/components/McpConnectedClientRow.vue';
import { createOAuthClient } from '@/features/ai/mcpAccess/mcp.test.utils';

vi.mock('@/app/components/TimeAgo.vue', () => ({
	default: {
		name: 'TimeAgo',
		props: ['date'],
		template: '<span>2 minutes ago</span>',
	},
}));

const createComponent = createComponentRenderer(McpConnectedClientRow, {
	pinia: createTestingPinia(),
});

describe('McpConnectedClientRow', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the client with its type, connection time and access summary', () => {
		const { getByTestId } = createComponent({
			props: {
				client: createOAuthClient({
					name: 'Cursor',
					scopes: ['workflow:read', 'execution:read', 'workflow:write'],
				}),
			},
		});

		const row = getByTestId('mcp-client-preview-row');
		expect(getByTestId('mcp-client-preview-name')).toHaveTextContent('Cursor');
		expect(row).toHaveTextContent('IDE · Connected 2 minutes ago');
		expect(getByTestId('mcp-client-preview-access')).toHaveTextContent(
			'List workflows, Get execution details +1',
		);
	});

	it('omits the type for clients without a recognized brand', () => {
		const { getByTestId } = createComponent({
			props: { client: createOAuthClient({ name: 'Some Unknown Client' }) },
		});

		expect(getByTestId('mcp-client-preview-row')).not.toHaveTextContent('·');
		expect(getByTestId('mcp-client-preview-row')).toHaveTextContent('Connected 2 minutes ago');
	});

	it('reads a grant covering every offered scope as full access', () => {
		const { getByTestId } = createComponent({
			props: {
				client: createOAuthClient({ scopes: ['workflow:read', 'execution:read'] }),
				scopeTools: { 'workflow:read': ['list_workflows'], 'execution:read': ['get_execution'] },
			},
		});

		expect(getByTestId('mcp-client-preview-access')).toHaveTextContent('Full access');
	});

	it('emits click when the row is activated', async () => {
		const { getByTestId, emitted } = createComponent({
			props: { client: createOAuthClient() },
		});

		await userEvent.click(getByTestId('mcp-client-preview-name'));

		expect(emitted('click')).toHaveLength(1);
		expect(emitted('revoke')).toBeUndefined();
	});

	it('emits revoke, and not click, when the revoke action is used', async () => {
		const { getByTestId, emitted } = createComponent({
			props: { client: createOAuthClient({ name: 'Claude Code' }) },
		});

		const button = getByTestId('mcp-client-preview-revoke-button');
		expect(button).toHaveAccessibleName('Revoke access for Claude Code');

		await userEvent.click(button);

		expect(emitted('revoke')).toHaveLength(1);
		expect(emitted('click')).toBeUndefined();
	});
});
