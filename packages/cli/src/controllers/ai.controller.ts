import { Post, RestController } from '@/decorators';
import { AIRequest } from '@/requests';
import { AIService } from '@/services/ai.service';
import { FailedDependencyError } from '@/errors/response-errors/failed-dependency.error';

@RestController('/ai')
export class AIController {
	constructor(private readonly aiService: AIService) {}

	/**
	 * Generate CURL request and additional HTTP Node metadata for given service and request
	 */
	@Post('/generate-curl')
	async generateCurl(req: AIRequest.GenerateCurl): Promise<{ curl: string; metadata?: object }> {
		const { service, request } = req.body;

		try {
			return await this.aiService.generateCurl(service, request);
		} catch (aiServiceError) {
			throw new FailedDependencyError(
				(aiServiceError as Error).message ||
					'Failed to generate HTTP Request Node parameters due to an issue with an external dependency. Please try again later.',
			);
		}
	}
}
