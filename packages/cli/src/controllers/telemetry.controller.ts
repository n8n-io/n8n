import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController } from '@n8n/decorators';

import { Telemetry } from '@/telemetry';

@RestController('/telemetry')
export class TelemetryController {
	constructor(private telemetryService: Telemetry) {}

	@Post('/identify')
	async identify(req: AuthenticatedRequest) {
		const { traits, feInstanceId } = req.body;
		this.telemetryService.identify(traits, feInstanceId);
		return;
	}

	@Post('/track')
	async track(req: AuthenticatedRequest) {
		const { event, updatedProperties } = req.body;
		this.telemetryService.track(event, updatedProperties);
		return;
	}

	@Post('/page')
	async page(req: AuthenticatedRequest) {
		const { event, updatedProperties } = req.body;
		this.telemetryService.page(event, updatedProperties);
		return;
	}
}
