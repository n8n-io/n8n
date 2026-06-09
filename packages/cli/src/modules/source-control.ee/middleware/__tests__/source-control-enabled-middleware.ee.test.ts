import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { SourceControlPreferencesService } from '../../source-control-preferences.service.ee';
import { sourceControlEnabledMiddleware } from '../source-control-enabled-middleware.ee';

describe('sourceControlEnabledMiddleware', () => {
	const next = jest.fn();
	const res = mock<Response>({
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
	});
	const sourceControlPreferencesService = mock<SourceControlPreferencesService>();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Container, 'get').mockReturnValue(sourceControlPreferencesService);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reloads preferences before rejecting when local state is disconnected', async () => {
		sourceControlPreferencesService.isSourceControlConnected
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);
		sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences.mockResolvedValue(
			undefined,
		);

		await sourceControlEnabledMiddleware(mock(), res, next);

		expect(
			sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences,
		).toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('keeps returning source_control_not_connected when preferences remain disconnected', async () => {
		sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);
		sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences.mockResolvedValue(
			undefined,
		);

		await sourceControlEnabledMiddleware(mock(), res, next);

		expect(res.status).toHaveBeenCalledWith(412);
		expect(res.json).toHaveBeenCalledWith({
			status: 'error',
			message: 'source_control_not_connected',
		});
		expect(next).not.toHaveBeenCalled();
	});
});
