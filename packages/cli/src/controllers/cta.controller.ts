import express from 'express';
import { Authorized, Get, RestController } from '@/decorators';
import { AuthenticatedRequest } from '@/requests';
import { CtaService } from '@/services/cta.service';

/**
 * Controller for Call to Action (CTA) endpoints. CTAs are certain
 * messages that are shown to users in the UI.
 */
@Authorized()
@RestController('/cta')
export class CtaController {
	constructor(private readonly ctaService: CtaService) {}

	@Get('/become-creator')
	async getCta(req: AuthenticatedRequest, res: express.Response) {
		const becomeCreator = await this.ctaService.getBecomeCreatorCta(req.user.id);

		res.json(becomeCreator);
	}
}
