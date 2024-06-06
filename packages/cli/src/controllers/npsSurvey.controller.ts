import { Post, RestController } from '@/decorators';
import { NpsSurveyRequest } from '@/requests';
import { UserService } from '@/services/user.service';

@RestController('/nps-survey')
export class NpsSurveyController {
	constructor(private readonly userService: UserService) {}

	@Post('/show')
	async npsSurveyShown(req: NpsSurveyRequest.NpsSurveyShown): Promise<void> {
		await this.userService.updateSettings(req.user.id, {
			npsSurveyLastShownAt: Date.now(),
			npsSurveyLastResponseState: 'waiting',
			npsSurveyIgnoredLastCount: 0,
		});
	}

	@Post('/respond')
	async npsSurveyResponded(req: NpsSurveyRequest.NpsSurveyResponded): Promise<void> {
		await this.userService.updateSettings(req.user.id, {
			npsSurveyLastResponseState: 'done',
			npsSurveyIgnoredLastCount: 0,
		});
	}

	@Post('/ignore')
	async npsSurveyIgnored(req: NpsSurveyRequest.NpsSurveyIgnored): Promise<void> {
		const lastCount = req.user.settings?.npsSurveyIgnoredLastCount ?? 0;
		await this.userService.updateSettings(req.user.id, {
			npsSurveyIgnoredLastCount: lastCount + 1,
		});
	}
}
