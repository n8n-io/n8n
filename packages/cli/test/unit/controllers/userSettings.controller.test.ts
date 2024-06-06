import { UserSettingsController } from '@/controllers/userSettings.controller';
import type { NpsSurveyRequest } from '@/requests';
import type { UserService } from '@/services/user.service';
import { mock } from 'jest-mock-extended';
import type { NpsSurveyState } from 'n8n-workflow';

const NOW = 1717607016208;
jest.useFakeTimers({
	now: NOW,
});

describe('UserSettingsController', () => {
	const userService = mock<UserService>();
	const controller = new UserSettingsController(userService);

	describe('NPS Survey', () => {
		it('updates user settings, reseting to waiting state', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyUpdate>();
			req.user.id = '1';

			const npsSurvey: NpsSurveyState = {
				waitingForResponse: true,
				ignoredCount: 0,
				lastShownAt: 1717607016208,
			};
			req.body = npsSurvey;

			await controller.updateNpsSurvey(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', { npsSurvey });
		});

		it('updates user settings, setting response state to done', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyUpdate>();
			req.user.id = '1';

			const npsSurvey: NpsSurveyState = {
				responded: true,
				lastShownAt: 1717607016208,
			};
			req.body = npsSurvey;

			await controller.updateNpsSurvey(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', { npsSurvey });
		});

		it('updates user settings, updating ignore count', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyUpdate>();
			req.user.id = '1';

			const npsSurvey: NpsSurveyState = {
				waitingForResponse: true,
				lastShownAt: 1717607016208,
				ignoredCount: 1,
			};
			req.body = npsSurvey;

			await controller.updateNpsSurvey(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', { npsSurvey });
		});

		// todo add more type validations
	});
});
