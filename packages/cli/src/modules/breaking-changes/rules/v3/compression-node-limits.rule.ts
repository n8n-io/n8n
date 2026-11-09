import { BreakingChangeRule } from '@n8n/decorators';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class CompressionNodeLimitsRule implements IBreakingChangeInstanceRule {
	id: string = 'compression-node-limits-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Compression node limits are lowered',
			description:
				'The default maximum decompressed size goes down from 2 GiB to 256 MiB, and the default maximum number of ZIP entries goes down from 5000 to 1000. Only the defaults change. You can set the limits to keep the current values.',
			category: BreakingChangeCategory.environment,
			impact: 'executionsMightFail',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const instanceIssues: InstanceDetectionReport['instanceIssues'] = [];

		if (process.env.N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES === undefined) {
			instanceIssues.push({
				title: 'Instance relies on the current default decompressed size limit',
				description:
					'N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES is not set, so this instance uses the default of 2 GiB. After the update, the default is 256 MiB. If you do not set the variable, the Compression node fails on archives that decompress to more than that.',
				level: 'info',
			});
		}

		if (process.env.N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES === undefined) {
			instanceIssues.push({
				title: 'Instance relies on the current default ZIP entries limit',
				description:
					'N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES is not set, so this instance uses the default of 5000 entries. After the update, the default is 1000 entries. If you do not set the variable, the Compression node fails on ZIP archives with more entries than that.',
				level: 'info',
			});
		}

		if (instanceIssues.length === 0) {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues,
			recommendations: [
				{
					action: 'Set the compression limits if your workflows handle large archives',
					description:
						'The new defaults apply only when these variables are not set. If your workflows decompress more than 256 MiB, or ZIP archives with more than 1000 entries, set N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES and N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES to the limits you need. Otherwise, you do not need to do anything.',
				},
			],
		};
	}
}
