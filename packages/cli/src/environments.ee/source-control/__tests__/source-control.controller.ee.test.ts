import type { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';

import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlController } from '../source-control.controller.ee';
import type { SourceControlService } from '../source-control.service.ee';
import type { SourceControlRequest } from '../types/requests';
import type { SourceControlGetStatus } from '../types/source-control-get-status';

describe('SourceControlController', () => {
	let controller: SourceControlController;
	let sourceControlService: SourceControlService;
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let eventService: EventService;

	beforeEach(() => {
		sourceControlService = {
			pushWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			pullWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			getStatus: jest.fn().mockResolvedValue([]),
			setGitUserDetails: jest.fn(),
		} as unknown as SourceControlService;

		sourceControlPreferencesService = mock<SourceControlPreferencesService>();
		eventService = mock<EventService>();

		controller = new SourceControlController(
			sourceControlService,
			sourceControlPreferencesService,
			mock(),
			eventService,
		);
	});

	describe('pushWorkfolder', () => {
		it('should push workfolder with expected parameters', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PushWorkFolderRequestDto;

			await controller.pushWorkfolder(req, res, payload);
			expect(sourceControlService.setGitUserDetails).toHaveBeenCalledWith(
				'John Doe',
				'john.doe@example.com',
			);
			expect(sourceControlService.pushWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});
	});

	describe('pullWorkfolder', () => {
		it('should pull workfolder with expected parameters', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PullWorkFolderRequestDto;

			await controller.pullWorkfolder(req, res, payload);
			expect(sourceControlService.pullWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});
	});

	describe('getStatus', () => {
		it('should call getStatus with expected parameters', async () => {
			const user = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
			const query = {
				direction: 'pull',
				preferLocalVersion: true,
				verbose: false,
			} as SourceControlGetStatus;
			const req = mock<SourceControlRequest.GetStatus>({
				query,
				user,
			});

			await controller.getStatus(req);
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});
	});

	describe('status', () => {
		it('should call getStatus with expected parameters', async () => {
			const user = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
			const query = {
				direction: 'pull',
				preferLocalVersion: true,
				verbose: false,
			} as SourceControlGetStatus;
			const req = mock<SourceControlRequest.GetStatus>({
				query,
				user,
			});

			await controller.status(req);
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});
	});
});
