import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { Request, Response } from 'express';

import { N8nLiteLambdaService } from './n8n-lite-lambda.service';
import { liteRunReportSchema, liteTargetSchema } from './n8n-lite.schemas';
import { N8nLiteService } from './n8n-lite.service';

@RestController('/n8n-lite')
export class N8nLiteController {
	constructor(
		private readonly liteService: N8nLiteService,
		private readonly lambdaService: N8nLiteLambdaService,
	) {}

	@Get('/workflows/:workflowId/binary')
	@ProjectScope('workflow:read')
	async downloadBinary(
		req: AuthenticatedRequest<{ workflowId: string }, {}, {}, { target?: string }>,
		res: Response,
	) {
		const target = liteTargetSchema.safeParse(req.query.target ?? 'linux-arm64');
		if (!target.success) throw new BadRequestError(`Unknown target "${String(req.query.target)}"`);

		const { binary, filename } = await this.liteService.buildBinary(
			req.params.workflowId,
			req.user,
			target.data,
		);

		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		// Lets a cross-origin editor (local dev) read the file name.
		res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
		res.send(binary);
	}

	@Post('/workflows/:workflowId/lambda')
	@ProjectScope('workflow:read')
	async deployLambda(req: AuthenticatedRequest<{ workflowId: string }>) {
		return await this.lambdaService.deploy(req.params.workflowId, req.user);
	}

	/** Authenticated by the report token in the binary, not by a session. */
	@Post('/runs', { skipAuth: true })
	async receiveRun(req: Request) {
		const report = liteRunReportSchema.safeParse(req.body);
		if (!report.success) {
			throw new BadRequestError(`Invalid run report: ${report.error.message}`);
		}
		return await this.liteService.saveReport(report.data, req.headers.authorization);
	}
}
