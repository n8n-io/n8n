import { Patch, RestController } from '@/decorators';
import { NpsSurveyRequest } from '@/requests';
import { UserService } from '@/services/user.service';
import { ApplicationError, type NpsSurveyState } from 'n8n-workflow';

function getNpsSurveyState(state: unknown): NpsSurveyState | undefined {
	if (typeof state !== 'object' || state === null) {
		return;
	}
	if (!('lastShownAt' in state) || typeof state.lastShownAt !== 'number') {
		return;
	}
	if ('responded' in state && state.responded === true) {
		return {
			responded: true,
			lastShownAt: state.lastShownAt,
		};
	}

	if (
		'waitingForResponse' in state &&
		state.waitingForResponse === true &&
		'ignoredCount' in state &&
		typeof state.ignoredCount === 'number'
	) {
		return {
			waitingForResponse: true,
			ignoredCount: state.ignoredCount,
			lastShownAt: state.lastShownAt,
		};
	}

	return;
}

@RestController('/user-settings')
export class UserSettingsController {
	constructor(private readonly userService: UserService) {}

	@Patch('/nps-survey')
	async updateNpsSurvey(req: NpsSurveyRequest.NpsSurveyUpdate): Promise<void> {
		const state = getNpsSurveyState(req.body);
		if (!state) {
			throw new ApplicationError('Invalid nps survey state structure');
		}

		await this.userService.updateSettings(req.user.id, {
			npsSurvey: state,
		});
	}
}
