import { Get, RestController } from '../../decorators';
import {
	versionControlLicensedMiddleware,
	versionControlLicensedOwnerMiddleware,
} from './middleware/versionControlEnabledMiddleware';
import { VersionControlService } from './versionControl.service.ee';

@RestController('/versionControl')
export class VersionControlController {
	constructor(private versionControlService: VersionControlService) {}

	@Get('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async getPreferences() {
		return this.versionControlService.versionControlPreferences;
	}

	//TODO: temporary function to generate key and save new pair
	@Get('/generateKeyPair', { middlewares: [versionControlLicensedOwnerMiddleware] })
	async generateKeyPair() {
		return this.versionControlService.generateAndSaveKeyPair();
	}
}
