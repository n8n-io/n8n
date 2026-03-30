import { Container } from '@n8n/di';
import type { Response } from 'express';

import type { EventService } from '@/events/event.service';
import * as sourceControlHelper from '@/modules/source-control.ee/source-control-helper.ee';
import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

// Mock middleware before requiring handler
const mockMiddleware = jest.fn(async (_req: unknown, _res: unknown, next: () => void) =>
	next(),
) as unknown as ReturnType<typeof middlewares.apiKeyHasScopeWithGlobalScopeFallback>;
jest.spyOn(middlewares, 'apiKeyHasScopeWithGlobalScopeFallback').mockReturnValue(mockMiddleware);

const handler = require('../source-control.handler');

describe('source-control handler', () => {
	let mockSourceControlService: jest.Mocked<SourceControlService>;
	let mockSourceControlPreferencesService: jest.Mocked<SourceControlPreferencesService>;
	let mockEventService: jest.Mocked<EventService>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		mockSourceControlService = {
			pullWorkfolder: jest.fn(),
			pushWorkfolder: jest.fn(),
		} as unknown as jest.Mocked<SourceControlService>;

		mockSourceControlPreferencesService = {
			isSourceControlConnected: jest.fn().mockReturnValue(true),
		} as unknown as jest.Mocked<SourceControlPreferencesService>;

		mockEventService = {
			emit: jest.fn(),
		} as unknown as jest.Mocked<EventService>;

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass.name === 'SourceControlService') return mockSourceControlService;
			if (serviceClass.name === 'SourceControlPreferencesService')
				return mockSourceControlPreferencesService;
			if (serviceClass.name === 'EventService') return mockEventService;
			return {} as unknown;
		});

		jest.spyOn(sourceControlHelper, 'isSourceControlLicensed').mockReturnValue(true);

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('pull', () => {
		it('should return 401 when source control is not licensed', async () => {
			jest.spyOn(sourceControlHelper, 'isSourceControlLicensed').mockReturnValue(false);

			const req = { user: { id: 'user1' }, body: { force: false } };

			await handler.pull[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'Error',
				message: 'Source Control feature is not licensed',
			});
		});

		it('should return 400 when source control is not connected', async () => {
			mockSourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);

			const req = { user: { id: 'user1' }, body: { force: false } };

			await handler.pull[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'Error',
				message: 'Source Control is not connected to a repository',
			});
		});

		it('should return 200 with status result on successful pull', async () => {
			const statusResult = [{ file: 'workflow.json', id: 'wf1', name: 'My Workflow' }];
			mockSourceControlService.pullWorkfolder.mockResolvedValue({
				statusCode: 200,
				statusResult,
			} as unknown as ReturnType<SourceControlService['pullWorkfolder']>);

			const req = { user: { id: 'user1' }, body: { force: false } };

			await handler.pull[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.send).toHaveBeenCalledWith(statusResult);
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'source-control-user-pulled-api',
				expect.objectContaining({ forced: false }),
			);
		});

		it('should return 409 when pull detects conflicts', async () => {
			const statusResult = [{ file: 'workflow.json', conflict: true }];
			mockSourceControlService.pullWorkfolder.mockResolvedValue({
				statusCode: 409,
				statusResult,
			} as unknown as ReturnType<SourceControlService['pullWorkfolder']>);

			const req = { user: { id: 'user1' }, body: { force: false } };

			await handler.pull[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(409);
			expect(mockResponse.send).toHaveBeenCalledWith(statusResult);
		});

		it('should return 400 on unexpected error', async () => {
			mockSourceControlService.pullWorkfolder.mockRejectedValue(new Error('Git error'));

			const req = { user: { id: 'user1' }, body: { force: false } };

			await handler.pull[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.send).toHaveBeenCalledWith('Git error');
		});
	});

	describe('push', () => {
		const validBody = { force: false, commitMessage: 'Test commit', fileNames: [] };

		it('should return 401 when source control is not licensed', async () => {
			jest.spyOn(sourceControlHelper, 'isSourceControlLicensed').mockReturnValue(false);

			const req = { user: { id: 'user1' }, body: validBody };

			await handler.push[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'Error',
				message: 'Source Control feature is not licensed',
			});
		});

		it('should return 400 when source control is not connected', async () => {
			mockSourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);

			const req = { user: { id: 'user1' }, body: validBody };

			await handler.push[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'Error',
				message: 'Source Control is not connected to a repository',
			});
		});

		it('should return 200 with status result on successful push', async () => {
			const statusResult = [{ file: 'workflow.json', id: 'wf1', name: 'My Workflow', pushed: true }];
			mockSourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 200,
				statusResult,
				pushResult: undefined,
			});

			const req = { user: { id: 'user1' }, body: validBody };

			await handler.push[1](req, mockResponse);

			expect(mockSourceControlService.pushWorkfolder).toHaveBeenCalledWith(
				req.user,
				expect.objectContaining({ force: false, commitMessage: 'Test commit' }),
			);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.send).toHaveBeenCalledWith(statusResult);
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'source-control-user-pushed-api',
				expect.objectContaining({ forced: false }),
			);
		});

		it('should return 409 when push detects conflicts', async () => {
			const statusResult = [{ file: 'workflow.json', conflict: true }];
			mockSourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 409,
				statusResult,
				pushResult: undefined,
			});

			const req = { user: { id: 'user1' }, body: validBody };

			await handler.push[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(409);
			expect(mockResponse.send).toHaveBeenCalledWith(statusResult);
			expect(mockEventService.emit).not.toHaveBeenCalled();
		});

		it('should return 400 on unexpected error', async () => {
			mockSourceControlService.pushWorkfolder.mockRejectedValue(
				new Error('Cannot push onto read-only branch.'),
			);

			const req = { user: { id: 'user1' }, body: validBody };

			await handler.push[1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.send).toHaveBeenCalledWith('Cannot push onto read-only branch.');
		});

		it('should not emit telemetry event when push returns 409', async () => {
			mockSourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 409,
				statusResult: [],
				pushResult: undefined,
			});

			const req = { user: { id: 'user1' }, body: { ...validBody, force: true } };

			await handler.push[1](req, mockResponse);

			expect(mockEventService.emit).not.toHaveBeenCalled();
		});
	});
});
