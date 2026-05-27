import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { resolveEventLogPath, type EventLogProcessType } from '../resolve-event-log-path';

jest.unmock('node:fs');

describe('resolveEventLogPath', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'resolve-event-log-path-'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe('path resolution', () => {
		it.each<{
			processType: EventLogProcessType;
			logFullPath: string;
			expectedBase: (dir: string) => string;
			expectedFile: (dir: string) => string;
		}>([
			{
				processType: 'main',
				logFullPath: '',
				expectedBase: (dir) => join(dir, 'n8nEventLog'),
				expectedFile: (dir) => join(dir, 'n8nEventLog.log'),
			},
			{
				processType: 'worker',
				logFullPath: '',
				expectedBase: (dir) => join(dir, 'n8nEventLog-worker'),
				expectedFile: (dir) => join(dir, 'n8nEventLog-worker.log'),
			},
			{
				processType: 'webhook-processor',
				logFullPath: '',
				expectedBase: (dir) => join(dir, 'n8nEventLog-webhook-processor'),
				expectedFile: (dir) => join(dir, 'n8nEventLog-webhook-processor.log'),
			},
			{
				processType: 'worker',
				logFullPath: '__OVERRIDE__',
				expectedBase: (dir) => join(dir, 'custom'),
				expectedFile: (dir) => join(dir, 'custom.log'),
			},
		])(
			'resolves processType=$processType, logFullPath=$logFullPath',
			({ processType, logFullPath, expectedBase, expectedFile }) => {
				const overridePath = join(tempDir, 'custom.log');
				const resolved = resolveEventLogPath({
					logFullPath: logFullPath === '__OVERRIDE__' ? overridePath : '',
					logBaseName: 'n8nEventLog',
					instanceDir: tempDir,
					processType,
				});

				expect(resolved.logFullBasePath).toBe(expectedBase(tempDir));
				expect(resolved.logFileName).toBe(expectedFile(tempDir));
			},
		);
	});

	describe('validation', () => {
		it.each([
			{ value: 'relative/path.log', match: /absolute/ },
			{ value: '/tmp/foo.txt', match: /\.log/ },
		])('rejects logFullPath=$value', ({ value, match }) => {
			expect(() =>
				resolveEventLogPath({
					logFullPath: value,
					logBaseName: 'n8nEventLog',
					instanceDir: tempDir,
					processType: 'worker',
				}),
			).toThrow(match);
		});
	});

	it('creates the parent directory when it does not exist', () => {
		const nestedPath = join(tempDir, 'deep', 'nested', 'path', 'events.log');
		expect(existsSync(dirname(nestedPath))).toBe(false);

		resolveEventLogPath({
			logFullPath: nestedPath,
			logBaseName: 'n8nEventLog',
			instanceDir: tempDir,
			processType: 'main',
		});

		expect(existsSync(dirname(nestedPath))).toBe(true);
	});
});
