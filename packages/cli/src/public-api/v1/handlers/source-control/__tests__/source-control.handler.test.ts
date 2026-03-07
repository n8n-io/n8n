import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import * as sourceControlHelper from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { EventService } from '@/events/event.service';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

// Mock middleware before requiring handler
const mockMiddleware = jest.fn(async (_req: unknown, _res: unknown, next: () => void) =>
	next(),
) as any;
jest.spyOn(middlewares, 'apiKeyHasScopeWithGlobalScopeFallback').mockReturnValue(mockMiddleware);

const mockSourceControlPreferencesService = {
	isSourceControlConnected: jest.fn().mockReturnValue(true),
};
const mockSourceControlService = {
	pushWorkfolder: jest.fn(),
	setGitUserDetails: jest.fn(),
	getStatus: jest.fn(),
	pullWorkfolder: jest.fn(),
};
const mockEventService = { emit: jest.fn() };

jest.spyOn(sourceControlHelper, 'isSourceControlLicensed').mockReturnValue(true);
jest
	.spyOn(sourceControlHelper, 'getTrackingInformationFromPostPushResult')
	.mockReturnValue({} as any);
jest.spyOn(sourceControlHelper, 'getTrackingInformationFromPullResult').mockReturnValue({} as any);

jest.spyOn(Container, 'get').mockImplementation((token: unknown) => {
	if (token === SourceControlPreferencesService) return mockSourceControlPreferencesService as any;
	if (token === SourceControlService) return mockSourceControlService as any;
	if (token === EventService) return mockEventService as any;
	return {} as any;
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = require('../source-control.handler');

describe('Source Control Public API Handler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(sourceControlHelper.isSourceControlLicensed as jest.Mock).mockReturnValue(true);
		mockSourceControlPreferencesService.isSourceControlConnected.mockReturnValue(true);

		jest.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === SourceControlPreferencesService)
				return mockSourceControlPreferencesService as any;
			if (token === SourceControlService) return mockSourceControlService as any;
			if (token === EventService) return mockEventService as any;
			return {} as any;
		});
	});

	const createMockRes = () => {
		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		} as unknown as express.Response;
		return res;
	};

	const createMockReq = (overrides: Record<string, unknown> = {}) =>
		({
			user: {
				id: 'user-1',
				firstName: 'Test',
				lastName: 'User',
				email: 'test@example.com',
			},
			body: {},
			query: {},
			...overrides,
		}) as unknown as AuthenticatedRequest;

	describe('push', () => {
		const getPushHandler = () => handler.push[1];

		it('should return 401 when not licensed', async () => {
			(sourceControlHelper.isSourceControlLicensed as jest.Mock).mockReturnValue(false);
			const res = createMockRes();
			const req = createMockReq();

			await getPushHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Source Control feature is not licensed' }),
			);
		});

		it('should return 400 when not connected', async () => {
			mockSourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);
			const res = createMockRes();
			const req = createMockReq();

			await getPushHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Source Control is not connected to a repository',
				}),
			);
		});

		it('should return 200 with files and commit on success', async () => {
			const mockResult = {
				statusCode: 200,
				statusResult: [{ file: 'test.json', status: 'modified' }],
				pushResult: {
					update: {
						hash: { to: 'abc123' },
						head: { local: 'main' },
					},
				},
			};
			mockSourceControlService.pushWorkfolder.mockResolvedValue(mockResult);
			mockSourceControlService.setGitUserDetails.mockResolvedValue(undefined);

			const res = createMockRes();
			const req = createMockReq({
				body: { fileNames: [] },
			});

			await getPushHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					files: mockResult.statusResult,
					commit: expect.objectContaining({ hash: 'abc123' }),
				}),
			);
		});

		it('should return 409 on conflict', async () => {
			const mockResult = {
				statusCode: 409,
				statusResult: [{ file: 'test.json', conflict: true }],
				pushResult: undefined,
			};
			mockSourceControlService.pushWorkfolder.mockResolvedValue(mockResult);
			mockSourceControlService.setGitUserDetails.mockResolvedValue(undefined);

			const res = createMockRes();
			const req = createMockReq({
				body: { fileNames: [] },
			});

			await getPushHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(409);
		});

		it('should return 400 on error', async () => {
			mockSourceControlService.pushWorkfolder.mockRejectedValue(new Error('Push failed'));
			mockSourceControlService.setGitUserDetails.mockResolvedValue(undefined);

			const res = createMockRes();
			const req = createMockReq({
				body: { fileNames: [] },
			});

			await getPushHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith('Push failed');
		});
	});

	describe('getStatus', () => {
		const getStatusHandler = () => handler.getStatus[1];

		it('should return 401 when not licensed', async () => {
			(sourceControlHelper.isSourceControlLicensed as jest.Mock).mockReturnValue(false);
			const res = createMockRes();
			const req = createMockReq();

			await getStatusHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
		});

		it('should return 400 when not connected', async () => {
			mockSourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);
			const res = createMockRes();
			const req = createMockReq();

			await getStatusHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});

		it('should return 200 with status array', async () => {
			const mockStatus = [{ file: 'workflow-1.json', type: 'workflow', status: 'modified' }];
			mockSourceControlService.getStatus.mockResolvedValue(mockStatus);

			const res = createMockRes();
			const req = createMockReq();

			await getStatusHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockStatus);
		});

		it('should pass query params correctly', async () => {
			mockSourceControlService.getStatus.mockResolvedValue([]);

			const res = createMockRes();
			const req = createMockReq({
				query: { direction: 'pull', verbose: 'true', preferLocalVersion: 'false' },
			});

			await getStatusHandler()(req, res);

			expect(mockSourceControlService.getStatus).toHaveBeenCalledWith(
				req.user,
				expect.objectContaining({
					direction: 'pull',
				}),
			);
		});

		it('should return 400 on error', async () => {
			mockSourceControlService.getStatus.mockRejectedValue(new Error('Status failed'));

			const res = createMockRes();
			const req = createMockReq();

			await getStatusHandler()(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith('Status failed');
		});
	});
});
