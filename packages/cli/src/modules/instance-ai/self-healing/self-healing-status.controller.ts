import type { SelfHealingStatusDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { SelfHealingConfigurationService } from './self-healing-configuration.service';

@RestController('/self-healing')
export class SelfHealingStatusController {
	constructor(private readonly configurations: SelfHealingConfigurationService) {}

	/** Tells the Inbox whether self-healing results can reach the current user. */
	@Get('/status')
	async status(req: AuthenticatedRequest): Promise<SelfHealingStatusDto> {
		return await this.configurations.getStatus(req.user);
	}
}
