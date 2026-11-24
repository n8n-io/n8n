import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parseArgs, validateCommand } from './validate';

class ExitError extends Error {
	constructor(readonly code: number | undefined) {
		super(`process.exit(${code})`);
	}
}

describe('workflow-sdk validate', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let logSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
			throw new ExitError(typeof code === 'number' ? code : undefined);
		});
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('--engine', () => {
		it('is not set by default', () => {
			expect(parseArgs(['workflow.ts']).options.engine).toBeUndefined();
		});

		it.each([
			[['workflow.ts', '--engine', 'v2'], 'v2'],
			[['--engine=v1', 'workflow.ts'], 'v1'],
		])('parses %j', (argv, engine) => {
			expect(parseArgs(argv)).toEqual({
				filePath: 'workflow.ts',
				options: { json: false, nodeTypes: [], engine },
			});
		});

		it.each([[['workflow.ts', '--engine', 'v3']], [['workflow.ts', '--engine']]])(
			'rejects %j',
			(argv) => {
				expect(() => parseArgs(argv)).toThrow(ExitError);
				expect(exitSpy).toHaveBeenCalledWith(1);
				expect(errorSpy).toHaveBeenCalledWith('--engine requires one of: v1, v2');
			},
		);
	});

	describe('validateCommand', () => {
		let dir: string;
		let filePath: string;

		beforeEach(() => {
			dir = mkdtempSync(path.join(tmpdir(), 'workflow-sdk-validate-'));
			filePath = path.join(dir, 'workflow.ts');
			const sdkEntry = path.resolve(__dirname, '../index.ts');
			writeFileSync(
				filePath,
				[
					`import { workflow, trigger, node } from ${JSON.stringify(sdkEntry)};`,
					"const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });",
					'const fetchOrders = node({',
					"\ttype: 'n8n-nodes-base.httpRequest',",
					'\tversion: 4.2,',
					"\tconfig: { name: 'Fetch Orders', retryOnFail: true, parameters: { url: 'https://example.com' } },",
					'});',
					"export default workflow('id', 'Orders').add(start).to(fetchOrders);",
				].join('\n'),
			);
		});

		afterEach(() => {
			rmSync(dir, { recursive: true, force: true });
		});

		async function run(argv: string[]): Promise<{ exitCode?: number; output: unknown }> {
			let exitCode: number | undefined;
			try {
				await validateCommand(argv);
			} catch (error) {
				if (!(error instanceof ExitError)) throw error;
				exitCode = error.code;
			}
			const output: unknown = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
			return { exitCode, output };
		}

		it('does not check engine v2 without the flag', async () => {
			const { output } = await run([filePath, '--json']);

			expect(JSON.stringify(output)).not.toContain('ENGINE_V2_');
		});

		it('reports engine v2 problems with --engine v2', async () => {
			const { exitCode, output } = await run([filePath, '--json', '--engine', 'v2']);

			expect(exitCode).toBe(1);
			expect(output).toMatchObject({
				ok: false,
				blocking: expect.arrayContaining([
					expect.objectContaining({
						code: 'ENGINE_V2_RETRY_ON_FAIL',
						nodeName: 'Fetch Orders',
						message: expect.stringMatching(
							/^`Fetch Orders`: engine v2 does not support Retry On Fail yet\./,
						),
					}),
				]),
			});
		});
	});
});
