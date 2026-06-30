// lang-tracer REST client: reads suites over /api/v1 with the lt_ bearer key
// (the same key the MCP surface uses).

import { z } from 'zod';

import type { LangTracerConfig } from './config';

const suiteSummarySchema = z.object({ id: z.number(), slug: z.string(), name: z.string() });
const suiteListSchema = z.array(suiteSummarySchema);
const exportedSuiteSchema = z.object({
	suite: z.string(),
	count: z.number(),
	/** `<case-name>.json` → raw exported case body (n8n WorkflowTestCase shape). */
	files: z.record(z.unknown()),
});

export type LangTracerSuiteSummary = z.infer<typeof suiteSummarySchema>;
export type ExportedSuite = z.infer<typeof exportedSuiteSchema>;

export class LangTracerClient {
	constructor(private readonly config: LangTracerConfig) {}

	async listSuites(): Promise<LangTracerSuiteSummary[]> {
		return suiteListSchema.parse(await this.get('/api/v1/suites'));
	}

	async exportSuite(suiteId: number): Promise<ExportedSuite> {
		return exportedSuiteSchema.parse(await this.get(`/api/v1/suites/${String(suiteId)}/export`));
	}

	/** GET an /api/v1 endpoint and unwrap the `{ data }` envelope lang-tracer returns. */
	private async get(path: string): Promise<unknown> {
		const response = await fetch(new URL(path, this.config.baseUrl), {
			headers: { Authorization: `Bearer ${this.config.apiKey}` },
		});
		if (!response.ok) {
			// Don't echo the body — it may carry sensitive content.
			throw new Error(`lang-tracer GET ${path} returned ${String(response.status)}`);
		}
		const body: unknown = await response.json();
		if (body !== null && typeof body === 'object' && 'data' in body) {
			return body.data;
		}
		return body;
	}
}
