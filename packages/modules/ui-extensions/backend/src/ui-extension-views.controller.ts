import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, RestController } from '@n8n/decorators';

import { UiExtensionViewsService } from './ui-extension-views.service';

@RestController('/ui-extensions')
export class UiExtensionViewsController {
	constructor(private readonly viewsService: UiExtensionViewsService) {}

	/**
	 * The views that the user created through MCP. Creating a view needs MCP
	 * access, so reading them needs the same scope.
	 */
	@Get('/views')
	@GlobalScope('mcpApiKey:create')
	async listViews(req: AuthenticatedRequest) {
		return await this.viewsService.list(req.user.id);
	}
}
