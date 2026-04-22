/**
 * Tests for type guard functions
 */

import {
	isSplitInBatchesBuilder,
	extractSplitInBatchesBuilder,
	isSwitchCaseComposite,
	isIfElseComposite,
} from './type-guards';

describe('isSplitInBatchesBuilder', () => {
	it('returns true for direct SplitInBatchesBuilder', () => {
		const builder = {
			sibNode: {},
			_doneNodes: [],
			_eachNodes: [],
		};
		expect(isSplitInBatchesBuilder(builder)).toBe(true);
	});

	it('returns true for DoneChain/EachChain with valid _parent', () => {
		const chain = {
			_parent: {
				sibNode: {},
				_doneNodes: [],
				_eachNodes: [],
			},
			_nodes: [],
		};
		expect(isSplitInBatchesBuilder(chain)).toBe(true);
	});

	it('returns false for null', () => {
		expect(isSplitInBatchesBuilder(null)).toBe(false);
	});

	it('returns false for non-object', () => {
		expect(isSplitInBatchesBuilder('string')).toBe(false);
		expect(isSplitInBatchesBuilder(123)).toBe(false);
		expect(isSplitInBatchesBuilder(undefined)).toBe(false);
	});

	it('returns false for object without required properties', () => {
		expect(isSplitInBatchesBuilder({ sibNode: {} })).toBe(false);
		expect(isSplitInBatchesBuilder({ _doneNodes: [] })).toBe(false);
	});

	it('returns false for chain with invalid _parent', () => {
		const chain = {
			_parent: { notValid: true },
			_nodes: [],
		};
		expect(isSplitInBatchesBuilder(chain)).toBe(false);
	});

	it('returns false for chain with null _parent', () => {
		const chain = {
			_parent: null,
			_nodes: [],
		};
		expect(isSplitInBatchesBuilder(chain)).toBe(false);
	});
});

describe('extractSplitInBatchesBuilder', () => {
	it('extracts builder from direct SplitInBatchesBuilder', () => {
		const builder = {
			sibNode: { type: 'splitInBatches' },
			_doneNodes: [],
			_eachNodes: [],
			_doneBatches: [],
			_eachBatches: [],
			_hasLoop: false,
		};
		const result = extractSplitInBatchesBuilder(builder);
		expect(result.sibNode).toBe(builder.sibNode);
	});

	it('extracts builder from chain with _parent', () => {
		const parentBuilder = {
			sibNode: { type: 'splitInBatches' },
			_doneNodes: [],
			_eachNodes: [],
			_doneBatches: [],
			_eachBatches: [],
			_hasLoop: false,
		};
		const chain = {
			_parent: parentBuilder,
			_nodes: [],
		};
		const result = extractSplitInBatchesBuilder(chain);
		expect(result).toBe(parentBuilder);
	});
});

describe('isSwitchCaseComposite', () => {
	it('returns true for object with switchNode and cases', () => {
		const composite = {
			switchNode: {},
			cases: [],
		};
		expect(isSwitchCaseComposite(composite)).toBe(true);
	});

	it('returns false for null', () => {
		expect(isSwitchCaseComposite(null)).toBe(false);
	});

	it('returns false for non-object', () => {
		expect(isSwitchCaseComposite('string')).toBe(false);
	});

	it('returns false for object missing switchNode', () => {
		expect(isSwitchCaseComposite({ cases: [] })).toBe(false);
	});

	it('returns false for object missing cases', () => {
		expect(isSwitchCaseComposite({ switchNode: {} })).toBe(false);
	});
});

describe('isIfElseComposite', () => {
	it('returns true for object with ifNode and trueBranch', () => {
		const composite = {
			ifNode: {},
			trueBranch: null,
		};
		expect(isIfElseComposite(composite)).toBe(true);
	});

	it('returns false for null', () => {
		expect(isIfElseComposite(null)).toBe(false);
	});

	it('returns false for non-object', () => {
		expect(isIfElseComposite('string')).toBe(false);
	});

	it('returns false for object missing ifNode', () => {
		expect(isIfElseComposite({ trueBranch: null })).toBe(false);
	});

	it('returns false for object missing trueBranch', () => {
		expect(isIfElseComposite({ ifNode: {} })).toBe(false);
	});
});
