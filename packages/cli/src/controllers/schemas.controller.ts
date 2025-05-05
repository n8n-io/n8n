import { CreateSchemaDto } from '@n8n/api-types';
import { Body, Get, GlobalScope, Post, RestController } from '@n8n/decorators';

import { SchemaRepository } from '@/databases/repositories/schema.repository';
import { AuthenticatedRequest } from '@/requests';

@RestController('/schemas')
export class schemasController {
	constructor(private readonly schemaRepository: SchemaRepository) {}

	@Post('/')
	@GlobalScope('schemas:create')
	async createSchema(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateSchemaDto) {
		await this.schemaRepository.save(
			this.schemaRepository.create({
				name: payload.name,
				definition: payload.definition,
			}),
		);
	}

	@Get('/')
	@GlobalScope('schemas:list')
	async retrieveAllSchemas(_req: AuthenticatedRequest, _res: Response) {
		const schemas = await this.schemaRepository.find();
		return schemas;
	}
}
