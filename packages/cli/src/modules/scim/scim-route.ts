import { createIpRateLimit } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { ScimAuthMiddleware } from './scim-auth.middleware';
import { scimBodyParser } from './scim-body-parser';
import { ScimConfig } from './scim.config';

const scimAuth = () => Container.get(ScimAuthMiddleware).getAuthMiddleware();

const scimConfig = Container.get(ScimConfig);

/**
 * Options shared by all SCIM endpoints: the built-in cookie auth is skipped
 * and replaced by bearer-token auth (`ScimAuthMiddleware`), since requests
 * come from the identity provider, not a browser session.
 */
export const scimRoute: {
	skipAuth: boolean;
	usesTemplates: boolean;
	allowBots: boolean;
	middlewares: RequestHandler[];
	ipRateLimit: ReturnType<typeof createIpRateLimit>;
} = {
	skipAuth: true,
	usesTemplates: true,
	// Identity providers call these with their own User-Agent, which the global
	// bot filter would otherwise drop before `ScimAuthMiddleware` runs.
	allowBots: true,
	middlewares: [scimBodyParser, scimAuth()],
	ipRateLimit: createIpRateLimit(scimConfig.rateLimit),
};
