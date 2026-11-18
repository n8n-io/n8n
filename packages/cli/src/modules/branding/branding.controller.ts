import { UpdateBrandingDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Put, RestController } from '@n8n/decorators';

import { BrandingService } from './branding.service';

// Every user reads the accent color from the frontend settings, so there is no GET route.
@RestController('/branding')
export class BrandingController {
	constructor(private readonly brandingService: BrandingService) {}

	@Put('/')
	// Proof of concept: owners and admins already hold this scope. A dedicated
	// `branding:manage` scope replaces it before this ships.
	@GlobalScope('securitySettings:manage')
	async updateBranding(_req: AuthenticatedRequest, _res: Response, @Body dto: UpdateBrandingDto) {
		return await this.brandingService.setBranding(dto);
	}
}
