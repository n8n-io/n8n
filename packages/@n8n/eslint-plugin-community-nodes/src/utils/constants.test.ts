import { NodeConnectionTypes as WorkflowNodeConnectionTypes } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { NodeConnectionTypes } from './constants.js';

describe('NodeConnectionTypes', () => {
	it('has every connection type from n8n-workflow', () => {
		for (const [key, value] of Object.entries(WorkflowNodeConnectionTypes)) {
			expect(NodeConnectionTypes).toHaveProperty(key, value);
		}
	});

	it('has no connection type that n8n-workflow does not have', () => {
		for (const [key, value] of Object.entries(NodeConnectionTypes)) {
			expect(WorkflowNodeConnectionTypes).toHaveProperty(key, value);
		}
	});
});
