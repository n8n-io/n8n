import { NpsSurveyController } from '@/controllers/npsSurvey.controller';
import type { NpsSurveyRequest } from '@/requests';
import type { UserService } from '@/services/user.service';
import { mock } from 'jest-mock-extended';

const NOW = 1717607016208;
jest.useFakeTimers({
	now: NOW,
});

describe('NpsSurveyController', () => {
	const userService = mock<UserService>();
	const controller = new NpsSurveyController(userService);

	describe('npsSurveyShown', () => {
		it('updates user settings, reseting to waiting state', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyShown>();
			req.user.id = '1';

			await controller.npsSurveyShown(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				npsSurveyIgnoredLastCount: 0,
				npsSurveyLastResponseState: 'waiting',
				npsSurveyLastShownAt: 1717607016208,
			});
		});
	});

	describe('npsSurveyResponded', () => {
		it('updates user settings, setting response state to done', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyResponded>();
			req.user.id = '1';

			await controller.npsSurveyResponded(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				npsSurveyIgnoredLastCount: 0,
				npsSurveyLastResponseState: 'done',
			});
		});
	});

	describe('npsSurveyIgnored', () => {
		it('updates user settings, incrementing ignore count', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyIgnored>();
			req.user.id = '1';
			req.user.settings = {
				npsSurveyIgnoredLastCount: 1,
			};

			await controller.npsSurveyIgnored(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				npsSurveyIgnoredLastCount: 2,
			});
		});

		it('updates user settings, incrementing ignore count from 0, if not set', async () => {
			const req = mock<NpsSurveyRequest.NpsSurveyIgnored>();
			req.user.id = '1';
			req.user.settings = {};

			await controller.npsSurveyIgnored(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				npsSurveyIgnoredLastCount: 2,
			});
		});
	});
});
