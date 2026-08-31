import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { InMemoryBinaryDataRule } from '../in-memory-binary-data.rule';

describe('InMemoryBinaryDataRule', () => {
	const rule = new InMemoryBinaryDataRule();

	afterEach(() => {
		delete process.env.N8N_DEFAULT_BINARY_DATA_MODE;
		delete process.env.N8N_DEFAULT_BINARY_DATA_MODE_FILE;
	});

	describe('detect()', () => {
		it.each(['filesystem', 's3', 'database', undefined])(
			'should not be affected when env var is %s',
			async (mode) => {
				if (mode) process.env.N8N_DEFAULT_BINARY_DATA_MODE = mode;

				const result = await rule.detect();

				expect(result.isAffected).toBe(false);
				expect(result.instanceIssues).toHaveLength(0);
			},
		);

		it('should be affected when env var is set to removed default (in-memory) mode', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'default';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should be affected when the env value carries quotes or whitespace', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = ' "default" ';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
		});

		it('should be affected when the mode is set via the _FILE variant', async () => {
			const dir = mkdtempSync(join(tmpdir(), 'n8n-test-'));
			const filePath = join(dir, 'binary-data-mode');
			writeFileSync(filePath, 'default\n');
			process.env.N8N_DEFAULT_BINARY_DATA_MODE_FILE = filePath;

			try {
				const result = await rule.detect();

				expect(result.isAffected).toBe(true);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});
