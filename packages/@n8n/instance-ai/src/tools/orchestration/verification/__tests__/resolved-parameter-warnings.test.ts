import type { ResolvedNodeParametersResult } from '../../../../types';
import {
	buildResolvedParameterNote,
	collectResolvedParameterWarnings,
	warningsFromResolution,
} from '../resolved-parameter-warnings';

function resolution(
	overrides: Partial<ResolvedNodeParametersResult> = {},
): ResolvedNodeParametersResult {
	return {
		nodeName: 'Send SMS',
		runIndex: 0,
		itemIndex: 0,
		parameters: {},
		resolved: '{}',
		failedExpressions: [],
		emptyResolutions: [],
		...overrides,
	};
}

describe('warningsFromResolution', () => {
	it('reports empty and failed expressions for the node', () => {
		const warnings = warningsFromResolution(
			resolution({
				emptyResolutions: [{ path: 'to', raw: '={{ $json.query.caller }}', resolved: undefined }],
				failedExpressions: [
					{ path: 'message', raw: '={{ $json.body.text.trim() }}', error: 'Cannot read trim' },
				],
			}),
		);

		expect(warnings).toEqual([
			{
				nodeName: 'Send SMS',
				path: 'message',
				raw: '={{ $json.body.text.trim() }}',
				issue: 'failed',
				detail: 'Cannot read trim',
			},
			{ nodeName: 'Send SMS', path: 'to', raw: '={{ $json.query.caller }}', issue: 'empty' },
		]);
	});

	it('ignores expressions that need live-only context', () => {
		const warnings = warningsFromResolution(
			resolution({
				emptyResolutions: [
					{
						path: 'token',
						raw: '={{ $secrets.vault.token }}',
						resolved: undefined,
						reason: 'unreconstructable-context',
					},
				],
				failedExpressions: [
					{
						path: 'url',
						raw: '={{ $response.body.next }}',
						error: 'undefined',
						reason: 'unreconstructable-context',
					},
				],
			}),
		);

		expect(warnings).toEqual([]);
	});

	it('returns nothing when resolution was suppressed', () => {
		const warnings = warningsFromResolution(
			resolution({
				parameters: null,
				resolved: null,
				suppressed: 'parameter-values-disabled',
				emptyResolutions: [{ path: 'to', raw: '={{ $json.x }}', resolved: '' }],
			}),
		);

		expect(warnings).toEqual([]);
	});
});

describe('collectResolvedParameterWarnings', () => {
	it('replays every reached simulated node and skips nodes whose replay fails', async () => {
		const getResolvedNodeParameters = vi.fn(async (_executionId: string, nodeName: string) => {
			await Promise.resolve();
			if (nodeName === 'Broken') throw new Error('no run data');
			return resolution({
				nodeName,
				emptyResolutions: [{ path: 'to', raw: '={{ $json.query.caller }}', resolved: undefined }],
			});
		});
		const logger = { debug: vi.fn() };

		const { warnings, skipped, skippedCount } = await collectResolvedParameterWarnings({
			executionService: { getResolvedNodeParameters },
			runs: [{ executionId: 'exec_1', nodeNames: ['Send SMS', 'Broken'] }],
			logger,
		});

		expect(getResolvedNodeParameters).toHaveBeenCalledTimes(2);
		expect(getResolvedNodeParameters).toHaveBeenCalledWith('exec_1', 'Send SMS');
		expect(warnings).toEqual([
			{
				nodeName: 'Send SMS',
				executionId: 'exec_1',
				path: 'to',
				raw: '={{ $json.query.caller }}',
				issue: 'empty',
			},
		]);
		expect(skipped).toEqual([
			{ nodeName: 'Broken', executionId: 'exec_1', reason: 'replay-failed' },
		]);
		expect(skippedCount).toBe(1);
		expect(logger.debug).toHaveBeenCalledWith(
			'Resolved-parameter check skipped for simulated node',
			expect.objectContaining({ nodeName: 'Broken', error: 'no run data' }),
		);
	});

	it('does not call the service when no simulated node was reached', async () => {
		const getResolvedNodeParameters = vi.fn();

		const result = await collectResolvedParameterWarnings({
			executionService: { getResolvedNodeParameters },
			runs: [{ executionId: 'exec_1', nodeNames: [] }],
		});

		expect(result).toEqual({ warnings: [], skipped: [], skippedCount: 0 });
		expect(getResolvedNodeParameters).not.toHaveBeenCalled();
	});
});

describe('buildResolvedParameterNote', () => {
	it('is undefined without warnings', () => {
		expect(buildResolvedParameterNote([])).toBeUndefined();
	});

	it('groups warnings by node and tells the agent the fixture output is not proof', () => {
		const note = buildResolvedParameterNote([
			{ nodeName: 'Send SMS', path: 'to', raw: '={{ $json.query.caller }}', issue: 'empty' },
			{
				nodeName: 'Send SMS',
				path: 'message',
				raw: '={{ $json.body.text.trim() }}',
				issue: 'failed',
				detail: 'Cannot read trim',
			},
			{ nodeName: 'Post to Slack', path: 'text', raw: '={{ $json.headers.x }}', issue: 'empty' },
		]);

		expect(note).toContain('Send SMS: `to` (={{ $json.query.caller }}) resolved to empty');
		expect(note).toContain('`message` (={{ $json.body.text.trim() }}) failed: Cannot read trim');
		expect(note).toContain('Post to Slack: `text`');
		expect(note).toContain('fixture data');
		expect(note).toContain('{body, query, headers, params}');
	});
});
