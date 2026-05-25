import { makeEvalThreadId } from '../harness/runner';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('makeEvalThreadId', () => {
	it('defaults to `eval-<uuid>` when EVAL_THREAD_PREFIX is unset', () => {
		const id = makeEvalThreadId({});
		const [prefix, ...rest] = id.split('-');
		expect(prefix).toBe('eval');
		expect(rest.join('-')).toMatch(UUID_PATTERN);
	});

	it('embeds EVAL_THREAD_PREFIX into the threadId', () => {
		const id = makeEvalThreadId({ EVAL_THREAD_PREFIX: 'evals-ci-feature-foo' });
		expect(id.startsWith('evals-ci-feature-foo-')).toBe(true);
		const uuidPortion = id.slice('evals-ci-feature-foo-'.length);
		expect(uuidPortion).toMatch(UUID_PATTERN);
	});

	it('trims whitespace and falls back to `eval` when the env var is blank', () => {
		expect(makeEvalThreadId({ EVAL_THREAD_PREFIX: '   ' }).startsWith('eval-')).toBe(true);
		expect(makeEvalThreadId({ EVAL_THREAD_PREFIX: '' }).startsWith('eval-')).toBe(true);
	});
});
