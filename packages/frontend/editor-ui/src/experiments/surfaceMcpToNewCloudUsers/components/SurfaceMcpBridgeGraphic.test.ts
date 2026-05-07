import { createComponentRenderer } from '@/__tests__/render';
import SurfaceMcpBridgeGraphic from './SurfaceMcpBridgeGraphic.vue';

const renderComponent = createComponentRenderer(SurfaceMcpBridgeGraphic);

describe('SurfaceMcpBridgeGraphic', () => {
	it('renders agent logos on the left and n8n on the right for the hero graphic', () => {
		const { container, getByTestId } = renderComponent({ props: { size: 'hero' } });

		expect(getByTestId('surface-mcp-bridge-agent-logos')).toBeInTheDocument();
		expect(
			Array.from(
				getByTestId('surface-mcp-bridge-agent-logos').querySelectorAll('[data-test-id]'),
			).map((element) => element.getAttribute('data-test-id')),
		).toEqual([
			'surface-mcp-bridge-claude-logo',
			'surface-mcp-bridge-codex-logo',
			'surface-mcp-bridge-cursor-logo',
			'surface-mcp-bridge-openai-logo',
		]);
		expect(getByTestId('surface-mcp-bridge-n8n-logo')).toBeInTheDocument();
		expect(container.querySelector('[data-icon="mcp"]')).not.toBeInTheDocument();
		expect(
			Array.from(getByTestId('surface-mcp-bridge-agent-logos').querySelectorAll('span')).map(
				(element) => element.className.includes('agentStacked'),
			),
		).toEqual([true, true, true, false]);
	});
});
