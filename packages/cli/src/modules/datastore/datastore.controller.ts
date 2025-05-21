import { CreateDatastoreDto, CreateDatastoreFieldDto, UpdateDatastoreDto } from '@n8n/api-types';
import { Body, Delete, Get, GlobalScope, Patch, Post, RestController } from '@n8n/decorators';

import { AuthenticatedRequest } from '@/requests';

import { DatastoreService } from './datastore.service';

@RestController('/datastore')
export class DatastoreController {
	constructor(private readonly datastoreService: DatastoreService) {}

	@Get('/')
	@GlobalScope('datastore:list')
	async getDatastores(_req: AuthenticatedRequest, _res: Response) {
		const datastores = await this.datastoreService.getDatastores();
		return datastores;
	}

	@Delete('/:id')
	@GlobalScope('datastore:delete')
	async deleteDatastore(req: AuthenticatedRequest<{ id: string }>, _res: Response) {
		await this.datastoreService.deleteDatastore(req.params.id);
		return { success: true };
	}

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

	@Post('/:id/columns')
	@GlobalScope('datastore:update')
	async addColumns(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Body payload: CreateDatastoreFieldDto,
	) {
		const updatedDatastore = await this.datastoreService.addField(req.params.id, payload);
		return updatedDatastore;
	}

	@Delete('/:id/columns/:columnId')
	@GlobalScope('datastore:update')
	async deleteColumn(req: AuthenticatedRequest<{ id: string; columnId: string }>, _res: Response) {
		const updatedDatastore = await this.datastoreService.deleteField(
			req.params.id,
			req.params.columnId,
		);
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
