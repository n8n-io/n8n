import CanvasNodeDisabledStrikeThrough from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeDisabledStrikeThrough.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionType } from 'n8n-workflow';
import { createCanvasNodeProvide } from '@/__tests__/data';
import { CanvasConnectionMode } from '@/types';

const renderComponent = createComponentRenderer(CanvasNodeDisabledStrikeThrough);

describe('CanvasNodeDisabledStrikeThrough', () => {
	it('should render node correctly', () => {
		const { container } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							connections: {
								[CanvasConnectionMode.Input]: {
									[NodeConnectionType.Main]: [
										[{ node: 'node', type: NodeConnectionType.Main, index: 0 }],
									],
								},
								[CanvasConnectionMode.Output]: {
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
