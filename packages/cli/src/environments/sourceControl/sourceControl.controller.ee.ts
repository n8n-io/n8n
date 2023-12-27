import type { PullResult } from 'simple-git';
import express from 'express';
import { Authorized, Get, Post, Patch, RestController, RequireGlobalScope } from '@/decorators';
import {
	sourceControlLicensedMiddleware,
	sourceControlLicensedAndEnabledMiddleware,
} from './middleware/sourceControlEnabledMiddleware.ee';
import { SourceControlService } from './sourceControl.service.ee';
import { SourceControlRequest } from './types/requests';
import { SourceControlPreferencesService } from './sourceControlPreferences.service.ee';
import type { SourceControlPreferences } from './types/sourceControlPreferences';
import type { SourceControlledFile } from './types/sourceControlledFile';
import { SOURCE_CONTROL_DEFAULT_BRANCH } from './constants';
import type { ImportResult } from './types/importResult';
import { InternalHooks } from '@/InternalHooks';
import { getRepoType } from './sourceControlHelper.ee';
import { SourceControlGetStatus } from './types/sourceControlGetStatus';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@Authorized()
@RestController('/source-control')
export class SourceControlController {
	constructor(
		private readonly sourceControlService: SourceControlService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly internalHooks: InternalHooks,
	) {}

	@Authorized('none')
	@Get('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	async getPreferences(): Promise<SourceControlPreferences> {
		// returns the settings with the privateKey property redacted
		return this.sourceControlPreferencesService.getPreferences();
	}

	@Post('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	@RequireGlobalScope('sourceControl:manage')
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
			void this.internalHooks.onSourceControlSettingsUpdated({
				branch_name: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				read_only_instance: resultingPreferences.branchReadOnly,
				repo_type: getRepoType(resultingPreferences.repositoryUrl),
			});
			// #endregion
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Patch('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	@RequireGlobalScope('sourceControl:manage')
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
			void this.internalHooks.onSourceControlSettingsUpdated({
				branch_name: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				read_only_instance: resultingPreferences.branchReadOnly,
				repo_type: getRepoType(resultingPreferences.repositoryUrl),
			});
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/disconnect', { middlewares: [sourceControlLicensedMiddleware] })
	@RequireGlobalScope('sourceControl:manage')
	async disconnect(req: SourceControlRequest.Disconnect) {
		try {
			return await this.sourceControlService.disconnect(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/get-branches', { middlewares: [sourceControlLicensedMiddleware] })
	async getBranches() {
		try {
			return await this.sourceControlService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/push-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	@RequireGlobalScope('sourceControl:push')
	async pushWorkfolder(
		req: SourceControlRequest.PushWorkFolder,
		res: express.Response,
	): Promise<SourceControlledFile[]> {
		if (this.sourceControlPreferencesService.isBranchReadOnly()) {
			throw new BadRequestError('Cannot push onto read-only branch.');
		}
		try {
			await this.sourceControlService.setGitUserDetails(
				`${req.user.firstName} ${req.user.lastName}`,
				req.user.email,
			);
			const result = await this.sourceControlService.pushWorkfolder(req.body);
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/pull-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	@RequireGlobalScope('sourceControl:pull')
	async pullWorkfolder(
		req: SourceControlRequest.PullWorkFolder,
		res: express.Response,
	): Promise<SourceControlledFile[] | ImportResult | PullResult | undefined> {
		try {
			const result = await this.sourceControlService.pullWorkfolder({
				force: req.body.force,
				variables: req.body.variables,
				userId: req.user.id,
			});
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reset-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	@RequireGlobalScope('sourceControl:manage')
	async resetWorkfolder(): Promise<ImportResult | undefined> {
		try {
			return await this.sourceControlService.resetWorkfolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/get-status', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async getStatus(req: SourceControlRequest.GetStatus) {
		try {
			const result = (await this.sourceControlService.getStatus(
				new SourceControlGetStatus(req.query),
			)) as SourceControlledFile[];
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/status', { middlewares: [sourceControlLicensedMiddleware] })
	async status(req: SourceControlRequest.GetStatus) {
		try {
			return await this.sourceControlService.getStatus(new SourceControlGetStatus(req.query));
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/generate-key-pair', { middlewares: [sourceControlLicensedMiddleware] })
	@RequireGlobalScope('sourceControl:manage')
	async generateKeyPair(
		req: SourceControlRequest.GenerateKeyPair,
	): Promise<SourceControlPreferences> {
		try {
			const keyPairType = req.body.keyGeneratorType;
			const result = await this.sourceControlPreferencesService.generateAndSaveKeyPair(keyPairType);
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
