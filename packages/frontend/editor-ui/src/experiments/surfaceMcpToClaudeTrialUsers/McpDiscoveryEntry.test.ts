import { reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import McpDiscoveryEntry from './McpDiscoveryEntry.vue';
import { MCP_SETTINGS_VIEW } from '@n8n/frontend-module-mcp';

const mocks = vi.hoisted(() => ({ push: vi.fn(), trackEntry: vi.fn() }));
const discovery = reactive({
	shouldShowEntryPoints: true,
	ctaStage: 'build',
	trackEntry: mocks.trackEntry,
});
vi.mock('./mcpDiscovery.store', () => ({ useMcpDiscoveryStore: () => discovery }));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: mocks.push }),
}));

const render = createComponentRenderer(McpDiscoveryEntry);
describe('MCP discovery entry CTA', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(window, 'open').mockReturnValue(null);
	});
	afterEach(() => vi.restoreAllMocks());

	describe.each(['canvas', 'sidebar', 'footer'] as const)('%s', (placement) => {
		it.each(['build', 'connect', 'build_in_claude'])(
			'uses the correct copy, subtext and destination for %s',
			async (stage) => {
				discovery.ctaStage = stage;
				const { getByRole, queryByText } = render({ props: { placement } });
				const label =
					stage === 'connect'
						? 'Connect Claude'
						: placement === 'footer' && stage === 'build'
							? 'Build your workflow in Claude'
							: 'Build in Claude';
				const button = getByRole('button', { name: label });
				expect(button).toHaveTextContent(label);
				if (placement === 'sidebar' && stage === 'build') {
					expect(queryByText('Build workflows in Claude')).toBeInTheDocument();
					expect(button).toHaveAccessibleDescription('Describe it in Claude, it appears in n8n.');
				} else {
					expect(queryByText('Build workflows in Claude')).not.toBeInTheDocument();
					expect(button).not.toHaveAttribute('aria-describedby');
					expect(queryByText('Describe it in Claude, it appears in n8n.')).not.toBeInTheDocument();
				}
				if (placement === 'footer' && stage === 'build') {
					expect(queryByText('Prefer Claude?')).toBeInTheDocument();
					expect(button).not.toHaveTextContent('Prefer Claude?');
				} else {
					expect(queryByText('Prefer Claude?')).not.toBeInTheDocument();
				}
				await userEvent.click(button);
				expect(mocks.trackEntry).toHaveBeenCalledWith(placement, 'clicked');
				if (stage === 'build_in_claude') {
					expect(window.open).toHaveBeenCalledWith(
						'https://claude.ai/new',
						'_blank',
						'noopener,noreferrer',
					);
					expect(mocks.push).not.toHaveBeenCalled();
				} else {
					expect(mocks.push).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
					expect(window.open).not.toHaveBeenCalled();
				}
			},
		);
	});

	it('hides the card copy when the sidebar is collapsed', () => {
		discovery.ctaStage = 'build';
		const { getByRole, queryByText } = render({ props: { placement: 'sidebar', collapsed: true } });
		expect(queryByText('Describe it in Claude, it appears in n8n.')).not.toBeInTheDocument();
		expect(queryByText('Build workflows in Claude')).not.toBeInTheDocument();
		expect(getByRole('button', { name: 'Build in Claude' })).not.toHaveAttribute(
			'aria-describedby',
		);
	});
});
