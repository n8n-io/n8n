import { Get, Post, RestController } from '@n8n/decorators';
import type { Request } from 'express';
import { compileWorkflowJS, COMPILER_EXAMPLES } from '@n8n/workflow-sdk';

@RestController('/temporary')
export class TemporaryController {
	@Post('/parse-code', { skipAuth: true })
	async parseCode(req: Request) {
		const { code } = req.body as { code: string };
		return compileWorkflowJS(code);
	}

	@Get('/examples', { skipAuth: true })
	async getExamples() {
		return COMPILER_EXAMPLES;
	}
}
