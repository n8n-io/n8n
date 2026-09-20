import {
	NodeApiError,
	NodeConnectionTypes,
	isSafeObjectProperty,
	setSafeObjectProperty,
} from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';

import type { ExportTraceServiceRequest, OtlpIds } from './otlp';
import { getParam, type AgentContext, type AgentTrace } from './runAgentOnce';

type HeaderParameter = { name: string; value: string };

export type Decision = 'approved' | 'revise' | 'rejected';

/** Message C from the review service, posted to the signed resume URL. */
export interface DecisionCallbackBody {
	requestId?: string;
	threadId?: string;
	round?: number;
	decision?: Decision;
	suggestions?: string;
	chatInput?: string;
	data?: IDataObject;
}

/** Message B: the service's acknowledgement of a registration. */
export interface RegisterAck {
	requestId: string;
	status: string;
	threadId: string;
	round: number;
}

export interface ServiceConfig {
	url: string;
	headers: IDataObject;
	timeout: number;
	skipSslCertificateValidation: boolean;
	/** OTLP/HTTP traces endpoint; empty disables the export. */
	otlpEndpoint: string;
	otlpHeaders: IDataObject;
}

/** Reads the service connection parameters, identical for both node contexts. */
export function getServiceConfig(ctx: AgentContext): ServiceConfig {
	const options = getParam<{
		registrationTimeout?: number;
		allowUnauthorizedCerts?: boolean;
		otlpEndpoint?: string;
		otlpHeaders?: string;
	}>(ctx, 'options', {});

	// Header names come from the workflow author, so they are untrusted keys
	const headers: IDataObject = {};
	if (getParam(ctx, 'sendHeaders', false)) {
		const { parameters = [] } = getParam<{ parameters?: HeaderParameter[] }>(
			ctx,
			'headerParameters',
			{},
		);
		for (const { name, value } of parameters) {
			if (name && isSafeObjectProperty(name)) {
				setSafeObjectProperty(headers, name, value);
			}
		}
	}

	const url = getParam(ctx, 'url', '');
	// Default OTLP receiver: the review service's own `/v1/traces`, next to `/hitl`
	const defaultOtlp = (() => {
		try {
			return new URL('/v1/traces', url).toString();
		} catch {
			return '';
		}
	})();
	const otlpHeaders: IDataObject = { ...headers };
	for (const line of (options.otlpHeaders ?? '').split(/[\n,]/)) {
		const [name, ...rest] = line.split('=');
		if (name?.trim() && rest.length && isSafeObjectProperty(name.trim())) {
			setSafeObjectProperty(otlpHeaders, name.trim(), rest.join('=').trim());
		}
	}

	return {
		url,
		headers,
		timeout: options.registrationTimeout ?? 10000,
		skipSslCertificateValidation: options.allowUnauthorizedCerts ?? false,
		otlpEndpoint: options.otlpEndpoint?.trim() || defaultOtlp,
		otlpHeaders,
	};
}

/**
 * Ships the round's spans to the OTLP receiver. Best effort: the draft is
 * already registered, so a telemetry failure must not fail the round.
 */
export async function exportOtlp(
	ctx: AgentContext,
	service: ServiceConfig,
	payload: ExportTraceServiceRequest,
): Promise<boolean> {
	if (!service.otlpEndpoint) return false;
	try {
		await ctx.helpers.httpRequest({
			url: service.otlpEndpoint,
			method: 'POST',
			json: true,
			timeout: service.timeout,
			skipSslCertificateValidation: service.skipSslCertificateValidation,
			headers: { ...service.otlpHeaders, 'content-type': 'application/json' },
			body: payload,
		});
		return true;
	} catch (error) {
		ctx.logger.warn('OTLP export of the agent trace failed', {
			endpoint: service.otlpEndpoint,
			error: (error as Error).message,
		});
		return false;
	}
}

/** The resume URL is a bearer capability: keep it readable, hide the signature. */
export function maskResumeUrl(url: unknown): unknown {
	if (typeof url !== 'string') return url;
	return url.replace(/([?&]signature=)[^&]+/, '$1<hmac-signature-masked>');
}

/**
 * Message A: register a draft with the review service. Re-registering with the
 * same execution + node is how the service counts the next round of a thread,
 * so every round of a review goes through here with the same resume URL.
 */
export interface RegistrationExtras {
	trail?: IDataObject[];
	agent?: AgentTrace;
	otel?: OtlpIds;
	mode?: 'sync' | 'async';
}

/** Message A exactly as it is posted. Shared by the real registration and the no-review preview. */
export function buildRegistrationBody(
	ctx: AgentContext,
	draft: IDataObject,
	extras: RegistrationExtras,
	resumeUrl: string,
): IDataObject {
	const workflow = ctx.getWorkflow();
	const node = ctx.getNode();

	const body: IDataObject = {
		executionId: ctx.getExecutionId(),
		workflowId: workflow.id ?? 'unknown',
		workflowName: workflow.name ?? '',
		nodeName: node.name,
		nodeId: node.id,
		registeredAt: new Date().toISOString(),
		resumeUrl,
		data: draft,
	};
	// 'async' tells the service there is no parked execution to resume
	if (extras.mode && extras.mode !== 'sync') body.mode = extras.mode;
	if (extras.trail) body.trail = extras.trail;
	if (extras.agent) body.agent = extras.agent as unknown as IDataObject;
	// W3C ids of the OTLP spans exported for this round, so the service can link them
	if (extras.otel) body.otel = { traceId: extras.otel.traceId, spanId: extras.otel.rootSpanId };
	return body;
}

export async function registerDraft(
	ctx: AgentContext,
	service: ServiceConfig,
	draft: IDataObject,
	extras: RegistrationExtras,
): Promise<RegisterAck & { sentBody: IDataObject }> {
	const body = buildRegistrationBody(ctx, draft, extras, ctx.getSignedResumeUrl());

	const requestOptions: IHttpRequestOptions = {
		url: service.url,
		method: 'POST',
		json: true,
		timeout: service.timeout,
		skipSslCertificateValidation: service.skipSslCertificateValidation,
		headers: service.headers,
		body,
	};

	try {
		const ack = (await ctx.helpers.httpRequest(requestOptions)) as RegisterAck;
		return { ...ack, sentBody: body };
	} catch (error) {
		throw new NodeApiError(ctx.getNode(), error as JsonObject, {
			message: 'Could not register the draft with the review service',
			description: 'The execution was not paused, so no callback is expected.',
		});
	}
}

/**
 * Walks back from this node and records what each ancestor produced, nearest
 * first. The service extracts the original request (`chatInput`) from it on the
 * first registration, so only `execute()` needs to send it.
 */
export function buildTrail(ctx: IExecuteFunctions, depth: number): IDataObject[] {
	const proxy = ctx.getWorkflowDataProxy(0);
	const parents = ctx.getParentNodes(ctx.getNode().name, {
		connectionType: NodeConnectionTypes.Main,
		depth,
	});

	return parents.map(({ name, type, disabled }) => {
		const entry: IDataObject = { node: name, type, executed: !disabled };
		try {
			// A node that never ran on this branch throws rather than returning []
			const items = proxy.$items(name);
			entry.output = items[0]?.json ?? null;
		} catch {
			entry.executed = false;
			entry.output = null;
		}
		return entry;
	});
}

/**
 * Every piece of reviewer feedback given on this thread so far, oldest first.
 * The decision callback only carries the current round's text, so earlier rounds
 * are read back from the service's thread listing. Best effort: a listing
 * failure degrades to just the current feedback rather than failing the round.
 */
interface ServiceRound {
	requestId: string;
	round: number;
	state: string;
	registeredAt: string;
	completedAt?: string;
	executionId: string;
	output: IDataObject;
	trail?: IDataObject[];
	mode?: string;
	decision?: string;
	suggestions?: string;
	agent?: IDataObject;
	otel?: { traceId: string; spanId: string; spanCount?: number; receivedAt?: string };
}

interface ServiceThread {
	threadId: string;
	workflowId: string;
	workflowName: string;
	nodeName: string;
	nodeId: string;
	rounds: ServiceRound[];
}

async function getJson<T>(
	ctx: IWebhookFunctions,
	service: ServiceConfig,
	path: string,
): Promise<T> {
	return (await ctx.helpers.httpRequest({
		url: new URL(path, service.url).toString(),
		method: 'GET',
		json: true,
		timeout: service.timeout,
		skipSslCertificateValidation: service.skipSslCertificateValidation,
		headers: service.headers,
	})) as T;
}

/**
 * Everything this node sent for every round of the thread, read back from the
 * service on resume. n8n discards the run that parked when it resumes, so the
 * `sent` records of earlier rounds are gone on the n8n side; the service still
 * holds the registration content and the OTLP spans exactly as received.
 */
export async function fetchRoundsSent(
	ctx: IWebhookFunctions,
	service: ServiceConfig,
	threadId: string | undefined,
): Promise<IDataObject[]> {
	if (!threadId) return [];
	try {
		const listing = await getJson<{ threads?: ServiceThread[] }>(ctx, service, '/api/threads');
		const thread = listing.threads?.find((t) => t.threadId === threadId);
		if (!thread) return [];
		const rounds: IDataObject[] = [];
		for (const r of thread.rounds) {
			let spans: unknown[] | undefined;
			if (r.otel) {
				try {
					const raw = await getJson<{ spans?: unknown[] }>(
						ctx,
						service,
						`/api/rounds/${encodeURIComponent(r.requestId)}/otel`,
					);
					spans = raw.spans;
				} catch (error) {
					ctx.logger.warn('Could not read the OTLP spans of a review round', {
						requestId: r.requestId,
						error: (error as Error).message,
					});
				}
			}
			rounds.push({
				round: r.round,
				requestId: r.requestId,
				state: r.state,
				decision: r.decision ?? null,
				suggestions: r.suggestions ?? null,
				registration: {
					method: 'POST',
					url: service.url,
					body: {
						executionId: r.executionId,
						workflowId: thread.workflowId,
						workflowName: thread.workflowName,
						nodeName: thread.nodeName,
						nodeId: thread.nodeId,
						registeredAt: r.registeredAt,
						resumeUrl: '<signed resume URL, masked>',
						data: r.output,
						...(r.trail ? { trail: r.trail } : {}),
						...(r.mode ? { mode: r.mode } : {}),
						...(r.otel ? { otel: { traceId: r.otel.traceId, spanId: r.otel.spanId } } : {}),
					},
				},
				trace: r.otel
					? {
							method: 'POST',
							url: service.otlpEndpoint,
							traceId: r.otel.traceId,
							spanCount: r.otel.spanCount ?? spans?.length ?? 0,
							receivedAt: r.otel.receivedAt ?? null,
							spans: spans ?? null,
							summary: r.agent
								? {
										model: (r.agent.model as IDataObject | undefined)?.name,
										usage: r.agent.usage,
										cost: (r.agent.cost as IDataObject | undefined)?.total,
										latencyMs: r.agent.latencyMs,
									}
								: null,
						}
					: null,
			});
		}
		return rounds;
	} catch (error) {
		ctx.logger.warn('Could not read the review rounds back from the service', {
			error: (error as Error).message,
		});
		return [];
	}
}

export async function fetchSuggestionsHistory(
	ctx: IWebhookFunctions,
	service: ServiceConfig,
	threadId: string | undefined,
	current: string | undefined,
): Promise<string[]> {
	const history: string[] = [];
	if (threadId) {
		try {
			const listing = (await ctx.helpers.httpRequest({
				url: new URL('/api/threads', service.url).toString(),
				method: 'GET',
				json: true,
				timeout: service.timeout,
				skipSslCertificateValidation: service.skipSslCertificateValidation,
				headers: service.headers,
			})) as { threads?: Array<{ threadId: string; rounds: Array<{ suggestions?: string }> }> };
			const thread = listing.threads?.find((t) => t.threadId === threadId);
			for (const round of thread?.rounds ?? []) {
				if (round.suggestions) history.push(round.suggestions);
			}
		} catch (error) {
			ctx.logger.warn('Could not read the review thread history', {
				error: (error as Error).message,
			});
		}
	}
	if (current && history.at(-1) !== current) history.push(current);
	return history;
}
