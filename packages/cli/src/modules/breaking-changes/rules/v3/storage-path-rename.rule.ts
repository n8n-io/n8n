import { BreakingChangeRule } from '@n8n/decorators';
import { InstanceSettings } from 'n8n-core';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class StoragePathRenameRule implements IBreakingChangeInstanceRule {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	id: string = 'storage-path-rename-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Filesystem storage directory is renamed',
			description:
				'The filesystem storage directory `~/.n8n/binaryData` is renamed to `~/.n8n/storage` on the first start of the new version. `N8N_MIGRATE_FS_STORAGE_PATH` is removed.',
			category: BreakingChangeCategory.infrastructure,
			severity: 'medium',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const notAffected = { isAffected: false, instanceIssues: [], recommendations: [] };

		if (this.instanceSettings.fsStorageMigrated) return notAffected;
		if (process.env.N8N_STORAGE_PATH || process.env.N8N_BINARY_DATA_STORAGE_PATH) {
			return notAffected;
		}

		const { n8nFolder } = this.instanceSettings;
		const oldPath = path.join(n8nFolder, 'binaryData');
		const newPath = path.join(n8nFolder, 'storage');

		if (!existsSync(oldPath)) return notAffected;

		if (existsSync(newPath)) {
			return {
				isAffected: true,
				instanceIssues: [
					{
						title: 'Both storage directories exist',
						description: `Both "${oldPath}" and "${newPath}" exist. The new version cannot rename "${oldPath}" and fails to start.`,
						level: 'error',
					},
				],
				recommendations: [
					{
						action: 'Resolve the directory conflict',
						description: `Move or remove "${newPath}" before you update, or set N8N_STORAGE_PATH to the directory you want to use.`,
					},
				],
			};
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Storage directory will be renamed',
					description: `"${oldPath}" is renamed to "${newPath}" on the first start of the new version.`,
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Update volume mounts',
					description: `If you mount a volume at "${oldPath}", mount it at "${newPath}" instead, or set N8N_STORAGE_PATH to the old path to keep it.`,
				},
			],
		};
	}
}
