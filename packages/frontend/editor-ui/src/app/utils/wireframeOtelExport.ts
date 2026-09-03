// Wireframe: export sessions, checks and verdicts as OpenTelemetry-shaped traces.
// Attribute names are the contract other tools filter on — keep them stable.

export type ExportInclude = {
	messages: boolean;
	toolCalls: boolean;
	verdicts: boolean;
	checks: boolean;
	metrics: boolean;
	reviewers: boolean;
};

export type ExportDestination = 'otel' | 'langsmith' | 'json';

export type ExportSessionItem = {
	kind: 'session';
	id: string;
	title: string;
	agentId: string;
	agentName?: string;
	origin?: string | null;
	status?: string | null;
	createdAt: string;
	updatedAt: string;
	durationMs?: number;
	promptTokens?: number;
	completionTokens?: number;
	cost?: number;
	messages?: Array<{ role: string; text: string; toolCalls?: string[] }>;
	verdict?: { vote: 'up' | 'down'; note?: string; reviewer?: string; at?: string } | null;
};

export type ExportCheckItem = {
	kind: 'check';
	id: string;
	agentId: string;
	agentName?: string;
	checkKind: string;
	input: string;
	whatToCheck: string;
	answer?: string | null;
	state: string;
	verdict?: { vote: 'up' | 'down'; note?: string; reviewer?: string; at?: string } | null;
	at?: string | null;
};

export type ExportExecutionItem = {
	kind: 'execution';
	id: string;
	workflowId: string;
	workflowName?: string;
	status?: string;
	mode?: string;
	startedAt?: string;
	stoppedAt?: string;
	outputs: Array<{
		node: string;
		sample?: string | null;
		verdict?: { vote: 'up' | 'down'; note?: string; at?: string } | null;
	}>;
};

export type ExportItem = ExportSessionItem | ExportCheckItem | ExportExecutionItem;

type OtelValue =
	| { stringValue: string }
	| { intValue: string }
	| { doubleValue: number }
	| { boolValue: boolean };
type OtelAttribute = { key: string; value: OtelValue };

function attr(
	key: string,
	value: string | number | boolean | null | undefined,
): OtelAttribute | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'boolean') return { key, value: { boolValue: value } };
	if (typeof value === 'number') {
		return Number.isInteger(value)
			? { key, value: { intValue: String(value) } }
			: { key, value: { doubleValue: value } };
	}
	return { key, value: { stringValue: value } };
}

function attrs(
	pairs: Array<[string, string | number | boolean | null | undefined]>,
): OtelAttribute[] {
	return pairs.map(([k, v]) => attr(k, v)).filter((a): a is OtelAttribute => a !== null);
}

function nanos(iso: string | undefined): string {
	const ms = iso ? new Date(iso).getTime() : Date.now();
	return `${ms}000000`;
}

function hex(len: number): string {
	let out = '';
	for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 16).toString(16);
	return out;
}

function verdictAttrs(
	verdict:
		| { vote: 'up' | 'down'; note?: string; reviewer?: string; at?: string }
		| null
		| undefined,
	include: ExportInclude,
) {
	if (!include.verdicts || !verdict) return [];
	return attrs([
		['n8n.verdict', verdict.vote === 'up' ? 'looks_right' : 'not_right'],
		['n8n.verdict.note', verdict.note],
		['n8n.verdict.at', verdict.at],
		['n8n.reviewer', include.reviewers ? verdict.reviewer : undefined],
	]);
}

export function buildOtelTraces(items: ExportItem[], include: ExportInclude, instanceUrl: string) {
	const spans: Array<Record<string, unknown>> = [];
	for (const item of items) {
		const traceId = hex(32);
		if (item.kind === 'session') {
			const rootId = hex(16);
			spans.push({
				traceId,
				spanId: rootId,
				name: `agent.session ${item.title}`,
				kind: 1,
				startTimeUnixNano: nanos(item.createdAt),
				endTimeUnixNano: nanos(item.updatedAt),
				attributes: [
					...attrs([
						['n8n.kind', 'session'],
						['n8n.agent.id', item.agentId],
						['n8n.agent.name', item.agentName],
						['n8n.session.id', item.id],
						['n8n.session.origin', item.origin ?? 'preview'],
						['n8n.session.status', item.status],
						['n8n.session.url', `${instanceUrl}/agents/${item.agentId}/sessions/${item.id}`],
					]),
					...(include.metrics
						? attrs([
								['gen_ai.usage.input_tokens', item.promptTokens],
								['gen_ai.usage.output_tokens', item.completionTokens],
								['n8n.cost', item.cost],
								['n8n.duration_ms', item.durationMs],
							])
						: []),
					...verdictAttrs(item.verdict, include),
				],
			});
			if (include.messages) {
				for (const [i, m] of (item.messages ?? []).entries()) {
					spans.push({
						traceId,
						spanId: hex(16),
						parentSpanId: rootId,
						name: `agent.message ${m.role}`,
						kind: 1,
						startTimeUnixNano: nanos(item.createdAt),
						endTimeUnixNano: nanos(item.createdAt),
						attributes: attrs([
							['n8n.message.index', i],
							['gen_ai.message.role', m.role],
							['gen_ai.message.content', m.text],
							[
								'n8n.tool_calls',
								include.toolCalls && m.toolCalls?.length ? m.toolCalls.join(',') : undefined,
							],
						]),
					});
				}
			}
		} else if (item.kind === 'check') {
			if (!include.checks) continue;
			spans.push({
				traceId,
				spanId: hex(16),
				name: `agent.check ${item.checkKind}`,
				kind: 1,
				startTimeUnixNano: nanos(item.at ?? undefined),
				endTimeUnixNano: nanos(item.at ?? undefined),
				attributes: [
					...attrs([
						['n8n.kind', 'check'],
						['n8n.agent.id', item.agentId],
						['n8n.agent.name', item.agentName],
						['n8n.check.id', item.id],
						['n8n.check.kind', item.checkKind],
						['n8n.check.input', item.input],
						['n8n.check.what_to_check', item.whatToCheck],
						['n8n.check.state', item.state],
						['gen_ai.message.content', include.messages ? item.answer : undefined],
					]),
					...verdictAttrs(item.verdict, include),
				],
			});
		} else {
			const rootId = hex(16);
			spans.push({
				traceId,
				spanId: rootId,
				name: `workflow.execution ${item.workflowName ?? item.workflowId}`,
				kind: 1,
				startTimeUnixNano: nanos(item.startedAt),
				endTimeUnixNano: nanos(item.stoppedAt ?? item.startedAt),
				attributes: attrs([
					['n8n.kind', 'execution'],
					['n8n.workflow.id', item.workflowId],
					['n8n.workflow.name', item.workflowName],
					['n8n.execution.id', item.id],
					['n8n.execution.status', item.status],
					['n8n.execution.mode', item.mode],
					['n8n.execution.url', `${instanceUrl}/workflow/${item.workflowId}/executions/${item.id}`],
				]),
			});
			for (const o of item.outputs) {
				spans.push({
					traceId,
					spanId: hex(16),
					parentSpanId: rootId,
					name: `workflow.output ${o.node}`,
					kind: 1,
					startTimeUnixNano: nanos(item.startedAt),
					endTimeUnixNano: nanos(item.stoppedAt ?? item.startedAt),
					attributes: [
						...attrs([
							['n8n.node.name', o.node],
							['n8n.output.sample', include.messages ? o.sample : undefined],
						]),
						...verdictAttrs(o.verdict, include),
					],
				});
			}
		}
	}
	return {
		resourceSpans: [
			{
				resource: {
					attributes: attrs([
						['service.name', 'n8n'],
						['service.instance.id', instanceUrl],
					]),
				},
				scopeSpans: [{ scope: { name: 'n8n.ai-trust', version: 'wireframe' }, spans }],
			},
		],
	};
}

export function downloadJson(filename: string, data: unknown) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
