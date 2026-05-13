import { Service } from '@n8n/di';

@Service()
export class WorkerPoolsService {
	getAvailablePools(): string[] {
		// TODO: read pool names from cluster state store once workers register their pool
		return ['default'];
	}
}
