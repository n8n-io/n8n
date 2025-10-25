import CanvasHandleRenderer from './CanvasHandleRenderer.vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { CanvasNodeHandleKey } from '@/constants';
import { ref } from 'vue';
import { CanvasConnectionMode, type CanvasElementPortWithRenderData } from '../../../canvas.types';
import { Position } from '@vue-flow/core';

const renderComponent = createComponentRenderer(CanvasHandleRenderer);

const Handle = {
	template: '<div><slot /></div>',
};

describe('CanvasHandleRenderer', () => {
	it('should render the main input handle correctly', async () => {
		const { container } = renderComponent({
			props: {
				mode: CanvasConnectionMode.Input,
				type: NodeConnectionTypes.Main,
				index: 0,
				position: Position.Left,
				offset: { left: '10px', top: '10px' },
				label: 'Main Input',
			},
			global: {
				stubs: {
					Handle,
				},
			},
		});

		expect(container.querySelector('.handle')).toBeInTheDocument();
		expect(container.querySelector('.inputs.main')).toBeInTheDocument();
	});

	it('should render the main output handle correctly', async () => {
		const { container } = renderComponent({
			props: {
				mode: CanvasConnectionMode.Output,
				type: NodeConnectionTypes.Main,
				index: 0,
				position: Position.Right,
				offset: { right: '10px', bottom: '10px' } as CanvasElementPortWithRenderData['offset'],
				label: 'Main Output',
			},
			global: {
				stubs: {
					Handle,
				},
			},
		});

		expect(container.querySelector('.handle')).toBeInTheDocument();
		expect(container.querySelector('.outputs.main')).toBeInTheDocument();
	});

	it('should render the non-main handle correctly', async () => {
		const { container } = renderComponent({
			props: {
				mode: CanvasConnectionMode.Input,
				type: NodeConnectionTypes.AiTool,
				index: 0,
				position: Position.Top,
				offset: { top: '10px', left: '5px' },
				label: 'AI Tool Input',
			},
			global: {
				stubs: {
					Handle,
				},
			},
		});

		expect(container.querySelector('.handle')).toBeInTheDocument();
		expect(container.querySelector('.inputs.ai_tool')).toBeInTheDocument();
	});

	it('should provide the label correctly', async () => {
		const label = 'Test Label';
		const { getByText } = renderComponent({
			props: {
				mode: CanvasConnectionMode.Input,
				type: NodeConnectionTypes.AiTool,
				index: 0,
				position: Position.Top,
				offset: { top: '10px', left: '5px' },
				label,
			},
			global: {
				provide: {
					[String(CanvasNodeHandleKey)]: { label: ref(label) },
				},
				stubs: {
					Handle,
				},
			},
		});

		expect(getByText(label)).toBeInTheDocument();
	});
});
