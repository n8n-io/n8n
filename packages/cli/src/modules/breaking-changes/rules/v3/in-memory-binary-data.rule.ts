import { BreakingChangeRule } from '@n8n/decorators';
import { BinaryDataConfig } from 'n8n-core';

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
				'The in-memory binary data storage mode (`default`) is removed. Instances using it must switch to `filesystem`, `s3`, or `database`.',
			category: BreakingChangeCategory.infrastructure,
			severity: 'medium',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (this.binaryDataConfig.mode !== 'default') {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
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
						'Set N8N_DEFAULT_BINARY_DATA_MODE to `filesystem`, `s3`, or `database` before updating, and ensure the chosen storage has adequate capacity.',
				},
			],
		};
	}
}
