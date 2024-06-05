import { Post, RestController } from '@/decorators';
import { ValueSurveyRequest } from '@/requests';
import { UserService } from '@/services/user.service';

const MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED = 3;

@RestController('/value-survey')
export class ValueSurveyController {
	constructor(private readonly userService: UserService) {}

	@Post('/show')
	async valueSurveyShown(req: ValueSurveyRequest.ValueSurveyShown): Promise<void> {
		await this.userService.updateSettings(req.user.id, {
			valueSurveyLastShownAt: Date.now(),
			valueSurveyLastResponseState: 'waiting',
			valueSurveyIgnoredLastCount: 0,
		});
	}

	@Post('/respond')
	async valueSurveyResponded(req: ValueSurveyRequest.ValueSurveyShown): Promise<void> {
		await this.userService.updateSettings(req.user.id, {
			valueSurveyLastResponseState: 'done',
			valueSurveyIgnoredLastCount: 0,
		});
	}

	@Post('/ignore')
	async valueSurveyIgnored(req: ValueSurveyRequest.ValueSurveyShown): Promise<void> {
		const lastCount = req.user.settings?.valueSurveyIgnoredLastCount ?? 0;
		if (lastCount + 1 < MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED) {
			await this.userService.updateSettings(req.user.id, {
				valueSurveyIgnoredLastCount: lastCount + 1,
			});

			return;
		}

		await this.userService.updateSettings(req.user.id, {
			valueSurveyLastResponseState: 'done',
			valueSurveyIgnoredLastCount: 0,
		});
	}
}
