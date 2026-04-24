import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export class AiGatewayUsageQueryDto extends Z.class(publicApiPaginationSchema) {}

export interface AiGatewayUsageEntry {
	provider: string;
	model: string;
	timestamp: number;
	cost: number;
	inputTokens?: number;
	outputTokens?: number;
	metadata?: Record<string, unknown>;
}

export interface AiGatewayUsageResponse {
	entries: AiGatewayUsageEntry[];
	total: number;
}
