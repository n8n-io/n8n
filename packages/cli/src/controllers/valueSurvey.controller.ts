import { Post, RestController } from '@/decorators';
import { ValueSurveyRequest } from '@/requests';
import { UserService } from '@/services/user.service';

@RestController('/value-survey')
export class ValueSurveyController {
	constructor(private readonly userService: UserService) {}

	@Post('/shown')
	async valueSurveyShown(req: ValueSurveyRequest.ValueSurveyShown): Promise<void> {
		await this.userService.updateSettings(req.user.id, {
			valueSurveyLastShownAt: Date.now(),
		});
	}

	@Post('/responded')
	async valueSurveyResponded(req: ValueSurveyRequest.ValueSurveyShown): Promise<void> {
		await this.userService.updateSettings(req.user.id, {
			valueSurveyIgnoredLastCount: 0,
		});
	}

	@Post('/ignored')
	async valueSurveyIgnored(req: ValueSurveyRequest.ValueSurveyShown): Promise<void> {
		const lastCount = req.user.settings?.valueSurveyIgnoredLastCount ?? 0;

		await this.userService.updateSettings(req.user.id, {
			valueSurveyIgnoredLastCount: lastCount + 1,
		});
	}
}
