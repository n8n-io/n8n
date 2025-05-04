import { CreateSchemaDto } from '@n8n/api-types';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';

import { AuthenticatedRequest } from '@/requests';

@RestController('/schemas')
export class schemasController {
	constructor() {}

	@Post('/')
	@GlobalScope('schemas:create')
	async createSchema(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateSchemaDto) {}
}
