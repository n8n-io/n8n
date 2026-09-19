import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isInMemoryModeConfigured } from '../binary-data.config';

describe('isInMemoryModeConfigured', () => {
	afterEach(() => {
		delete process.env.N8N_DEFAULT_BINARY_DATA_MODE;
		delete process.env.N8N_DEFAULT_BINARY_DATA_MODE_FILE;
	});

	it('should return false when the env var is unset', () => {
		expect(isInMemoryModeConfigured()).toBe(false);
	});

	it('should return false for a valid mode', () => {
		process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'filesystem';

		expect(isInMemoryModeConfigured()).toBe(false);
	});

	it('should return true when set to the removed in-memory mode', () => {
		process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'default';

		expect(isInMemoryModeConfigured()).toBe(true);
	});

	it('should return true when the value carries quotes or whitespace', () => {
		process.env.N8N_DEFAULT_BINARY_DATA_MODE = ' "default" ';

		expect(isInMemoryModeConfigured()).toBe(true);
	});

	it('should return true when set via the _FILE variant', () => {
		const dir = mkdtempSync(join(tmpdir(), 'n8n-test-'));
		const filePath = join(dir, 'binary-data-mode');
		writeFileSync(filePath, 'default\n');
		process.env.N8N_DEFAULT_BINARY_DATA_MODE_FILE = filePath;

		try {
			expect(isInMemoryModeConfigured()).toBe(true);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
