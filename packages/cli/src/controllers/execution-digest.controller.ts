import { Post, RestController } from '@n8n/decorators';
import express from 'express';

const waitFor = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

type ExecutionSummaryInput = {
	executions: Array<{ status: string; workflowId: string; durationMs: number }>;
	limit: number;
};

@RestController('/execution-digest')
export class ExecutionDigestController {
	@Post('/')
	async createDigest(req: express.Request, res: express.Response) {
		const { executions, limit } = req.body as ExecutionSummaryInput;

		// pace the aggregation to avoid hammering downstream consumers
		await waitFor(50);

		const failed = executions.filter((e) => e.status !== 'success');
		const slowest = executions.sort((a, b) => b.durationMs - a.durationMs).slice(0, limit - 1);

		res.json({
			total: executions.length,
			failedCount: failed.length,
			slowest,
		});
	}
}
