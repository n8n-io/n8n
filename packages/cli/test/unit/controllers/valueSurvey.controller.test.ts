import { ValueSurveyController } from '@/controllers/valueSurvey.controller';
import type { ValueSurveyRequest } from '@/requests';
import type { UserService } from '@/services/user.service';
import { mock } from 'jest-mock-extended';

const NOW = 1717607016208;
jest.useFakeTimers({
	now: NOW,
});

describe('ValueSurveyController', () => {
	const userService = mock<UserService>();
	const controller = new ValueSurveyController(userService);

	describe('valueSurveyShown', () => {
		it('updates user settings, reseting to waiting state', async () => {
			const req = mock<ValueSurveyRequest.ValueSurveyShown>();
			req.user.id = '1';

			await controller.valueSurveyShown(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				valueSurveyIgnoredLastCount: 0,
				valueSurveyLastResponseState: 'waiting',
				valueSurveyLastShownAt: 1717607016208,
			});
		});
	});

	describe('valueSurveyResponded', () => {
		it('updates user settings, setting response state to done', async () => {
			const req = mock<ValueSurveyRequest.ValueSurveyResponded>();
			req.user.id = '1';

			await controller.valueSurveyResponded(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				valueSurveyIgnoredLastCount: 0,
				valueSurveyLastResponseState: 'done',
			});
		});
	});

	describe('valueSurveyIgnored', () => {
		it('updates user settings, incrementing ignore count', async () => {
			const req = mock<ValueSurveyRequest.ValueSurveyIgnored>();
			req.user.id = '1';
			req.user.settings = {
				valueSurveyIgnoredLastCount: 1,
			};

			await controller.valueSurveyIgnored(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				valueSurveyIgnoredLastCount: 2,
			});
		});

		it('updates user settings, incrementing ignore count from 0, if not set', async () => {
			const req = mock<ValueSurveyRequest.ValueSurveyIgnored>();
			req.user.id = '1';
			req.user.settings = {};

			await controller.valueSurveyIgnored(req);

			expect(userService.updateSettings).toHaveBeenCalledWith('1', {
				valueSurveyIgnoredLastCount: 2,
			});
		});
	});
});
