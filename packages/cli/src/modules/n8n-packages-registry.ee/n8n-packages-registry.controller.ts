import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

@RestController('/n8n-packages-registry')
export class N8nPackagesRegistryController {
	@Get('/')
	hello(_req: AuthenticatedRequest) {
		return { message: 'Hello, world!' };
	}
}
