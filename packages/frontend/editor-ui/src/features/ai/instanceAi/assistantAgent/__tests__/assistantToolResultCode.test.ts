import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';

import AssistantToolResultCode from '../AssistantToolResultCode.vue';

const renderComponent = createComponentRenderer(AssistantToolResultCode);

describe('AssistantToolResultCode', () => {
	it('shows the workflow code as highlighted TypeScript, not as JSON', async () => {
		const { container, findByText } = renderComponent({
			props: {
				toolCall: {
					tool: 'get_workflow_as_code',
					toolCallId: 'tc-1',
					state: TOOL_CALL_STATE.DONE,
					input: { workflowId: 'wf-1' },
					output: { code: "const name = 'Daily report';\nexport default name;" },
				},
			},
		});

		await findByText(/Daily report/);
		const code = container.querySelector('code');
		expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
		expect(code?.textContent).toBe("const name = 'Daily report';\nexport default name;");
		expect(container.textContent).not.toContain('"code"');
	});
});
