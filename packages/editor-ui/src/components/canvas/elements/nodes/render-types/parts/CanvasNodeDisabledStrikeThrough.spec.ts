import CanvasNodeDisabledStrikeThrough from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeDisabledStrikeThrough.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionType } from 'n8n-workflow';
import { createCanvasNodeProvide } from '@/__tests__/data';

const renderComponent = createComponentRenderer(CanvasNodeDisabledStrikeThrough);

describe('CanvasNodeDisabledStrikeThrough', () => {
	it('should render node correctly', () => {
		const { container } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							connections: {
								input: {
									[NodeConnectionType.Main]: [
										[{ node: 'node', type: NodeConnectionType.Main, index: 0 }],
									],
								},
								output: {
									[NodeConnectionType.Main]: [
										[{ node: 'node', type: NodeConnectionType.Main, index: 0 }],
									],
								},
							},
						},
					}),
				},
			},
		});

		expect(container.firstChild).toBeVisible();
	});
});
