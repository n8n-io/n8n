import type { InstanceSettings } from 'n8n-core';
import { existsSync } from 'node:fs';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { StoragePathRenameRule } from '../storage-path-rename.rule';

vi.mock('node:fs', () => ({ existsSync: vi.fn() }));

describe('StoragePathRenameRule', () => {
	const instanceSettings = mock<InstanceSettings>({ n8nFolder: '/home/n8n/.n8n' });
	const rule = new StoragePathRenameRule(instanceSettings);
	const exists = existsSync as Mock;

	beforeEach(() => {
		process.env = {};
		exists.mockReset();
		Object.assign(instanceSettings, { fsStorageMigrated: false });
	});

	it('should not be affected when already migrated', async () => {
		Object.assign(instanceSettings, { fsStorageMigrated: true });

		expect((await rule.detect()).isAffected).toBe(false);
		expect(exists).not.toHaveBeenCalled();
	});

	it.each(['N8N_STORAGE_PATH', 'N8N_BINARY_DATA_STORAGE_PATH'])(
		'should not be affected when %s is set',
		async (envVar) => {
			process.env[envVar] = '/custom/path';

			expect((await rule.detect()).isAffected).toBe(false);
		},
	);

	it('should not be affected when the old directory does not exist', async () => {
		exists.mockReturnValue(false);

		expect((await rule.detect()).isAffected).toBe(false);
	});

	it('should warn when the old directory exists', async () => {
		exists.mockImplementation((p: string) => p.endsWith('binaryData'));

		const result = await rule.detect();

		expect(result.isAffected).toBe(true);
		expect(result.instanceIssues[0].level).toBe('warning');
		expect(result.recommendations[0].action).toBe('Update volume mounts');
	});

	it('should error when both directories exist', async () => {
		exists.mockReturnValue(true);

		const result = await rule.detect();

		expect(result.isAffected).toBe(true);
		expect(result.instanceIssues[0].level).toBe('error');
		expect(result.recommendations[0].action).toBe('Resolve the directory conflict');
	});
});
