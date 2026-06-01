import { EvaluationErrorCode } from '../evaluation-error-code';

describe('EvaluationErrorCode', () => {
	it('exposes every code from spec §6', () => {
		const expected = [
			'EVALUATION_QUOTA_EXCEEDED',
			'CONFIG_NOT_FOUND',
			'CONFIG_INVALID',
			'START_NODE_NOT_FOUND',
			'END_NODE_NOT_FOUND',
			'END_NODE_UNREACHABLE',
			'AMBIGUOUS_ENTRY_NODE',
			'RESERVED_PREFIX_IN_USE',
			'DATASET_NOT_FOUND',
			'DATASET_ACCESS_DENIED',
			'UNSUPPORTED_DATASET_SOURCE',
			'LLM_PROVIDER_UNSUPPORTED',
			'LLM_CREDENTIAL_NOT_FOUND',
			'LLM_CREDENTIAL_ACCESS_DENIED',
			'LLM_CREDENTIAL_TYPE_MISMATCH',
			'DUPLICATE_METRIC_ID',
			'DUPLICATE_METRIC_NAME',
			'BOOLEAN_COERCION_UNSUPPORTED',
			'START_NODE_DELETED',
			'END_NODE_DELETED',
			'METRIC_NODE_REF_DELETED',
			'LLM_PROVIDER_REMOVED',
			'COMPILATION_FAILED',
		];
		for (const code of expected) {
			expect(EvaluationErrorCode[code as keyof typeof EvaluationErrorCode]).toBe(code);
		}
		expect(Object.keys(EvaluationErrorCode).sort()).toEqual([...expected].sort());
	});
});
