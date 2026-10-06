import { ref } from 'vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import McpDiscoveryEntry from './McpDiscoveryEntry.vue';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';

const mocks = vi.hoisted(() => ({ push: vi.fn(), trackEntry: vi.fn() }));
const label = ref('Build with Claude');
vi.mock('./useMcpDiscovery', () => ({
	useMcpDiscovery: () => ({ mcpDiscovery: { trackEntry: mocks.trackEntry }, entryLabel: label }),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: mocks.push }),
}));

const render = createComponentRenderer(McpDiscoveryEntry);
describe('MCP discovery entry CTA', () => {
	it.each(['canvas', 'sidebar', 'footer'] as const)(
		'updates visible copy and accessible name in %s',
		async (placement) => {
			label.value = 'Build with Claude';
			const { getByRole } = render({ props: { placement } });
			for (const text of ['Build with Claude', 'Connect Claude', 'Go back to Claude and prompt']) {
				label.value = text;
				await import('vue').then(({ nextTick }) => nextTick());
				expect(getByRole('button', { name: text })).toHaveTextContent(text);
			}
			await userEvent.click(getByRole('button', { name: label.value }));
			expect(mocks.trackEntry).toHaveBeenCalledWith(placement, 'clicked');
			expect(mocks.push).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		},
	);
});
