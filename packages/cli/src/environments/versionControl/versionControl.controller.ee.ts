import express from 'express';
import { Get, Post, RestController } from '@/decorators';
import {
	versionControlLicensedMiddleware,
	versionControlLicensedOwnerMiddleware,
} from './middleware/versionControlEnabledMiddleware';
import { VersionControlService } from './versionControl.service.ee';
import { VersionControlRequest } from '@/environments/versionControl/types/requests';
import type { VersionControlPreferences } from '@/environments/versionControl/types/versionControlPreferences';

@RestController('/versionControl')
export class VersionControlController {
	constructor(private versionControlService: VersionControlService) {}

	@Get('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async getPreferences(req: express.Request, res: VersionControlRequest.GetPreferences) {
		// returns the settings with the privateKey property redacted
		return this.versionControlService.versionControlPreferences;
	}

	@Post('/preferences', { middlewares: [versionControlLicensedOwnerMiddleware] })
	async setPreferences(req: VersionControlRequest.UpdatePreferences) {
		const sanitizedPreferences: Partial<VersionControlPreferences> = {
			...req.body,
			privateKey: undefined,
			publicKey: undefined,
		};
		return this.versionControlService.setPreferences(sanitizedPreferences);
	}

	//TODO: temporary function to generate key and save new pair
	@Get('/generateKeyPair', { middlewares: [versionControlLicensedOwnerMiddleware] })
	async generateKeyPair() {
		return this.versionControlService.generateAndSaveKeyPair();
	}
}
