import { BreakingChangeRule } from '@n8n/decorators';
import { BinaryDataConfig } from 'n8n-core';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class InMemoryBinaryDataRule implements IBreakingChangeInstanceRule {
	constructor(private readonly binaryDataConfig: BinaryDataConfig) {}

	id: string = 'in-memory-binary-data-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'In-memory binary data storage is removed',
			description:
				'The in-memory binary data storage mode (`default`) is removed. Before you update, set N8N_DEFAULT_BINARY_DATA_MODE to `filesystem`, `s3` or `database`.',
			category: BreakingChangeCategory.infrastructure,
			impact: 'behaviorChanges',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (this.binaryDataConfig.mode !== 'default') {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Binary data is stored in memory',
					description:
						'This instance stores binary data in memory (`default` mode), which is removed in the new version.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Switch the binary data mode',
					description:
						'Set N8N_DEFAULT_BINARY_DATA_MODE to `filesystem`, `s3` or `database` before updating, and make sure the chosen storage has enough capacity. `s3` needs a license that includes it and an S3 bucket configuration. With `filesystem` in queue mode or multi-main mode, every n8n process must read and write the same shared directory. `database` needs no extra setup.',
				},
			],
		};
	}
}
