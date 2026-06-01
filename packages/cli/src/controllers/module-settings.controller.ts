import { Get, RestController } from '@n8n/decorators';

import { FrontendService } from '@/services/frontend.service';

@RestController('/module-settings')
export class ModuleSettingsController {
	constructor(private readonly frontendService: FrontendService) {}

	/**
	 * @returns settings for all loaded modules
	 */
	@Get('/')
	getModuleSettings() {
		return this.frontendService.getModuleSettings();
	}
}
