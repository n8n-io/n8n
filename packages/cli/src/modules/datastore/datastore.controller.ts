import { CreateDatastoreDto, UpdateDatastoreDto } from '@n8n/api-types';
import { Body, GlobalScope, Patch, Post, RestController } from '@n8n/decorators';

import { AuthenticatedRequest } from '@/requests';

import { DatastoreService } from './datastore.service';

@RestController('/datastore')
export class DatastoreController {
	constructor(private readonly datastoreService: DatastoreService) {}

	@Post('/')
	@GlobalScope('datastore:create')
	async createDatastore(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateDatastoreDto,
	) {
		const createdDatastore = await this.datastoreService.createDatastore(payload);
		return createdDatastore;
	}

	@Patch('/:id')
	@GlobalScope('datastore:update')
	async updateDatastore(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Body payload: UpdateDatastoreDto,
	) {
		const updatedDatastore = await this.datastoreService.updateDatastore(req.params.id, payload);
		return updatedDatastore;
	}

	@Post('/:id/records')
	@GlobalScope('datastore:write-record')
	async writeRecords(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Body payload: { records: Array<Record<string, unknown>> },
	) {
		const updatedDatastore = await this.datastoreService.writeRecords(
			req.params.id,
			payload.records,
		);
		return updatedDatastore;
	}
}
