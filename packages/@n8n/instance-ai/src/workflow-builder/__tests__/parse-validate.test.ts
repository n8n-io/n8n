import { partitionWarnings } from '../parse-validate';

describe('partitionWarnings', () => {
	it('returns empty arrays for no warnings', () => {
		expect(partitionWarnings([])).toEqual({ errors: [], informational: [] });
	});

	it('classifies MISSING_TRIGGER as informational', () => {
		const warnings = [{ code: 'MISSING_TRIGGER', message: 'No trigger' }];
		const result = partitionWarnings(warnings);

		expect(result.informational).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
	});

	it('classifies DISCONNECTED_NODE as informational', () => {
		const warnings = [{ code: 'DISCONNECTED_NODE', message: 'Orphan node' }];
		const result = partitionWarnings(warnings);

		expect(result.informational).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
	});

	it('classifies unknown codes as errors', () => {
		const warnings = [
			{ code: 'INVALID_PARAM', message: 'Bad param' },
			{ code: 'UNKNOWN_NODE', message: 'Node not found' },
		];
		const result = partitionWarnings(warnings);

		expect(result.errors).toHaveLength(2);
		expect(result.informational).toHaveLength(0);
	});

	it('correctly partitions mixed warnings', () => {
		const warnings = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
			{ code: 'INVALID_PARAM', message: 'Bad param' },
			{ code: 'DISCONNECTED_NODE', message: 'Orphan' },
			{ code: 'GRAPH_CYCLE', message: 'Cycle detected' },
		];
		const result = partitionWarnings(warnings);

		expect(result.informational).toHaveLength(2);
		expect(result.errors).toHaveLength(2);
	});
});
