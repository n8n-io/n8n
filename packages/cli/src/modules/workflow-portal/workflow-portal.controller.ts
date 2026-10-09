import { HTML_NONCE_PLACEHOLDER } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Middleware, Param, RootLevelController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { WorkflowPortalConfig } from './workflow-portal.config';
import { WORKFLOW_PORTAL_ASSETS_PATH, WORKFLOW_PORTAL_ROUTES } from './workflow-portal.constants';
import { WorkflowPortalService } from './workflow-portal.service';

// Portal OAuth cookies replace the default n8n session check on these routes.
@RootLevelController('/')
export class WorkflowPortalController {
	private readonly securityHeaders = helmet({
		strictTransportSecurity: false,
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'none'"],
				scriptSrc: ["'self'"],
				connectSrc: ["'self'"],
				frameAncestors: ["'none'"],
				upgradeInsecureRequests: null,
			},
		},
	});

	constructor(
		private readonly config: WorkflowPortalConfig,
		private readonly portalService: WorkflowPortalService,
	) {}

	@Middleware()
	checkHost(req: Request, res: Response, next: NextFunction) {
		if (!this.config.isPortalHost(req.headers.host)) {
			next('router');
			return;
		}
		res.setHeader('Cache-Control', 'private, no-store');
		this.securityHeaders(req, res, next);
	}

	@Middleware()
	async authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (
			req.path === WORKFLOW_PORTAL_ROUTES.login ||
			req.path === WORKFLOW_PORTAL_ROUTES.oauthCallback
		) {
			next();
			return;
		}
		const user = await this.portalService.getAuthenticatedUser(req);
		if (user) {
			req.user = user;
			next();
			return;
		}
		this.portalService.clearCookie(res);
		if (req.path === WORKFLOW_PORTAL_ROUTES.index) res.redirect(WORKFLOW_PORTAL_ROUTES.login);
		else res.status(401).json({ message: 'Unauthorized' });
	}

	@Get(WORKFLOW_PORTAL_ROUTES.index, { skipAuth: true, usesTemplates: true })
	async index(_req: Request, res: Response) {
		const html = await this.portalService.getIndexHtml();
		res.type('html').send(html.replaceAll(HTML_NONCE_PLACEHOLDER, res.locals.cspNonce));
	}

	@Get(WORKFLOW_PORTAL_ROUTES.login, { skipAuth: true, usesTemplates: true })
	async login(_req: Request, res: Response) {
		res.redirect(await this.portalService.beginLogin(res));
	}

	@Get(WORKFLOW_PORTAL_ROUTES.oauthCallback, { skipAuth: true, usesTemplates: true })
	async handleCallback(req: Request, res: Response) {
		await this.portalService.completeLogin(req, res);
		res.redirect(WORKFLOW_PORTAL_ROUTES.index);
	}

	@Get(WORKFLOW_PORTAL_ROUTES.workflows, { skipAuth: true, usesTemplates: true })
	async workflows(req: AuthenticatedRequest, res: Response) {
		res.json(await this.portalService.listWorkflows(req.user, req.query));
	}

	@Get(`${WORKFLOW_PORTAL_ASSETS_PATH}/:fileName`, { skipAuth: true, usesTemplates: true })
	asset(_req: Request, res: Response, @Param('fileName') fileName: string) {
		res.sendFile(fileName, {
			root: this.portalService.assetsDir,
			dotfiles: 'deny',
			cacheControl: false,
		});
	}
}
