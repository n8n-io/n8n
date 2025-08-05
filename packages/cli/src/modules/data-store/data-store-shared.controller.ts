import { Get, Query, RestController } from '@n8n/decorators';
import { DataStoreSharedService } from './data-store-shared.service';
import { AuthenticatedRequest } from '@n8n/db';
import { ListDataStoreQueryDto } from '@n8n/api-types';

@RestController('/data-stores-global')
export class DataStoreSharedControlled {
	constructor(private readonly dataStoreSharedService: DataStoreSharedService) {}

	@Get('/')
	async listDataStores(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		return await this.dataStoreSharedService.getManyAndCount(req.user, payload);
	}
}
