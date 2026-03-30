import type { SourceControlledFile } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { EventService } from '@/events/event.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

// Mock middleware before requiring handler
const mockMiddleware = jest.fn(async (_req: unknown, _res: unknown, next: () => void) =>
	next(),
) as any;
jest.spyOn(middlewares, 'apiKeyHasScopeWithGlobalScopeFallback').mockReturnValue(mockMiddleware);

const handler = require('../source-control.handler');

const now = new Date().toISOString();

const makeFile = (overrides: Partial<SourceControlledFile> = {}): SourceControlledFile => ({
	file: 'workflow-1.json',
	id: 'wf-1',
	name: 'Workflow 1',
	type: 'workflow',
	status: 'modified',
	location: 'local',
	conflict: false,
	updatedAt: now,
	...overrides,
});

describe('source-control public API handler', () => {
	let sourceControlService: jest.Mocked<SourceControlService>;
	let sourceControlPreferencesService: jest.Mocked<SourceControlPreferencesService>;
	let eventService: jest.Mocked<EventService>;
	let res: Partial<Response>;

	beforeEach(() => {
		sourceControlService = mockInstance(SourceControlService);
		sourceControlPreferencesService = mockInstance(SourceControlPreferencesService);
		eventService = mockInstance(EventService);

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === SourceControlService) return sourceControlService as any;
			if (serviceClass === SourceControlPreferencesService)
				return sourceControlPreferencesService as any;
			if (serviceClass === EventService) return eventService as any;
			return {} as any;
		});

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};

		jest.clearAllMocks();
	});

	// ─── pull ──────────────────────────────────────────────────────────────

	describe('pull', () => {
		it('should return 401 when source control is not licensed', async () => {
			jest
				.spyOn(
					require('@/modules/source-control.ee/source-control-helper.ee'),
					'isSourceControlLicensed',
				)
				.mockReturnValue(false);

			const req = { user: { id: 'user-1' }, body: { force: false } };
			await handler.pull[1](req, res);

			expect(res.status).toHaveBeenCalledWith(401);
		});

		it('should return 400 when source control is not connected', async () => {
			jest
				.spyOn(
					require('@/modules/source-control.ee/source-control-helper.ee'),
					'isSourceControlLicensed',
				)
				.mockReturnValue(true);
			sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);

			const req = { user: { id: 'user-1' }, body: { force: false } };
			await handler.pull[1](req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});
	});

	// ─── push ──────────────────────────────────────────────────────────────

	describe('push', () => {
		beforeEach(() => {
			jest
				.spyOn(
					require('@/modules/source-control.ee/source-control-helper.ee'),
					'isSourceControlLicensed',
				)
				.mockReturnValue(true);
			sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(true);
		});

		it('should return 401 when source control is not licensed', async () => {
			jest
				.spyOn(
					require('@/modules/source-control.ee/source-control-helper.ee'),
					'isSourceControlLicensed',
				)
				.mockReturnValue(false);

			const req = { user: { id: 'user-1' }, body: {} };
			await handler.push[1](req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Source Control feature is not licensed' }),
			);
		});

		it('should return 400 when source control is not connected', async () => {
			sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);

			const req = { user: { id: 'user-1' }, body: {} };
			await handler.push[1](req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Source Control is not connected to a repository' }),
			);
		});

		it('should return 200 and emit telemetry event on successful push', async () => {
			const pushedFile = makeFile({ pushed: true });
			sourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 200,
				pushResult: undefined,
				statusResult: [pushedFile],
			});

			const req = {
				user: { id: 'user-1' },
				body: { force: false, commitMessage: 'chore: daily push' },
			};
			await handler.push[1](req, res);

			expect(sourceControlService.pushWorkfolder).toHaveBeenCalledWith(
				req.user,
				expect.objectContaining({ force: false, commitMessage: 'chore: daily push' }),
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'source-control-user-pushed-api',
				expect.objectContaining({ forced: false }),
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith([pushedFile]);
		});

		it('should return 409 when there are conflicts and force is false', async () => {
			const conflictingFile = makeFile({ conflict: true });
			sourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 409,
				pushResult: undefined,
				statusResult: [conflictingFile],
			});

			const req = { user: { id: 'user-1' }, body: { force: false } };
			await handler.push[1](req, res);

			expect(res.status).toHaveBeenCalledWith(409);
			expect(res.send).toHaveBeenCalledWith([conflictingFile]);
		});

		it('should return 200 with force: true even with conflicts', async () => {
			const pushedFile = makeFile({ conflict: true, pushed: true });
			sourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 200,
				pushResult: undefined,
				statusResult: [pushedFile],
			});

			const req = { user: { id: 'user-1' }, body: { force: true } };
			await handler.push[1](req, res);

			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should return 400 on service error', async () => {
			sourceControlService.pushWorkfolder.mockRejectedValue(new Error('Git push failed'));

			const req = { user: { id: 'user-1' }, body: {} };
			await handler.push[1](req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith('Git push failed');
		});

		it('should pass ids field to pushWorkfolder when provided', async () => {
			sourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 200,
				pushResult: undefined,
				statusResult: [],
			});

			const req = {
				user: { id: 'user-1' },
				body: { ids: ['wf-1', 'cred-1'], commitMessage: 'push specific' },
			};
			await handler.push[1](req, res);

			expect(sourceControlService.pushWorkfolder).toHaveBeenCalledWith(
				req.user,
				expect.objectContaining({ ids: ['wf-1', 'cred-1'] }),
			);
		});

		it('should push all files when neither ids nor fileNames are provided', async () => {
			sourceControlService.pushWorkfolder.mockResolvedValue({
				statusCode: 200,
				pushResult: undefined,
				statusResult: [],
			});

			const req = { user: { id: 'user-1' }, body: {} };
			await handler.push[1](req, res);

			expect(sourceControlService.pushWorkfolder).toHaveBeenCalledWith(
				req.user,
				expect.objectContaining({ fileNames: [], ids: undefined }),
			);
		});
	});
});
