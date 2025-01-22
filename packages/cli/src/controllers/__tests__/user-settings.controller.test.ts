import { mock } from 'jest-mock-extended';
import type { NpsSurveyState } from 'n8n-workflow';

import { UserSettingsController } from '@/controllers/user-settings.controller';
import type { NpsSurveyRequest } from '@/requests';
import type { UserService } from '@/services/user.service';

const NOW = 1717607016208;
jest.useFakeTimers({
	now: NOW,
});

describe('UserSettingsController', () => {
	const userService = mock<UserService>();
	const controller = new UserSettingsController(userService);

	describe('NPS Survey', () => {
		test.each([
			[
				'updates user settings, setting response state to done',
				{
					responded: true,
					lastShownAt: 1717607016208,
				},
				[],
			],
			[
				'updates user settings, setting response state to done, ignoring other keys like waitForResponse',
				{
					responded: true,
					lastShownAt: 1717607016208,
					waitingForResponse: true,
				},
				['waitingForResponse'],
			],
			[
				'updates user settings, setting response state to done, ignoring other keys like ignoredCount',
				{
					responded: true,
					lastShownAt: 1717607016208,
					ignoredCount: 1,
				},
				['ignoredCount'],
			],
			[
				'updates user settings, setting response state to done, ignoring other unknown keys',
				{
					responded: true,
					lastShownAt: 1717607016208,
					x: 1,
				},
				['x'],
			],
			[
				'updates user settings, updating ignore count',
				{
					waitingForResponse: true,
					lastShownAt: 1717607016208,
					ignoredCount: 1,
				},
				[],
			],
			[
				'updates user settings, resetting to waiting state',
				{
					waitingForResponse: true,
					ignoredCount: 0,
					lastShownAt: 1717607016208,
				},
				[],
			],
			[
				'updates user settings, updating ignore count, ignoring unknown keys',
				{
					waitingForResponse: true,
					lastShownAt: 1717607016208,
					ignoredCount: 1,
					x: 1,
				},
				['x'],
			],
		])('%s', async (_, toUpdate, toIgnore: string[] | undefined) => {
			const req = mock<NpsSurveyRequest.NpsSurveyUpdate>();
			req.user.id = '1';
			req.body = toUpdate;
			await controller.updateNpsSurvey(req);

			const npsSurvey = Object.keys(toUpdate).reduce(
				(accu, key) => {
					if ((toIgnore ?? []).includes(key)) {
						return accu;
					}
					accu[key] = (toUpdate as Record<string, unknown>)[key];
					return accu;
				},
				{} as Record<string, unknown>,
			);
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

		test.each([
			['is missing', {}],
			['is undefined', undefined],
			['is responded but missing lastShownAt', { responded: true }],
			['is waitingForResponse but missing lastShownAt', { waitingForResponse: true }],
			[
				'is waitingForResponse but missing ignoredCount',
				{ lastShownAt: 123, waitingForResponse: true },
			],
		])('throws error when request payload is %s', async (_, payload) => {
			const req = mock<NpsSurveyRequest.NpsSurveyUpdate>();
			req.user.id = '1';
			req.body = payload;

			await expect(controller.updateNpsSurvey(req)).rejects.toThrowError();
		});
	});
});
