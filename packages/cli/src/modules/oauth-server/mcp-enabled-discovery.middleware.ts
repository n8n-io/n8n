import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { RequestHandler, Response } from 'express';

import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

const sendNotFound = (res: Response) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Cache-Control', 'no-store');
	res.status(404).json({ message: 'Not Found' });
};

export const mcpEnabledForDiscovery: RequestHandler = async (_req, res, next) => {
	try {
		const moduleRegistry = Container.get(ModuleRegistry);
		if (!moduleRegistry.isActive('mcp')) {
			sendNotFound(res);
			return;
		}

		let mcpSettingsService: McpSettingsService;
		try {
			mcpSettingsService = Container.get(McpSettingsService);
		} catch (error) {
			// If the service is missing despite the module being active,
			// treat it as disabled and hide the surface.
			sendNotFound(res);
			return;
		}

		const enabled = await mcpSettingsService.getEnabled();
		if (!enabled) {
			sendNotFound(res);
			return;
		}

		next();
	} catch (error) {
		// Let Express handle infrastructure errors (e.g. DB timeouts)
		next(error);
	}
};
