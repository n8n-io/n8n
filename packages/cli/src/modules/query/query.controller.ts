import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { RunQueryDto } from './dto/run-query.dto';
import { EngineError } from './engine/errors';
import { QueryService } from './query.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

@RestController('/query')
export class QueryController {
	constructor(private readonly queryService: QueryService) {}

	@Post('/')
	async run(req: AuthenticatedRequest, _res: unknown, @Body body: RunQueryDto) {
		try {
			return await this.queryService.run(body.query, req.user, {
				timeoutMs: body.timeoutMs,
			});
		} catch (error) {
			throw mapToHttpError(error);
		}
	}
}

function mapToHttpError(error: unknown): unknown {
	if (!(error instanceof EngineError)) return error;
	const message = `${error.code}: ${error.message}`;
	switch (error.code) {
		case 'FORBIDDEN_WORKFLOW':
			return new ForbiddenError(message);
		case 'DB_UNSUPPORTED':
		case 'STATEMENT_TIMEOUT':
		case 'EXECUTION_FAILED':
		case 'RESULT_TOO_LARGE':
			return new InternalServerError(message);
		default:
			return new BadRequestError(message);
	}
}
