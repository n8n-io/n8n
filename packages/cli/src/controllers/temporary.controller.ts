import { Get, Post, RestController } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import { compileWorkflowJS, COMPILER_EXAMPLES } from '@n8n/workflow-sdk';

@RestController('/temporary')
export class TemporaryController {
	@Post('/parse-code')
	async parseCode(req: AuthenticatedRequest) {
		const { code } = req.body as { code: string };
		return compileWorkflowJS(code);
	}

	@Get('/examples')
	async getExamples() {
		return COMPILER_EXAMPLES;
	}
}
