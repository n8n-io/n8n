// lang-tracer MCP client: drives list_suites + export_suite over MCP (bearer auth).
// Swap to REST here when lang-tracer ships a token-authenticated API.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
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

/** MCP tool-result envelope; the SDK types tool content loosely, so re-validate it. */
const callToolResultSchema = z.object({
	content: z.array(z.object({ type: z.string(), text: z.string().optional() })).default([]),
	isError: z.boolean().optional(),
});

export type LangTracerSuiteSummary = z.infer<typeof suiteSummarySchema>;
export type ExportedSuite = z.infer<typeof exportedSuiteSchema>;

export class LangTracerClient {
	private readonly client: Client;

	private readonly transport: StreamableHTTPClientTransport;

	constructor(config: LangTracerConfig) {
		this.transport = new StreamableHTTPClientTransport(new URL('/api/mcp', config.baseUrl), {
			requestInit: { headers: { Authorization: `Bearer ${config.apiKey}` } },
		});
		this.client = new Client({ name: 'n8n-instance-ai-eval', version: '0.1.0' });
	}

	async connect(): Promise<void> {
		await this.client.connect(this.transport);
	}

	async close(): Promise<void> {
		await this.client.close();
	}

	async listSuites(): Promise<LangTracerSuiteSummary[]> {
		return suiteListSchema.parse(await this.callTool('list_suites', {}));
	}

	async exportSuite(suiteId: number): Promise<ExportedSuite> {
		return exportedSuiteSchema.parse(await this.callTool('export_suite', { suiteId }));
	}

	/** Call a tool and unwrap the `{ data }` envelope the lang-tracer tools return. */
	private async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
		const result = callToolResultSchema.parse(
			await this.client.callTool({ name, arguments: args }),
		);
		const text = result.content.find((c) => c.type === 'text' && typeof c.text === 'string')?.text;

		if (result.isError) {
			// Don't echo the remote response body — it may carry sensitive content.
			throw new Error(`lang-tracer tool "${name}" returned an error response`);
		}
		if (text === undefined) {
			throw new Error(`lang-tracer tool "${name}" returned no text content`);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch (error) {
			throw new Error(
				`lang-tracer tool "${name}" returned non-JSON content: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}

		if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const envelope: Record<string, unknown> = { ...parsed };
			if ('data' in envelope) return envelope.data;
		}
		return parsed;
	}
}
