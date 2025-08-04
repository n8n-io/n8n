import { describe, it, expect } from 'vitest';
import { getEasyAiWorkflowJson } from './easyAiWorkflowUtils';

describe('getEasyAiWorkflowJson', () => {
	it('should return expected easy ai workflow', () => {
		const workflow = getEasyAiWorkflowJson();

		if (!workflow?.nodes) fail();

		expect(workflow).toMatchSnapshot();
	});
});
