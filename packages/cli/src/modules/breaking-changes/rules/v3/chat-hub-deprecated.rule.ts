import { SettingsRepository } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

const CHAT_ENABLED_KEY = 'chat.access.enabled';

@BreakingChangeRule({ version: 'v3' })
export class ChatHubDeprecatedRule implements IBreakingChangeInstanceRule {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	id: string = 'chat-hub-deprecated-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Chat hub is deprecated and off by default',
			description:
				'In v3, the chat hub module is off by default and the Chat section disappears from the UI. You can turn it on again with the N8N_ENABLED_MODULES environment variable, but the feature is removed in v4.',
			category: BreakingChangeCategory.instance,
			impact: 'capabilityRemoved',
			documentationUrl: 'https://docs.n8n.io/changelog/v30-breaking-changes',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// The chat hub deprecation migration recorded prior usage in this setting:
		// it stored `true` for every install that already had chat sessions, and
		// `false` for the rest. A `true` value therefore means this instance used
		// chat hub, or an admin turned it on afterwards.
		const setting = await this.settingsRepository.findByKey(CHAT_ENABLED_KEY);

		if (setting?.value !== 'true') {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'This instance uses chat hub',
					description:
						'Chat hub is on for this instance. After the update to v3, the chat hub module is off by default, so users lose access to the Chat section and to their chat sessions and agents. The chat data stays in the database.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Turn chat hub on again if you still need it',
					description:
						'Add `chat-hub` to the N8N_ENABLED_MODULES environment variable to keep chat hub available in v3. The variable holds a comma-separated list, so keep the modules that you already enable. This is a temporary measure: v4 removes the feature.',
				},
			],
		};
	}
}
