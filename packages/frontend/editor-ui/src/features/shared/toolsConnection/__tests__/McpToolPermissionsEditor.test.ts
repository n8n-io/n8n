import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import McpToolPermissionsEditor from '@/features/shared/toolsConnection/McpToolPermissionsEditor.vue';

vi.mock('@/app/composables/useMessage', () => ({ useMessage: () => ({ confirm: vi.fn() }) }));

const renderComponent = createComponentRenderer(McpToolPermissionsEditor);

it('opens Agent MCP categories with individual tool permissions independently', async () => {
	const { getByRole } = renderComponent({
		props: {
			actor: 'agent',
			availableTools: [
				{ id: 'list', name: 'List', category: 'read' },
				{ id: 'write', name: 'Write', category: 'write' },
			],
			modelValue: {
				categories: { read: 'always_allow', write: 'require_approval' },
				tools: { list: 'blocked', write: 'blocked' },
			},
			serverTitle: 'Example',
			status: 'connected',
		},
	});

	const read = getByRole('button', { name: 'Read-only tools' });
	const write = getByRole('button', { name: 'Write and delete tools' });
	expect(read).toHaveAttribute('aria-expanded', 'true');
	expect(write).toHaveAttribute('aria-expanded', 'true');

	await fireEvent.click(read);
	expect(read).toHaveAttribute('aria-expanded', 'false');
	expect(write).toHaveAttribute('aria-expanded', 'true');
});
