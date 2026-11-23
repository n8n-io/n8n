import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';

import AssistantToolResultCode from '../AssistantToolResultCode.vue';

const renderComponent = createComponentRenderer(AssistantToolResultCode);

const toolCall = {
	tool: 'get_workflow_as_code',
	toolCallId: 'tc-1',
	state: TOOL_CALL_STATE.DONE,
	input: { workflowId: 'wf-1' },
	output: {
		workflowId: 'wf-1',
		filePath: 'workflows/daily-report.ts',
		code: "const name = 'Daily report';\nexport default name;",
	},
};

describe('AssistantToolResultCode', () => {
	it('shows the workflow code as highlighted TypeScript, not as JSON', async () => {
		const { container, findByText, queryByTestId } = renderComponent({
			props: { toolCall, label: 'Output' },
		});

		await findByText(/Daily report/);
		expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
		expect(container.querySelector('code')?.textContent).toBe(toolCall.output.code);
		expect(queryByTestId('ai-tool-data-block')).toBeNull();
	});

	it('switches to the raw JSON with the fields that the code leaves out', async () => {
		const { getByRole, getByTestId } = renderComponent({ props: { toolCall, label: 'Output' } });

		await fireEvent.click(getByRole('radio', { name: 'JSON' }));

		expect(getByTestId('ai-tool-data-block').textContent).toContain(
			'"filePath": "workflows/daily-report.ts"',
		);
	});
});
