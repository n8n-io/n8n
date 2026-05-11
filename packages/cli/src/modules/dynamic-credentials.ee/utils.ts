import type { RequestHandler } from 'express';

import { Container } from '@n8n/di';
import { DynamicCredentialService } from './services/dynamic-credential.service';

export const getDynamicCredentialMiddlewares = (): RequestHandler[] => {
	return [Container.get(DynamicCredentialService).getDynamicCredentialsEndpointsMiddleware()];
};
