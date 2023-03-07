import express from 'express';
import { Get, RestController } from '../../../decorators';
import { SamlUrls } from '../constants';
import { SamlService } from '../saml.service.ee';

/**
 * SSO Endpoints that are public
 */

export const samlControllerPublic = express.Router();

/**
 * GET /sso/saml/metadata
 * Return Service Provider metadata
 */
samlControllerPublic.get(SamlUrls.metadata, async (req: express.Request, res: express.Response) => {
	return res
		.header('Content-Type', 'text/xml')
		.send(SamlService.getInstance().getServiceProviderInstance().getMetadata());
});

@RestController('/sso/saml')
export class SamlController {
	private samlService: SamlService;

	constructor() {
		this.samlService = SamlService.getInstance();
	}

	@Get(SamlUrls.metadata)
	async getServiceProviderMetadata(req: express.Request, res: express.Response) {
		return res
			.header('Content-Type', 'text/xml')
			.send(this.samlService.getServiceProviderInstance().getMetadata());
	}
}
