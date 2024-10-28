import HandleRenderer from '@/components/canvas/elements/handles/HandleRenderer.vue';
import { NodeConnectionType } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { CanvasNodeHandleKey } from '@/constants';
import { ref } from 'vue';

const renderComponent = createComponentRenderer(HandleRenderer);

const Handle = {
	template: '<div><slot /></div>',
};

describe('HandleRenderer', () => {
	it('should render the main input handle correctly', async () => {
		const { container } = renderComponent({
			props: {
				mode: 'input',
				type: NodeConnectionType.Main,
				index: 0,
				position: 'left',
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
		expect(container.querySelector('.canvas-node-handle-main-input')).toBeInTheDocument();
	});

	it('should render the main output handle correctly', async () => {
		const { container } = renderComponent({
			props: {
				mode: 'output',
				type: NodeConnectionType.Main,
				index: 0,
				position: 'right',
				offset: { right: '10px', bottom: '10px' },
				label: 'Main Output',
			},
			global: {
				stubs: {
					Handle,
				},
			},
		});

		expect(container.querySelector('.handle')).toBeInTheDocument();
		expect(container.querySelector('.canvas-node-handle-main-output')).toBeInTheDocument();
	});

	it('should render the non-main handle correctly', async () => {
		const { container } = renderComponent({
			props: {
				mode: 'input',
				type: NodeConnectionType.AiTool,
				index: 0,
				position: 'top',
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
		expect(container.querySelector('.canvas-node-handle-non-main')).toBeInTheDocument();
	});

	it('should provide the label correctly', async () => {
		const label = 'Test Label';
		const { getByText } = renderComponent({
			props: {
				mode: 'input',
				type: NodeConnectionType.AiTool,
				index: 0,
				position: 'top',
				offset: { top: '10px', left: '5px' },
				label,
			},
			global: {
				provide: {
					[`${CanvasNodeHandleKey}`]: { label: ref(label) },
				},
				stubs: {
					Handle,
				},
			},
		});

		expect(getByText(label)).toBeInTheDocument();
	});
});
