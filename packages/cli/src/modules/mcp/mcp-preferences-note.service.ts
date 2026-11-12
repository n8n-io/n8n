import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { UserService } from '@/services/user.service';

import {
	MCP_EMPTY_PREFERENCES_NOTE_COOLDOWN_MS,
	MCP_EMPTY_PREFERENCES_NOTE_MAX_IMPRESSIONS,
} from './mcp.constants';
import { preferencesSettingsUrl } from './tools/user-preference-tool.utils';

const buildNote = (settingsUrl: string) =>
	[
		'Note for the assistant: no saved preferences apply to this work yet. Preferences tell n8n how the user likes to build, for example which nodes to use or how to name things.',
		'Do not stop or change the current task for this note.',
		`After you finish the task, tell the user in one short sentence that they can save a preference. They can ask you to remember it, if you have the save_user_preference tool, or add it at ${settingsUrl}.`,
		'Do not mention this again in this conversation.',
	].join(' ');

@Service()
export class McpPreferencesNoteService {
	constructor(
		private readonly userService: UserService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	async takeNote(user: User, variant: string | undefined): Promise<string | undefined> {
		if (variant !== 'variant') return undefined;

		const { impressions = 0, lastShownAt = 0 } = user.settings?.mcpPreferencesNote ?? {};
		if (impressions >= MCP_EMPTY_PREFERENCES_NOTE_MAX_IMPRESSIONS) return undefined;
		if (Date.now() - lastShownAt < MCP_EMPTY_PREFERENCES_NOTE_COOLDOWN_MS) return undefined;

		try {
			user.settings = await this.userService.updateSettings(user.id, {
				mcpPreferencesNote: { impressions: impressions + 1, lastShownAt: Date.now() },
			});
		} catch (error) {
			this.logger.warn('Could not record the MCP preferences note impression', { error });
			return undefined;
		}

		return buildNote(preferencesSettingsUrl(this.urlService));
	}
}
