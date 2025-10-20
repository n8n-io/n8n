import { Get, RestController } from '@n8n/decorators';
import { CredentialResolverService } from './credential-resolver.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { Cipher } from 'n8n-core';
import { Logger } from '@n8n/backend-common';
import { Request } from 'express';

@RestController('/resolver-credentials')
export class ResolverCredentialController {
	constructor(
		private readonly credentialService: CredentialsService,
		private readonly credentialResolverService: CredentialResolverService,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
	) {}

	// @Post('/:credentialId')
	// async createCredentials(
	// 	req: AuthenticatedRequest,
	// 	_: Response,
	// 	@Body payload: CreateCredentialDto,
	// ) {
	// 	const newCredential = await this.credentialsService.createUnmanagedCredential(
	// 		payload,
	// 		req.user,
	// 	);

	// 	const project = await this.sharedCredentialsRepository.findCredentialOwningProject(
	// 		newCredential.id,
	// 	);

	// 	this.eventService.emit('credentials-created', {
	// 		user: req.user,
	// 		credentialType: newCredential.type,
	// 		credentialId: newCredential.id,
	// 		publicApi: false,
	// 		projectId: project?.id,
	// 		projectType: project?.type,
	// 		uiContext: payload.uiContext,
	// 	});

	// 	return newCredential;
	// }
}
