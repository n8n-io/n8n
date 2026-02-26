/**
 * Regression test for NODE-4525: DateTime.format() fails in Code node
 *
 * Issue: The custom n8n DateTime.format() extension works in expression fields
 * (e.g., Set node) but fails in Code nodes with "format is not a function" error.
 *
 * Root cause: The .format() method is a custom n8n extension added to Luxon's DateTime
 * for the expression evaluator. Code nodes execute in a vm2 sandbox that doesn't
 * include the expression runtime extensions.
 *
 * Expected behavior: DateTime.format() should work consistently across all contexts
 * where DateTime is available, or documentation should clearly indicate that Code nodes
 * must use Luxon's native .toFormat() method instead.
 */

import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type { IExecuteFunctions, IWorkflowDataProxyData } from 'n8n-workflow';
import { DateTime } from 'luxon';

import { Code } from '../Code.node';

describe('Code Node - DateTime.format() regression (NODE-4525)', () => {
	const node = new Code();
	const thisArg = mock<IExecuteFunctions>({
		getNode: () => mock(),
		helpers: { normalizeItems },
	});

	const workflowDataProxy = mock<IWorkflowDataProxyData>({
		$input: {
			item: { json: { test: 'data' }, pairedItem: { item: 0 } },
		},
		DateTime, // Make Luxon's DateTime available in sandbox
	});

	thisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);

	beforeEach(() => {
		jest.clearAllMocks();
		thisArg.getNodeParameter.calledWith('mode', 0).mockReturnValue('runOnceForEachItem');
		thisArg.getInputData.mockReturnValue([
			{ json: { test: 'data' }, pairedItem: { item: 0 } },
		]);
	});

	describe('DateTime.format() (custom n8n extension)', () => {
		it('should fail with "format is not a function" error', async () => {
			// This test demonstrates the bug: DateTime.format() is not available in Code nodes
			// According to docs, DateTime.format() should work, but it throws an error in Code nodes
			const jsCode = `$input.item.json.formatted = DateTime.now().format('yyyy-MM-dd HH:mm:ss');
return $input.item;`;

			thisArg.getNodeParameter.calledWith('jsCode', 0).mockReturnValue(jsCode);

			// Execute and expect failure with "format is not a function"
			await expect(node.execute.call(thisArg)).rejects.toThrow(/format is not a function/i);
		});

		it('should fail with DateTime.minus() extension', async () => {
			// Similar to .format(), .minus() is also a custom n8n extension
			const jsCode = `$input.item.json.past = DateTime.now().minus(1, 'days').toISO();
return $input.item;`;

			thisArg.getNodeParameter.calledWith('jsCode', 0).mockReturnValue(jsCode);

			// This should also fail because minus() signature differs from Luxon's native
			await expect(node.execute.call(thisArg)).rejects.toThrow();
		});
	});
});
