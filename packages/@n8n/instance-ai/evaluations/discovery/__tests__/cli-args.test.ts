import { resolve } from 'node:path';

import { isRoutingMode, parseCliArgs, parseSkillOverride } from '../cli-args';

describe('parseCliArgs', () => {
	it('accepts the dispatcher flag names as aliases', () => {
		const args = parseCliArgs([
			'--cases-dir',
			'/tmp/cases',
			'--filter',
			'lt-route-agent-x-1a2b3c4d',
			'--iterations',
			'2',
			'--timeout-ms',
			'90000',
			'--output-dir',
			'/tmp/out',
		]);

		expect(args).toMatchObject({
			casesDir: '/tmp/cases',
			filter: 'lt-route-agent-x-1a2b3c4d',
			trials: 2,
			timeoutMs: 90_000,
			outputDir: '/tmp/out',
		});
		expect(isRoutingMode(args)).toBe(true);
		expect(parseCliArgs(['--trials', '4', '--timeout', '5000'])).toMatchObject({
			trials: 4,
			timeoutMs: 5000,
		});
	});

	it('needs a case source for routing-only flags', () => {
		expect(() => parseCliArgs(['--stop-on-route'])).toThrow(
			'--stop-on-route works only in routing mode: pass --cases-dir <dir>, or --source langtracer --suite <slug|id>.',
		);
		expect(() => parseCliArgs(['--output-dir', '/tmp/out'])).toThrow(
			/--output-dir works only in routing mode/,
		);
		expect(() => parseCliArgs(['--source', 'local'])).toThrow(
			'--source local needs --cases-dir <dir>.',
		);
		expect(() => parseCliArgs(['--source', 'langtracer'])).toThrow(
			'--source langtracer needs --suite <slug|id>.',
		);
		expect(
			isRoutingMode(parseCliArgs(['--source', 'langtracer', '--suite', 'intent-routing'])),
		).toBe(true);
		expect(isRoutingMode(parseCliArgs([]))).toBe(false);
	});

	it('refuses unknown flags and invalid values', () => {
		expect(() => parseCliArgs(['--iteration', '3'])).toThrow('Unknown argument: --iteration');
		expect(() => parseCliArgs(['--iterations', '0'])).toThrow(/expected a positive integer/);
		expect(() => parseCliArgs(['--filter'])).toThrow('Missing value for --filter');
	});

	it('collects repeated --skill-file values', () => {
		const args = parseCliArgs([
			'--skill-file',
			'intent-recognition=skills/variant.md',
			'--skill-file',
			'planning=/abs/planning.md',
		]);

		expect(args.skillFiles).toEqual([
			{ skillId: 'intent-recognition', path: resolve('skills/variant.md') },
			{ skillId: 'planning', path: '/abs/planning.md' },
		]);
		expect(() => parseSkillOverride('intent-recognition')).toThrow(
			'--skill-file expects <skillId>=<path>, got "intent-recognition"',
		);
	});

	it('stops at --help', () => {
		expect(parseCliArgs(['--help', '--bogus']).help).toBe(true);
	});
});
