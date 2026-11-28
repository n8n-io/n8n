import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import McpServerToolModalShell from './McpServerToolModalShell.vue';

const renderComponent = createComponentRenderer(McpServerToolModalShell);

describe('McpServerToolModalShell', () => {
	it('renders shared header, body, and footer slots for any tool kind', async () => {
		const { emitted } = renderComponent({
			props: {
				open: true,
				title: 'slack_post_message',
				editableTitle: true,
				canUpdate: true,
				titleHint: 'Tool name hint',
			},
			slots: {
				titlePrefix: '<span data-test-id="kind-icon">icon</span>',
				headerActions: '<button data-test-id="cred-picker">Credential</button>',
				titleFooterAction: '<button data-test-id="title-action">Generate</button>',
				default: '<div data-test-id="custom-body">Node or agent settings</div>',
				footerLeft: '<button data-test-id="remove-btn">Remove</button>',
			},
		});

		expect(await screen.findByTestId('kind-icon')).toBeInTheDocument();
		expect(screen.getByTestId('cred-picker')).toBeInTheDocument();
		expect(screen.getByTestId('title-action')).toBeInTheDocument();
		expect(screen.getByTestId('custom-body')).toHaveTextContent('Node or agent settings');
		expect(screen.getByTestId('remove-btn')).toBeInTheDocument();
		expect(screen.getByTestId('mcp-tool-dialog-cancel')).toBeInTheDocument();
		expect(screen.getByTestId('mcp-tool-dialog-save')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('mcp-tool-dialog-save'));
		expect(emitted('save')).toHaveLength(1);
	});

	it('emits update:title when the inline title is edited', async () => {
		const { emitted } = renderComponent({
			props: {
				open: true,
				title: 'agent_tool',
				editableTitle: true,
				canUpdate: true,
			},
		});

		await userEvent.click(await screen.findByTestId('inline-editable-area'));
		const input = screen.getByTestId('inline-edit-input');
		await userEvent.clear(input);
		await userEvent.type(input, 'support_agent{Enter}');

		expect(emitted('update:title')).toEqual([['support_agent']]);
	});

	it('emits update:open false on Cancel and Escape without emitting save', async () => {
		const { emitted } = renderComponent({
			props: {
				open: true,
				title: 'agent_tool',
				editableTitle: true,
				canUpdate: true,
			},
		});

		await userEvent.click(await screen.findByTestId('mcp-tool-dialog-cancel'));
		expect(emitted('update:open')).toEqual([[false]]);
		expect(emitted('save')).toBeUndefined();
	});

	it('blocks closing while busy', async () => {
		const { emitted } = renderComponent({
			props: {
				open: true,
				title: 'agent_tool',
				canUpdate: true,
				busy: true,
			},
		});

		expect(await screen.findByTestId('mcp-tool-dialog-cancel')).toBeDisabled();
		expect(screen.getByTestId('mcp-tool-dialog-save')).toBeDisabled();
		await userEvent.keyboard('{Escape}');
		expect(emitted('update:open')).toBeUndefined();
	});

	it('links title validation errors via aria-describedby and aria-invalid without role="alert"', async () => {
		renderComponent({
			props: {
				open: true,
				title: 'Invalid-Name',
				editableTitle: true,
				canUpdate: true,
				titleError: 'Use lowercase letters, numbers, and underscores.',
			},
		});

		const error = await screen.findByTestId('mcp-tool-dialog-name-error');
		const input = screen.getByTestId('inline-edit-input');
		expect(error).not.toHaveAttribute('role', 'alert');
		expect(error).toHaveAttribute('id');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAttribute('aria-describedby', error.getAttribute('id'));
	});
});
