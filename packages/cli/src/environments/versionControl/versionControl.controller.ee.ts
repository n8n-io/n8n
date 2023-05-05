import { Authorized, Get, Post, RestController } from '@/decorators';
import { versionControlLicensedMiddleware } from './middleware/versionControlEnabledMiddleware';
import { VersionControlService } from './versionControl.service.ee';
import { VersionControlRequest } from './types/requests';
import type { VersionControlPreferences } from './types/versionControlPreferences';

@RestController('/versionControl')
export class VersionControlController {
	constructor(private versionControlService: VersionControlService) {}

	@Authorized('any')
	@Get('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async getPreferences(): Promise<VersionControlPreferences> {
		// returns the settings with the privateKey property redacted
		return this.versionControlService.versionControlPreferences;
	}

	@Authorized(['global', 'owner'])
	@Post('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async setPreferences(req: VersionControlRequest.UpdatePreferences) {
		const sanitizedPreferences: Partial<VersionControlPreferences> = {
			...req.body,
			privateKey: undefined,
			publicKey: undefined,
		};
		await this.versionControlService.validateVersionControlPreferences(sanitizedPreferences);
		return this.versionControlService.setPreferences(sanitizedPreferences);
	}

	//TODO: temporary function to generate key and save new pair
	// REMOVE THIS FUNCTION AFTER TESTING
	@Authorized(['global', 'owner'])
	@Get('/generateKeyPair', { middlewares: [versionControlLicensedMiddleware] })
	async generateKeyPair() {
		return this.versionControlService.generateAndSaveKeyPair();
	}
}
