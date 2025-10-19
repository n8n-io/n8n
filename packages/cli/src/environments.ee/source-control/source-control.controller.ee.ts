import { IWorkflowToImport } from '@/interfaces';
import { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { SourceControlledFile } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, Patch, RestController, GlobalScope, Body } from '@n8n/decorators';
import express from 'express';
import type { PullResult } from 'simple-git';

import { SOURCE_CONTROL_DEFAULT_BRANCH } from './constants';
import {
	sourceControlLicensedMiddleware,
	sourceControlLicensedAndEnabledMiddleware,
} from './middleware/source-control-enabled-middleware.ee';
import { getRepoType } from './source-control-helper.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import { SourceControlService } from './source-control.service.ee';
import type { ImportResult } from './types/import-result';
import { SourceControlRequest } from './types/requests';
import { SourceControlGetStatus } from './types/source-control-get-status';
import type { SourceControlPreferences } from './types/source-control-preferences';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';

@RestController('/source-control')
export class SourceControlController {
	constructor(
		private readonly sourceControlService: SourceControlService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly sourceControlScopedService: SourceControlScopedService,
		private readonly eventService: EventService,
	) {}

	@Get('/preferences', { middlewares: [sourceControlLicensedMiddleware], skipAuth: true })
	async getPreferences(): Promise<SourceControlPreferences> {
		// returns the settings with the privateKey property redacted
		const publicKey = await this.sourceControlPreferencesService.getPublicKey();
		return { ...this.sourceControlPreferencesService.getPreferences(), publicKey };
	}

	@Post('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	@GlobalScope('sourceControl:manage')
	async setPreferences(req: SourceControlRequest.UpdatePreferences) {
		if (
			req.body.branchReadOnly === undefined &&
			this.sourceControlPreferencesService.isSourceControlConnected()
		) {
			throw new BadRequestError(
				'Cannot change preferences while connected to a source control provider. Please disconnect first.',
			);
		}
		try {
			const sanitizedPreferences: Partial<SourceControlPreferences> = {
				...req.body,
				initRepo: req.body.initRepo ?? true, // default to true if not specified
				connected: undefined,
				publicKey: undefined,
			};
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			const updatedPreferences =
				await this.sourceControlPreferencesService.setPreferences(sanitizedPreferences);
			if (sanitizedPreferences.initRepo === true) {
				try {
					await this.sourceControlService.initializeRepository(
						{
							...updatedPreferences,
							branchName:
								updatedPreferences.branchName === ''
									? SOURCE_CONTROL_DEFAULT_BRANCH
									: updatedPreferences.branchName,
							initRepo: true,
						},
						req.user,
					);
					if (this.sourceControlPreferencesService.getPreferences().branchName !== '') {
						await this.sourceControlPreferencesService.setPreferences({
							connected: true,
						});
					}
				} catch (error) {
					// if initialization fails, run cleanup to remove any intermediate state and throw the error
					await this.sourceControlService.disconnect({ keepKeyPair: true });
					throw error;
				}
			}
			await this.sourceControlService.init();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			// #region Tracking Information
			// located in controller so as to not call this multiple times when updating preferences
			this.eventService.emit('source-control-settings-updated', {
				branchName: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				readOnlyInstance: resultingPreferences.branchReadOnly,
				repoType: getRepoType(resultingPreferences.repositoryUrl),
				connectionType: resultingPreferences.connectionType!,
			});
			// #endregion
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Patch('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	@GlobalScope('sourceControl:manage')
	async updatePreferences(req: SourceControlRequest.UpdatePreferences) {
		try {
			const sanitizedPreferences: Partial<SourceControlPreferences> = {
				...req.body,
				initRepo: false,
				connected: undefined,
				publicKey: undefined,
				repositoryUrl: undefined,
			};
			const currentPreferences = this.sourceControlPreferencesService.getPreferences();
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			if (
				sanitizedPreferences.branchName &&
				sanitizedPreferences.branchName !== currentPreferences.branchName
			) {
				await this.sourceControlService.setBranch(sanitizedPreferences.branchName);
			}
			if (sanitizedPreferences.branchColor ?? sanitizedPreferences.branchReadOnly !== undefined) {
				await this.sourceControlPreferencesService.setPreferences(
					{
						branchColor: sanitizedPreferences.branchColor,
						branchReadOnly: sanitizedPreferences.branchReadOnly,
					},
					true,
				);
			}
			await this.sourceControlService.init();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			this.eventService.emit('source-control-settings-updated', {
				branchName: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				readOnlyInstance: resultingPreferences.branchReadOnly,
				repoType: getRepoType(resultingPreferences.repositoryUrl),
				connectionType: resultingPreferences.connectionType!,
			});
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/disconnect', { middlewares: [sourceControlLicensedMiddleware] })
	@GlobalScope('sourceControl:manage')
	async disconnect(req: SourceControlRequest.Disconnect) {
		try {
			return await this.sourceControlService.disconnect(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/get-branches', { middlewares: [sourceControlLicensedMiddleware] })
	async getBranches() {
		try {
			return await this.sourceControlService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/push-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async pushWorkfolder(
		req: AuthenticatedRequest,
		res: express.Response,
		@Body payload: PushWorkFolderRequestDto,
	): Promise<SourceControlledFile[]> {
		await this.sourceControlScopedService.ensureIsAllowedToPush(req);

		try {
			await this.sourceControlService.setGitUserDetails(
				`${req.user.firstName} ${req.user.lastName}`,
				req.user.email,
			);

			const result = await this.sourceControlService.pushWorkfolder(req.user, payload);
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/pull-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	@GlobalScope('sourceControl:pull')
	async pullWorkfolder(
		req: AuthenticatedRequest,
		res: express.Response,
		@Body payload: PullWorkFolderRequestDto,
	): Promise<SourceControlledFile[] | ImportResult | PullResult | undefined> {
		try {
			const result = await this.sourceControlService.pullWorkfolder(req.user, payload);
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reset-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	@GlobalScope('sourceControl:manage')
	async resetWorkfolder(): Promise<ImportResult | undefined> {
		try {
			return await this.sourceControlService.resetWorkfolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/get-status', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async getStatus(req: SourceControlRequest.GetStatus) {
		try {
			const result = await this.sourceControlService.getStatus(
				req.user,
				new SourceControlGetStatus(req.query),
			);
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/status', { middlewares: [sourceControlLicensedMiddleware] })
	async status(req: SourceControlRequest.GetStatus) {
		try {
			return await this.sourceControlService.getStatus(
				req.user,
				new SourceControlGetStatus(req.query),
			);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/generate-key-pair', { middlewares: [sourceControlLicensedMiddleware] })
	@GlobalScope('sourceControl:manage')
	async generateKeyPair(
		req: SourceControlRequest.GenerateKeyPair,
	): Promise<SourceControlPreferences> {
		try {
			const keyPairType = req.body.keyGeneratorType;
			const result = await this.sourceControlPreferencesService.generateAndSaveKeyPair(keyPairType);
			const publicKey = await this.sourceControlPreferencesService.getPublicKey();
			return { ...result, publicKey };
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/remote-content/:type/:id', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async getFileContent(
		req: AuthenticatedRequest & { params: { type: SourceControlledFile['type']; id: string } },
	): Promise<{ content: IWorkflowToImport; type: SourceControlledFile['type'] }> {
		try {
			const { type, id } = req.params;
			const content = await this.sourceControlService.getRemoteFileEntity({
				user: req.user,
				type,
				id,
			});
			return { content, type };
		} catch (error) {
			if (error instanceof ForbiddenError) {
				throw error;
			}
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
