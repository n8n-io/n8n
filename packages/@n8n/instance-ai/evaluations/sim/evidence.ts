// ---------------------------------------------------------------------------
// Evidence of a simulated run, in the shape the scenario verifier reads.
//
// The eval instance returns the run's node results like a mock run; the vendor
// requests come from the sim server's event log. A request is filed under the
// node whose run was in progress when the server received it.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalInterceptedRequest, InstanceAiEvalNodeResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { SimEvent } from './sim-admin-client';

export interface ServiceEvent extends SimEvent {
	service: string;
}

/** Clock skew between the sim server and n8n: a request this close to a run still belongs to it. */
const SKEW_MS = 1_000;

/**
 * Files each sim server request under the node whose run covers its time, innermost
 * run first (an AI root's run contains its sub-nodes' runs), else under the nearest run
 * within the clock skew. Returns the requests no run is near (work after the run).
 */
export function attachSimEvents(
	nodeResults: Record<string, InstanceAiEvalNodeResult>,
	nodeTypesByName: Record<string, string>,
	events: ServiceEvent[],
): ServiceEvent[] {
	const windows = Object.entries(nodeResults)
		.flatMap(([node, result]) =>
			(result.runTimes ?? []).map((run) => ({
				node,
				start: run.startTime,
				end: run.startTime + run.executionTime,
			})),
		)
		.sort((a, b) => a.end - a.start - (b.end - b.start));
	const unattributed: ServiceEvent[] = [];
	for (const event of events) {
		if (event.kind !== 'request' || !event.request) continue;
		const at = event.ts ? Date.parse(event.ts) : Number.NaN;
		const gap = (w: (typeof windows)[number]) => Math.max(w.start - at, at - w.end, 0);
		// Stable sort: runs that cover the request (gap 0) stay innermost first.
		const owner = windows.filter((w) => gap(w) <= SKEW_MS).sort((a, b) => gap(a) - gap(b))[0];
		const result = owner ? nodeResults[owner.node] : undefined;
		if (!owner || !result) {
			unattributed.push(event);
			continue;
		}
		const request: InstanceAiEvalInterceptedRequest = {
			url: `${event.service} ${event.request.path ?? ''}`,
			method: event.request.method ?? 'GET',
			nodeType: nodeTypesByName[owner.node] ?? '',
			mockResponse: {
				simulated: true,
				status: event.request.status,
				...(event.request.op ? { operation: event.request.op } : {}),
				...(event.request.listed === false ? { implemented: false } : {}),
				...(event.request.error ? { error: event.request.error } : {}),
			},
		};
		result.interceptedRequests.push(request);
	}
	return unattributed;
}

export interface SimFlags {
	/** Calls the simulation does not implement: a gap in the simulated service. */
	gaps: string[];
}

/** Rule-based labels, decided before the LLM verifier reads the run. */
export function flagSimRun(events: ServiceEvent[]): SimFlags {
	const gaps = events
		.filter(
			(e) => e.kind === 'request' && (e.request?.status === 501 || e.request?.listed === false),
		)
		.map(
			(e) =>
				`${e.service} ${e.request?.method ?? ''} ${e.request?.path ?? ''} -> ${String(e.request?.status)} (not implemented by the simulation)`,
		);
	return { gaps: [...new Set(gaps)] };
}

const PLACEHOLDER = /__evalMockResource|<__PLACEHOLDER_VALUE__|^YOUR_[A-Z0-9_]+$/;

export interface SetupField {
	/** `<node>.<parameter path>`, as a binding names it. */
	path: string;
	value: string;
}

/** Edit distance, or `limit + 1` once it is larger than `limit`. */
function distance(a: string, b: string, limit: number): number {
	if (Math.abs(a.length - b.length) > limit) return limit + 1;
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			current[j] = Math.min(
				previous[j] + 1,
				current[j - 1] + 1,
				previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
		}
		if (Math.min(...current) > limit) return limit + 1;
		previous = current;
	}
	return previous[b.length];
}

export interface CaseFields {
	/** Fields to point at seeded data: empty, a placeholder, or an id the case never gives. */
	setup: SetupField[];
	/** Container names and mapped columns the workflow uses; the world adopts the ones the case leaves open. */
	openNames: SetupField[];
	/** Per node, its resource fields: `<node>: <parameter> = <value> (<mode>), ...`. */
	resources: string[];
}

/**
 * Reads the resource locators of the given nodes against the case text. An id one or
 * two edits away from an id the case gives is a typo of it, so it stays as written:
 * the run shows the workflow targeting a resource that does not exist. Model choices
 * are not resources.
 */
export function caseFields(
	nodes: Array<{ name: string; parameters?: Record<string, unknown> }>,
	caseText: string,
): CaseFields {
	const fields: CaseFields = { setup: [], openNames: [], resources: [] };
	const tokens = caseText.match(/[\w-]{6,}/g) ?? [];
	const typo = (v: string) =>
		v.length >= 6 && tokens.some((t) => t !== v && distance(v, t, 2) <= 2);
	let current: string[] = [];
	let prefix = 0;
	const visit = (value: unknown, at: string) => {
		if (/\.model(Id|Name)?$/i.test(at)) return;
		// A column mapping (resource mapper): the headers the node writes.
		if (isRecord(value) && typeof value.mappingMode === 'string') {
			const mapped = isRecord(value.value) ? Object.keys(value.value) : [];
			const schema = (Array.isArray(value.schema) ? value.schema : [])
				.map((column) => (isRecord(column) ? column.id : undefined))
				.filter((id): id is string => typeof id === 'string');
			const columns = mapped.length > 0 ? mapped : schema;
			if (columns.length > 0) {
				current.push(`${at.slice(prefix)} = columns ${JSON.stringify(columns)}`);
				fields.openNames.push({ path: at, value: columns.join(', ') });
			}
			return;
		}
		if (isRecord(value) && value.__rl === true) {
			const v = value.value;
			current.push(`${at.slice(prefix)} = ${JSON.stringify(v)} (${String(value.mode)})`);
			if (typeof v !== 'string' || v.startsWith('=')) return;
			const field = { path: at, value: v };
			// A name is the build's choice: adoption gives the world that name when the case leaves it open.
			if (v === '' || PLACEHOLDER.test(v)) fields.setup.push(field);
			else if (value.mode === 'name') fields.openNames.push(field);
			else if (!caseText.includes(v) && !typo(v)) fields.setup.push(field);
		} else if (typeof value === 'string') {
			if (PLACEHOLDER.test(value)) fields.setup.push({ path: at, value });
		} else if (Array.isArray(value) || isRecord(value)) {
			for (const [key, item] of Object.entries(value)) visit(item, `${at}.${key}`);
		}
	};
	for (const node of nodes) {
		current = [];
		prefix = node.name.length + 1;
		visit(node.parameters ?? {}, node.name);
		if (current.length > 0) fields.resources.push(`${node.name}: ${current.join(', ')}`);
	}
	return fields;
}
