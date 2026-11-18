import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Param, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';

import {
	UiExtensionViewNotFoundError,
	UiExtensionViewsService,
} from './ui-extension-views.service';

@RestController('/ui-extensions')
export class UiExtensionViewsController {
	constructor(private readonly viewsService: UiExtensionViewsService) {}

	/**
	 * The views and pages that the user created through MCP. Creating them needs
	 * MCP access, so reading them needs the same scope.
	 */
	@Get('/views')
	@GlobalScope('mcpApiKey:create')
	async listViews(req: AuthenticatedRequest) {
		return await this.viewsService.list(req.user.id);
	}

	/**
	 * Removes a view or a page of the user. Built-in views and pages are never
	 * stored, so their IDs give 404 too.
	 */
	@Delete('/views/:id')
	@GlobalScope('mcpApiKey:create')
	async removeView(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		try {
			return await this.viewsService.remove(req.user.id, id);
		} catch (error) {
			if (error instanceof UiExtensionViewNotFoundError) throw new NotFoundError(error.message);
			throw error;
		}
	}
}
