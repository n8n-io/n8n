import { fireEvent, screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';
import type { McpServerConnectionItem } from '../types';
import McpToolSettingsContent from '../McpToolSettingsContent.vue';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

const renderComponent = createComponentRenderer(McpToolSettingsContent);

async function selectPermission(select: HTMLElement, label: string) {
	await fireEvent.click(select);
	await fireEvent.click(screen.getByRole('menuitem', { name: label }));
}

function item(overrides: Partial<McpServerConnectionItem> = {}): McpServerConnectionItem {
	return {
		id: 'connection-1',
		kind: 'mcp-server',
		title: 'Linear',
		status: 'connected',
		availableTools: [
			{ id: 'search', name: 'Search issues', category: 'read' },
			{ id: 'create', name: 'Create issue', category: 'write' },
		],
		settings: {
			categories: { read: 'always_allow', write: 'require_approval' },
			tools: { search: 'blocked' },
		},
		...overrides,
	};
}

describe('McpToolSettingsContent', () => {
	beforeEach(() => {
		confirm.mockReset();
	});

	it('saves category permissions and preserves tool overrides', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { item: item() } });

		await fireEvent.click(getByTestId('tools-connection-settings-save'));

		expect(emitted().save).toEqual([
			[
				{
					categories: { read: 'always_allow', write: 'require_approval' },
					tools: { search: 'blocked' },
				},
			],
		]);
	});

	it('shows Custom in the category selector without adding a dropdown option', async () => {
		const { getByTestId, queryByRole } = renderComponent({ props: { item: item() } });

		expect(getByTestId('tools-connection-permission-read')).toHaveTextContent('Custom');
		await fireEvent.click(getByTestId('tools-connection-permission-read'));

		expect(queryByRole('menuitem', { name: 'Custom' })).not.toBeInTheDocument();
	});

	it('shows the tool count as a badge beside the group title', () => {
		const { getByTestId, getByText } = renderComponent({ props: { item: item() } });

		expect(getByTestId('tools-connection-count-read')).toHaveTextContent('1');
		expect(getByText('Can look things up')).toHaveTextContent(/^Can look things up$/);
	});

	it('renders both permission groups when one has no tools', () => {
		const { getByTestId } = renderComponent({
			props: {
				item: item({
					availableTools: [{ id: 'search', name: 'Search issues', category: 'read' }],
				}),
			},
		});

		expect(getByTestId('tools-connection-count-read')).toBeVisible();
		expect(getByTestId('tools-connection-count-write')).toHaveTextContent('0');
	});

	it('uses actor-specific permission and confirmation copy', async () => {
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const { getByTestId } = renderComponent({
			props: {
				item: item({
					settings: { categories: { read: 'always_allow', write: 'require_approval' } },
				}),
				actor: 'agent',
			},
		});

		await selectPermission(getByTestId('tools-connection-permission-write'), 'Allow');
		await flushPromises();

		expect(confirm).toHaveBeenCalledWith(
			'The agent can change or delete Linear content without asking first. This applies to all 1 tools in this group.',
			expect.any(Object),
		);
	});

	it('clears category overrides when the category permission changes', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: { item: item() },
		});

		await selectPermission(getByTestId('tools-connection-permission-read'), 'Block');
		await fireEvent.click(getByTestId('tools-connection-settings-save'));

		expect(emitted().save).toEqual([
			[{ categories: { read: 'blocked', write: 'require_approval' } }],
		]);
	});

	it('keeps write tools on ask when the primary action is selected', async () => {
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const { emitted, getByTestId } = renderComponent({
			props: {
				item: item({
					settings: { categories: { read: 'always_allow', write: 'require_approval' } },
				}),
			},
		});

		await selectPermission(getByTestId('tools-connection-permission-write'), 'Allow');
		await flushPromises();
		await fireEvent.click(getByTestId('tools-connection-settings-save'));

		expect(confirm).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				confirmButtonText: 'Keep Ask first',
				cancelButtonText: 'Allow anyway',
			}),
		);
		expect(emitted().save).toEqual([
			[{ categories: { read: 'always_allow', write: 'require_approval' } }],
		]);
	});

	it('allows write tools after choosing Allow anyway', async () => {
		confirm.mockResolvedValue(MODAL_CANCEL);
		const { emitted, getByTestId } = renderComponent({
			props: {
				item: item({
					settings: { categories: { read: 'always_allow', write: 'require_approval' } },
				}),
			},
		});

		await selectPermission(getByTestId('tools-connection-permission-write'), 'Allow');
		await flushPromises();
		await fireEvent.click(getByTestId('tools-connection-settings-save'));

		expect(emitted().save).toEqual([
			[{ categories: { read: 'always_allow', write: 'always_allow' } }],
		]);
	});

	it('disables permission changes and offers reconnect for authentication failures', async () => {
		const disconnected = item({
			status: 'disconnected',
			connectionFailureReason: 'authentication',
			availableTools: [],
		});
		const { container, emitted, getByLabelText, getByTestId, getByText } = renderComponent({
			props: { item: disconnected },
		});

		expect(getByTestId('tools-connection-failure')).toBeVisible();
		expect(container.querySelector('[data-disabled="true"]')).not.toBeNull();
		expect(getByText(/credential expired/i)).toBeVisible();
		expect(getByLabelText('Read-only tools')).toBeDisabled();
		expect(getByTestId('tools-connection-count-read')).toHaveTextContent('—');
		expect(getByTestId('tools-connection-count-write')).toHaveTextContent('—');
		expect(getByTestId('tools-connection-permission-read')).toBeDisabled();
		expect(getByTestId('tools-connection-settings-save')).toBeDisabled();

		await fireEvent.click(getByTestId('tools-connection-recovery'));
		expect(emitted().reconnect).toEqual([[]]);
		expect(emitted().retry).toBeUndefined();
	});

	it('offers retry for server failures', async () => {
		const { emitted, getByTestId, getByText } = renderComponent({
			props: {
				item: item({
					status: 'disconnected',
					connectionFailureReason: 'server_unavailable',
				}),
			},
		});

		expect(getByText(/server isn't responding/i)).toBeVisible();
		await fireEvent.click(getByTestId('tools-connection-recovery'));

		expect(emitted().retry).toEqual([[]]);
		expect(emitted().reconnect).toBeUndefined();
	});

	it('collapses an expanded category when the connection becomes unhealthy', async () => {
		const connected = item();
		const { getByLabelText, queryByText, rerender } = renderComponent({
			props: { item: connected },
		});

		await fireEvent.click(getByLabelText('Read-only tools'));
		expect(queryByText('Search issues')).toBeVisible();

		await rerender({ item: { ...connected, status: 'disconnected' } });
		expect(queryByText('Search issues')).not.toBeInTheDocument();
	});
});
