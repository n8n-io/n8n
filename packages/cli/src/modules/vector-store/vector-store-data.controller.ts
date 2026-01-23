import { type AuthenticatedRequest } from '@n8n/db';
import { Get, RestController, GlobalScope } from '@n8n/decorators';
import { VectorStoreDataRepository } from '@n8n/db';
import { VectorStoreConfig } from '@n8n/config';
import type { VectorStoreUsageDto } from '@n8n/api-types';

@RestController('/vector-store')
export class VectorStoreDataController {
	constructor(
		private readonly vectorStoreRepository: VectorStoreDataRepository,
		private readonly vectorStoreConfig: VectorStoreConfig,
	) {}

	@Get('/usage')
	@GlobalScope('chatHub:manage') // TODO
	async getUsage(_req: AuthenticatedRequest, _res: Response): Promise<VectorStoreUsageDto> {
		const currentSize = await this.vectorStoreRepository.getTotalSize();
		const maxSize = this.vectorStoreConfig.maxSize;

		return {
			currentSize,
			maxSize,
			usagePercentage: maxSize > 0 ? Math.round((currentSize / maxSize) * 100) : 0,
		};
	}
}
