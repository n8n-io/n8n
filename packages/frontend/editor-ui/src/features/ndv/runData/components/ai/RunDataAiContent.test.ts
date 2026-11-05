import { createTestNode, createTestTaskData } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestLogEntry } from '@/features/execution/logs/__test__/mocks';
import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import RunDataAiContent from './RunDataAiContent.vue';

const renderComponent = createComponentRenderer(RunDataAiContent, {
	global: {
		stubs: {
			AiRunContentBlock: { template: '<div />' },
			ViewSubExecution: { template: '<div />' },
		},
	},
});

function createLogEntry(generationInfo?: Record<string, unknown>) {
	return createTestLogEntry({
		node: createTestNode({ name: 'Azure OpenAI Chat Model' }),
		runData: createTestTaskData({
			startTime: 1,
			data: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[
						{
							json: {
								response: { generations: [[{ text: 'Hello', generationInfo }]] },
							},
						},
					],
				],
			},
		}),
	});
}

describe('RunDataAiContent', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('shows the model that answered in the header', () => {
		renderComponent({
			props: { inputData: createLogEntry({ model_name: 'gpt-4.1-mini-2025-04-14' }) },
		});

		expect(screen.getByTestId('ai-responding-model')).toHaveTextContent(
			'Answered by gpt-4.1-mini-2025-04-14',
		);
	});

	it('hides the model item when the run data has no model name', () => {
		renderComponent({ props: { inputData: createLogEntry() } });

		expect(screen.getByText('Azure OpenAI Chat Model')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-responding-model')).not.toBeInTheDocument();
	});
});
