// lang-tracer REST client over /api/v1 with the lt_ bearer key (the same key the
// MCP surface uses). Reads unwrap the `{ data }` envelope; writes return their raw
// object, so `write()` deliberately does NOT unwrap.

import { z } from 'zod';

import type { LangTracerConfig } from './config';
import type { LangTracerCreateCaseBody } from './to-exported';

const suiteSummarySchema = z.object({ id: z.number(), slug: z.string(), name: z.string() });
const suiteListSchema = z.array(suiteSummarySchema);
const exportedSuiteSchema = z.object({
	suite: z.string(),
	count: z.number(),
	/** `<case-name>.json` → raw exported case body (n8n WorkflowTestCase shape). */
	files: z.record(z.unknown()),
});

/** We only need id + name off a case; keep the rest of the row untyped. */
const caseRefSchema = z.object({ id: z.number(), name: z.string() });
const suiteWithCasesSchema = z.object({ cases: z.array(caseRefSchema) });
const createCaseResponseSchema = z.object({
	case: caseRefSchema,
	alreadyExisted: z.boolean().optional(),
});
const updateCaseResponseSchema = z.object({
	case: caseRefSchema,
	revision: z.number().nullable(),
});

export type LangTracerSuiteSummary = z.infer<typeof suiteSummarySchema>;
export type ExportedSuite = z.infer<typeof exportedSuiteSchema>;
export type LangTracerCaseRef = z.infer<typeof caseRefSchema>;

/** Fields patchable via `PATCH /cases/:id` — a create body minus the create-only
 *  keys (`suiteId`/`synthetic`). `scenarios` are sidecar rows the server reconciles
 *  by name on PATCH (upsert + delete missing); a server predating lang-tracer #48
 *  strips the key silently, leaving the old scenarios in place. */
export type LangTracerUpdateCaseBody = Partial<
	Omit<LangTracerCreateCaseBody, 'suiteId' | 'synthetic'>
>;

export class LangTracerClient {
	constructor(private readonly config: LangTracerConfig) {}

	async listSuites(): Promise<LangTracerSuiteSummary[]> {
		return suiteListSchema.parse(await this.get('/api/v1/suites'));
	}

	async exportSuite(suiteId: number): Promise<ExportedSuite> {
		return exportedSuiteSchema.parse(await this.get(`/api/v1/suites/${String(suiteId)}/export`));
	}

	/** Fetch a suite's filed cases (id + name), the source of truth for suite membership. */
	async getSuite(suiteId: number): Promise<{ cases: LangTracerCaseRef[] }> {
		return suiteWithCasesSchema.parse(await this.get(`/api/v1/suites/${String(suiteId)}`));
	}

	/** Create a case and (with `suiteId`) file it into a suite. Idempotent by
	 *  (name, setKind, suiteId) — a hit returns the existing row with `alreadyExisted`. */
	async createCase(body: LangTracerCreateCaseBody) {
		return createCaseResponseSchema.parse(await this.write('POST', '/api/v1/cases', body));
	}

	/** Patch case-level fields on an existing case. */
	async updateCase(id: number, patch: LangTracerUpdateCaseBody) {
		return updateCaseResponseSchema.parse(
			await this.write('PATCH', `/api/v1/cases/${String(id)}`, patch),
		);
	}

	/** GET an /api/v1 endpoint and unwrap the `{ data }` envelope reads return. */
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

	/** POST/PATCH an /api/v1 endpoint. Writes return their raw object (no `{ data }`
	 *  wrapper), so — unlike `get()` — this does not unwrap. */
	private async write(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<unknown> {
		const response = await fetch(new URL(path, this.config.baseUrl), {
			method,
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		if (!response.ok) {
			// Don't echo the body — it may carry sensitive content.
			throw new Error(`lang-tracer ${method} ${path} returned ${String(response.status)}`);
		}
		return await response.json();
	}
}
