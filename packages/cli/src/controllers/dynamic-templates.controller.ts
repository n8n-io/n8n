import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { DynamicTemplatesService } from '@/services/dynamic-templates.service';

@RestController('/dynamic-templates')
export class DynamicTemplatesController {
	constructor(private readonly dynamicTemplatesService: DynamicTemplatesService) {}

	@Get('/')
	async get(_req: AuthenticatedRequest) {
		try {
			const templates = await this.dynamicTemplatesService.fetchDynamicTemplates();
			return { templates };
		} catch {
			throw new InternalServerError('Failed to fetch dynamic templates');
		}
	}
}
