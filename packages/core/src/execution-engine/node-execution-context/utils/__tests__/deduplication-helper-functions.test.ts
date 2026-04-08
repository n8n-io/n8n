import { mock } from 'jest-mock-extended';
import type { Workflow, INode } from 'n8n-workflow';

import { getDeduplicationHelperFunctions } from '../deduplication-helper-functions';

describe('getDeduplicationHelperFunctions', () => {
	const workflow = mock<Workflow>();
	const node = mock<INode>();
	const helperFunctions = getDeduplicationHelperFunctions(workflow, node);

	it('should create helper functions with correct context', () => {
		const expectedMethods = [
			'checkProcessedAndRecord',
			'checkProcessedItemsAndRecord',
			'removeProcessed',
			'clearAllProcessedItems',
			'getProcessedDataCount',
		] as const;

		expectedMethods.forEach((method) => {
			expect(helperFunctions).toHaveProperty(method);
			expect(typeof helperFunctions[method]).toBe('function');
		});
	});
});
