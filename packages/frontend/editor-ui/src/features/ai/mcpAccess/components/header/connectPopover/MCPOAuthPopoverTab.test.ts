import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import MCPOAuthPopoverTab from './MCPOAuthPopoverTab.vue';

vi.mock('./ConnectionParameter.vue', () => ({
	default: {
		name: 'ConnectionParameter',
		template: `
			<div data-test-id="connection-parameter">
				<span data-test-id="connection-parameter-label">{{ label }}</span>
				<span data-test-id="connection-parameter-value">{{ value }}</span>
				<button data-test-id="connection-parameter-copy-button" @click="$emit('copy', value)">Copy</button>
			</div>
		`,
		props: ['id', 'label', 'value'],
		emits: ['copy'],
	},
}));

const renderComponent = createComponentRenderer(MCPOAuthPopoverTab);

describe('MCPOAuthPopoverTab', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render the component with correct test id', () => {
			const { getByTestId } = renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			expect(getByTestId('mcp-oauth-popover-tab')).toBeVisible();
		});

		it('should render the ConnectionParameter with correct serverUrl prop', () => {
			const serverUrl = 'http://localhost:5678/mcp';
			const { getByTestId } = renderComponent({
				props: {
					serverUrl,
				},
			});

			expect(getByTestId('connection-parameter')).toBeVisible();
			expect(getByTestId('connection-parameter-value')).toHaveTextContent(serverUrl);
		});
	});

	describe('Events', () => {
		it('should emit copy event when ConnectionParameter emits copy', async () => {
			const user = userEvent.setup();
			const serverUrl = 'http://localhost:5678/mcp';
			const { getByTestId, emitted } = renderComponent({
				props: {
					serverUrl,
				},
			});

			await user.click(getByTestId('connection-parameter-copy-button'));

			expect(emitted().copy).toBeTruthy();
			expect(emitted().copy[0]).toEqual([serverUrl]);
		});
	});
});
