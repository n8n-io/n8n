import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { RunQueryDto } from './dto/run-query.dto';
import { mapEngineErrorToHttp } from './error-mapper';
import { QueryService } from './query.service';

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
			throw mapEngineErrorToHttp(error);
		}
	}
}
