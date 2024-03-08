import { Post, RestController } from '@/decorators';
import { AIRequest } from '@/requests';
import { AIService } from '@/services/ai.service';
import { NodeTypes } from '@/NodeTypes';

@RestController('/ai')
export class AIController {
	constructor(
		private readonly aiService: AIService,
		private readonly nodeTypes: NodeTypes,
	) {}

	/**
	 * Suggest a solution for a given error using the AI provider.
	 */
	@Post('/debug-error')
	async debugError(req: AIRequest.DebugError): Promise<{ message: string }> {
		const { error } = req.body;

		let nodeType;
		if (error.node?.type) {
			nodeType = this.nodeTypes.getByNameAndVersion(error.node.type, error.node.typeVersion);
		}

		const message = await this.aiService.debugError(error, nodeType);
		return {
			message,
		};
	}
}
