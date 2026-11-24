import { InMemoryFilesystem } from './test-utils';
import {
	getToolResultRunDirectory,
	isToolResultPath,
	reconcileToolResultRuns,
	storeToolResult,
} from '../../workspace/tool-result-storage';

const TOOL_RESULT_RUNS_DIRECTORY = 'tool-results/runs';

async function writeRunFile(filesystem: InMemoryFilesystem, runId: string): Promise<void> {
	await filesystem.writeFile(`${getToolResultRunDirectory(runId)}/payload.json`, '{}', {
		recursive: true,
	});
}

describe('tool result storage', () => {
	it('stores results only under the hashed run and rejects thread-scoped paths', async () => {
		const filesystem = new InMemoryFilesystem();

		const path = await storeToolResult(
			filesystem,
			{ runId: 'run-1', toolCallId: 'tool-call-1' },
			'result',
			'{"ok":true}',
		);

		expect(path).toMatch(
			/^tool-results\/runs\/[A-Za-z0-9_-]{43}\/[A-Za-z0-9_-]{43}\.result\.json$/,
		);
		expect(isToolResultPath(path)).toBe(true);
		expect(
			isToolResultPath(
				`tool-results/threads/${'a'.repeat(43)}/${'b'.repeat(43)}/${'c'.repeat(43)}.result.json`,
			),
		).toBe(false);
		await expect(filesystem.readFile(path, { encoding: 'utf8' })).resolves.toBe('{"ok":true}');
	});

	it('reconciles only old unprotected run directories', async () => {
		const filesystem = new InMemoryFilesystem();
		const originalStat = filesystem.stat.bind(filesystem);
		for (const runId of ['active', 'suspended', 'recent', 'old']) {
			await writeRunFile(filesystem, runId);
		}
		await filesystem.writeFile(`${TOOL_RESULT_RUNS_DIRECTORY}/ordinary.txt`, 'keep');
		vi.spyOn(filesystem, 'stat').mockImplementation(async (path, options) => {
			const stat = await originalStat(path, options);
			return path === getToolResultRunDirectory('recent')
				? { ...stat, modifiedAt: new Date() }
				: stat;
		});

		await reconcileToolResultRuns(filesystem, ['active', 'suspended'], 60_000);

		await expect(filesystem.exists(getToolResultRunDirectory('active'))).resolves.toBe(true);
		await expect(filesystem.exists(getToolResultRunDirectory('suspended'))).resolves.toBe(true);
		await expect(filesystem.exists(getToolResultRunDirectory('recent'))).resolves.toBe(true);
		await expect(filesystem.exists(getToolResultRunDirectory('old'))).resolves.toBe(false);
		await expect(filesystem.exists(`${TOOL_RESULT_RUNS_DIRECTORY}/ordinary.txt`)).resolves.toBe(
			true,
		);
	});

	it('examines at most 100 unprotected orphan candidates per pass', async () => {
		const filesystem = new InMemoryFilesystem();
		const runIds = Array.from({ length: 101 }, (_, index) => `old-run-${index}`);
		await writeRunFile(filesystem, 'protected');
		for (const runId of runIds) await writeRunFile(filesystem, runId);

		await reconcileToolResultRuns(filesystem, ['protected'], 60_000);

		await expect(filesystem.exists(getToolResultRunDirectory(runIds[99]))).resolves.toBe(false);
		await expect(filesystem.exists(getToolResultRunDirectory(runIds[100]))).resolves.toBe(true);
	});
});
