import { BreakingChangeRule } from '@n8n/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class WorkflowImportUrlRemovedRule implements IBreakingChangeInstanceRule {
	id: string = 'workflow-import-url-removed-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Workflow import from URL is removed',
			description: 'The "Import from URL" option in the editor is removed.',
			category: BreakingChangeCategory.instance,
			severity: 'low',
		};
	}

	// Usage of an editor feature is not detectable server-side, so this rule
	// always reports informationally, like tunnel-option-v2.
	async detect(): Promise<InstanceDetectionReport> {
		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Import from URL removed from the editor',
					description:
						'The editor no longer offers importing a workflow from a URL. If you share workflows as URLs, this will stop working after the update.',
					level: 'info',
				},
			],
			recommendations: [
				{
					action: 'Share workflows as files instead',
					description:
						'Download workflows as JSON files and use the editor\'s "Import from File" option, or exchange workflows via source control environments.',
				},
			],
		};
	}
}
