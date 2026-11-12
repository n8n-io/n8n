import { Logger } from '@n8n/backend-common';
import { PostHogClient, UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { UserService } from '@/services/user.service';

import {
	MCP_EMPTY_PREFERENCES_NOTE_FLAG,
	MCP_EMPTY_PREFERENCES_NOTE_MAX_IMPRESSIONS,
	MCP_EMPTY_PREFERENCES_NOTE_VARIANT,
} from './mcp.constants';
import { preferencesSettingsUrl } from './tools/user-preference-tool.utils';

export type PreferencesNoteDecision = {
	variant: string;
	note?: string;
};

const buildNote = (settingsUrl: string) =>
	[
		'Note for the assistant: this user has not saved any preferences yet. Preferences tell n8n how the user likes to build, for example which nodes to use or how to name things.',
		'Do not stop or change the current task for this note.',
		`After you finish the task, tell the user in one short sentence that they can save a preference. They can ask you to remember it, if you have the save_user_preference tool, or add it at ${settingsUrl}.`,
		'Do not mention this again in this conversation.',
	].join(' ');

@Service()
export class McpPreferencesNoteService {
	constructor(
		private readonly postHogClient: PostHogClient,
		private readonly userService: UserService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	async decideForEmptyResult(user: User): Promise<PreferencesNoteDecision> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		const variant = String(flags[MCP_EMPTY_PREFERENCES_NOTE_FLAG] ?? 'unassigned');
		if (variant !== MCP_EMPTY_PREFERENCES_NOTE_VARIANT) return { variant };

		const impressions = user.settings?.mcpPreferencesNote?.impressions ?? 0;
		if (impressions >= MCP_EMPTY_PREFERENCES_NOTE_MAX_IMPRESSIONS) return { variant };

		try {
			user.settings = await this.userService.updateSettings(user.id, {
				mcpPreferencesNote: { impressions: impressions + 1 },
			});
		} catch (error) {
			this.logger.warn('Could not record the MCP preferences note impression', { error });
			return { variant };
		}

		return { variant, note: buildNote(preferencesSettingsUrl(this.urlService)) };
	}
}
