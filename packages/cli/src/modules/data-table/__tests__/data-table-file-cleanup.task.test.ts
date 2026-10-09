import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { promises as fs } from 'fs';
import path from 'path';
import type { Mock } from 'vitest';

import { DataTableFileCleanupService } from '../data-table-file-cleanup.service';
import { DataTableFileCleanupTask } from '../data-table-file-cleanup.task';

vi.mock('fs', async () => ({
	promises: {
		unlink: vi.fn(),
		readdir: vi.fn(),
		stat: vi.fn(),
	},
}));

describe('DataTableFileCleanupTask', () => {
	const uploadDir = '/mock/n8n/dataTableUploads';

	const globalConfig = {
		dataTable: {
			cleanupIntervalMs: 60 * 1000,
			fileMaxAgeMs: 2 * 60 * 1000,
			uploadDir,
		},
	} as GlobalConfig;

	const task = new DataTableFileCleanupTask(
		globalConfig,
		new DataTableFileCleanupService(globalConfig, mockLogger()),
	);

	it('should run on every main at the configured interval', () => {
		expect(task.name).toBe('data-table-file-cleanup');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 60 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'instance', instanceTypes: ['main'] });
	});

	it('should delete the old upload files of this process', async () => {
		(fs.readdir as Mock).mockResolvedValue(['old-file.csv']);
		(fs.stat as Mock).mockResolvedValue({ mtimeMs: Date.now() - 3 * 60 * 1000 });

		await task.run(new AbortController().signal);

		expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, 'old-file.csv'));
	});
});
