import { Container } from '@n8n/di';
import { DynamicCredentialService } from './services/dynamic-credential.service';

export const getDynamicCredentialMiddlewares = () => {
	return [Container.get(DynamicCredentialService).getDynamicCredentialsEndpointsMiddleware()];
};
