import { Logger } from '@n8n/backend-common';
import { TelemetryProxy, UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { preferencesSettingsUrl } from '@/services/ai-preference-write';
import { UserService } from '@/services/user.service';

const PREFERENCES_NOTE_MAX_IMPRESSIONS = 3;
const PREFERENCES_NOTE_COOLDOWN_MS = Time.days.toMilliseconds;

const buildNoteBlock = (settingsUrl: string) =>
	[
		'<preferences-note>',
		'No saved preferences apply to this work yet.',
		'Do not stop or change the current task for this note.',
		'After you finish the task, end your reply with this text, in the language of your reply. Keep the 💡 at its start, as the only exception to the rule against emojis:',
		`💡 **Tip:** You can ask me to remember how you like things done. I'll save it as a preference and follow it in our future conversations. You can also add preferences yourself in [Settings](${settingsUrl}).`,
		'Do not mention this again in this conversation.',
		'</preferences-note>',
	].join('\n');

@Service()
export class InstanceAiPreferencesNoteService {
	constructor(
		private readonly userService: UserService,
		private readonly urlService: UrlService,
		private readonly telemetry: TelemetryProxy,
		private readonly logger: Logger,
	) {}

	async takeNote(
		user: User,
		variant: string | undefined,
		threadId: string,
	): Promise<string | undefined> {
		if (variant !== 'control' && variant !== 'variant') return undefined;

		const { impressions = 0, lastShownAt = 0 } = user.settings?.assistantPreferencesNote ?? {};
		if (impressions >= PREFERENCES_NOTE_MAX_IMPRESSIONS) return undefined;
		if (Date.now() - lastShownAt < PREFERENCES_NOTE_COOLDOWN_MS) return undefined;

		try {
			user.settings = await this.userService.updateSettings(user.id, {
				assistantPreferencesNote: { impressions: impressions + 1, lastShownAt: Date.now() },
			});
		} catch (error) {
			this.logger.warn('Could not record the Assistant preferences note impression', { error });
			return undefined;
		}

		this.telemetry.track(TELEMETRY_EVENT.CONTEXT.ASSISTANT_PREFERENCES_NOTE_EXPOSED, {
			user_id: user.id,
			thread_id: threadId,
			variant,
			'$feature/147_assistant_empty_preferences_note': variant,
		});

		return variant === 'variant'
			? buildNoteBlock(preferencesSettingsUrl(this.urlService))
			: undefined;
	}
}
