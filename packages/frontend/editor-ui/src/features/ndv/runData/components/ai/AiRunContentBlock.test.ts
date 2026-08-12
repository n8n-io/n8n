import { createComponentRenderer } from '@/__tests__/render';
import AiRunContentBlock from './AiRunContentBlock.vue';
import type { IAiDataContent } from '@/Interface';
import { NodeConnectionTypes, type INodeExecutionData } from 'n8n-workflow';
import { MAX_DISPLAY_DATA_SIZE_LOGS_VIEW } from '@/app/constants';
import { fireEvent, screen } from '@testing-library/vue';

const renderComponent = createComponentRenderer(AiRunContentBlock, {
	global: {
		stubs: {
			RunDataAi: {
				template: '<div data-test-id="ai-content">ai content</div>',
			},
		},
	},
});

function createRunData(payload: unknown): IAiDataContent {
	return {
		data: [
			{
				json: {
					value: payload,
				},
			} as unknown as INodeExecutionData,
		],
		inOut: 'output',
		type: NodeConnectionTypes.AiLanguageModel,
		metadata: {
			executionTime: 0,
			startTime: 0,
		},
	};
}

describe('AiRunContentBlock', () => {
	const largePayload = 'x'.repeat(MAX_DISPLAY_DATA_SIZE_LOGS_VIEW + 1);

	it('hides oversized data behind an explicit action', async () => {
		renderComponent({
			props: {
				runData: createRunData(largePayload),
			},
		});

		expect(await screen.findByText('Show 0.5 MB of data?')).toBeInTheDocument();
		expect(await screen.findByRole('button', { name: 'Show data' })).toBeInTheDocument();
		expect(screen.queryByTestId('ai-content')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Show data' }));

		expect(await screen.findByTestId('ai-content')).toBeInTheDocument();
	});

	it('resets the view when run data changes', async () => {
		const rendered = renderComponent({
			props: {
				runData: createRunData(largePayload),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Show data' }));
		expect(await screen.findByTestId('ai-content')).toBeInTheDocument();

		await rendered.rerender({
			runData: createRunData(`${largePayload}updated`),
		});

		expect(screen.queryByTestId('ai-content')).not.toBeInTheDocument();
		expect(await screen.findByText('Show 0.5 MB of data?')).toBeInTheDocument();
	});

	it('shows small payloads automatically', async () => {
		const rendered = renderComponent({
			props: {
				runData: createRunData('small payload'),
			},
		});

		expect(await screen.findByTestId('ai-content')).toBeInTheDocument();
		expect(rendered.queryByText('Display data?')).not.toBeInTheDocument();
	});
});
