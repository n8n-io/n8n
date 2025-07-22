import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { DataStoreService } from './data-store.service';

@RestController('/data-store')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Get('/summary')
	async getSummary(_req: AuthenticatedRequest, _res: Response) {
		return await this.dataStoreService.getSummary();
	}
}
