import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';

import AssistantToolResultTable from '../AssistantToolResultTable.vue';

const renderComponent = createComponentRenderer(AssistantToolResultTable);

const toolCall = {
	tool: 'list_workflows',
	toolCallId: 'tc-1',
	state: TOOL_CALL_STATE.DONE,
	input: {},
	output: {
		workflows: [
			{ id: 'wf-1', name: 'Daily report' },
			{ id: 'wf-2', name: 'Slack sync' },
		],
	},
};

describe('AssistantToolResultTable', () => {
	it('shows the rows of the output as a table', () => {
		const { container, queryByTestId } = renderComponent({ props: { toolCall } });

		const headers = [...container.querySelectorAll('th')].map((th) => th.textContent?.trim());
		expect(headers).toEqual(['id', 'name']);
		expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
		expect(container.textContent).toContain('Slack sync');
		expect(queryByTestId('ai-tool-data-block')).toBeNull();
	});

	it('switches to the raw JSON', async () => {
		const { container, getByRole, getByTestId } = renderComponent({ props: { toolCall } });

		await fireEvent.click(getByRole('radio', { name: 'JSON' }));

		expect(container.querySelector('table')).toBeNull();
		expect(getByTestId('ai-tool-data-block').textContent).toContain('"name": "Daily report"');
	});
});
