import { BreakingChangeRule } from '@n8n/decorators';

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
				'The default maximum decompressed size is reduced from 2 GiB to 256 MiB and the default maximum number of ZIP entries from 5000 to 1000. Compression nodes handling archives beyond the new limits will fail.',
			category: BreakingChangeCategory.environment,
			severity: 'low',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const instanceIssues: InstanceDetectionReport['instanceIssues'] = [];

		if (process.env.N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES === undefined) {
			instanceIssues.push({
				title: 'Instance relies on the current default decompressed size limit',
				description:
					'N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES is not set, so this instance uses the default of 2 GiB. After the update, decompressing more than 256 MiB will fail.',
				level: 'info',
			});
		}

		if (process.env.N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES === undefined) {
			instanceIssues.push({
				title: 'Instance relies on the current default ZIP entries limit',
				description:
					'N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES is not set, so this instance uses the default of 5000 entries. After the update, ZIP archives with more than 1000 entries will fail to decompress.',
				level: 'info',
			});
		}

		if (instanceIssues.length === 0) {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		return {
			isAffected: true,
			instanceIssues,
			recommendations: [
				{
					action: 'Set the compression limits explicitly',
					description:
						'If your workflows decompress large archives, set N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES and N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES to keep the current limits.',
				},
			],
		};
	}
}
