import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/services-common';
import type { Request, Response } from 'express';

import type { ResolveCredentialResponse } from './engine-credentials.contract';
import { resolveCredentialRequestSchema } from './engine-credentials.contract';
import { EngineCredentialsService } from './engine-credentials.service';

/**
 * Serves `POST /internal/credentials/resolve` for the engine 2.0 data plane.
 * Validates the body and writes the response. `EngineCredentialsService`
 * decides access and decrypts.
 */
@Service()
export class EngineCredentialsController {
	constructor(private readonly credentialsService: EngineCredentialsService) {}

	async resolveCredential(req: Request, res: Response): Promise<void> {
		const parsed = resolveCredentialRequestSchema.safeParse(req.body);

		if (!parsed.success) throw new BadRequestError('Invalid credential resolve request');

		const data = await this.credentialsService.resolve(parsed.data);

		const body: ResolveCredentialResponse = { data };
		res.status(200).json(body);
	}
}
