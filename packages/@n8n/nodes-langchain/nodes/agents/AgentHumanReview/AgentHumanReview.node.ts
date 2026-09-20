import {
	NodeConnectionTypes,
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode, textInput } from '@utils/descriptions';

import {
	newSpanId,
	newTraceId,
	toOtlp,
	type ExportTraceServiceRequest,
	type OtlpIds,
} from './helpers/otlp';
import {
	buildRegistrationBody,
	buildTrail,
	exportOtlp,
	fetchAgentInfo,
	fetchRoundsSent,
	fetchSuggestionsHistory,
	getServiceConfig,
	HITL_CREDENTIAL,
	maskResumeUrl,
	registerDraft,
	type DecisionCallbackBody,
	type RegisterAck,
	type ServiceConfig,
} from './helpers/review';
import {
	getParam,
	runAgentOnce,
	type AgentContext,
	type AgentOptions,
	type AgentTrace,
	type TraceContext,
} from './helpers/runAgentOnce';
import { commonOptions } from '../Agent/agents/ToolsAgent/options';
import { getInputs } from '../Agent/utils';

const APPROVED = 0;
const REJECTED = 1;

type ReviewMode = 'sync' | 'async' | 'none';

/**
 * An AI agent whose answer is held back until a human approves it. The draft is
 * registered with a review service and the execution is parked. A "revise"
 * decision re-runs the agent with the reviewer's feedback and parks again —
 * all inside this node — so nothing downstream sees an unapproved answer.
 */
export class AgentHumanReview implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Agent with Human Review',
		name: 'agentHumanReview',
		icon: 'fa:user-check',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		description: 'Runs an AI agent and releases its answer only once a human has approved it',
		defaults: {
			name: 'AI Agent with Human Review',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Root Nodes'],
			},
		},
		inputs: `={{
			((hasOutputParser, needsFallback) => {
				${getInputs.toString()};
				return getInputs(true, hasOutputParser, needsFallback);
			})($parameter.hasOutputParser === true, $parameter.needsFallback === true)
		}}`,
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['Approved', 'Rejected'],
		credentials: [
			{
				name: HITL_CREDENTIAL,
				required: true,
				displayOptions: { show: { reviewMode: ['sync', 'async'] } },
			},
		],
		// `restartWebhook` marks these as execution-resumers rather than triggers.
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				responseData: '',
				path: '={{ $nodeId }}',
				restartWebhook: true,
				isFullPath: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				responseData: '',
				path: '={{ $nodeId }}',
				restartWebhook: true,
				isFullPath: true,
			},
		],
		properties: [
			{
				displayName: 'Review Mode',
				name: 'reviewMode',
				type: 'options',
				default: 'sync',
				noDataExpression: true,
				options: [
					{
						name: 'Wait for Review (Blocking)',
						value: 'sync',
						description:
							'The execution pauses until a reviewer decides. "Request changes" re-runs the agent inside this node; only Approve or Reject continue the workflow.',
					},
					{
						name: 'Review in Background (Non-Blocking)',
						value: 'async',
						description:
							'The workflow continues immediately with the draft. The draft is sent for review as an audit record; the decision is stored in the review service but does not affect this execution.',
					},
					{
						name: 'No Review',
						value: 'none',
						description: 'Behaves like the plain AI Agent. Nothing is sent to the review service.',
					},
				],
			},
			{
				displayName: 'Agent Name or ID',
				name: 'agentId',
				type: 'options',
				default: '',
				displayOptions: { show: { reviewMode: ['sync', 'async'] } },
				typeOptions: { loadOptionsMethod: 'getAgents', loadOptionsDependsOn: ['reviewMode'] },
				description:
					'Which registered agent this node acts as, from the review service (its Agents panel). The ID is sent with every round and trace so reviews and spans can be grouped per agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName:
					'The agent runs, its draft is sent for review, and the execution pauses. "Request changes" re-runs the agent with the feedback; only Approve or Reject continue the workflow.',
				name: 'noticeSync',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['sync'] } },
			},
			{
				displayName:
					'The draft continues down the Approved output right away with a `review` field carrying the request and thread IDs. Reviewers can still approve, request changes or reject in the service UI, which records feedback for audit and analytics only.',
				name: 'noticeAsync',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['async'] } },
			},
			{
				displayName:
					'<b>Data sent to the review service</b> (POST to <code>&lt;Base URL&gt;/hitl</code> from the selected credential, authenticated with its token, once per round):<br>' +
					'• <b>Identity</b>: execution ID, workflow ID and name, node ID and name, timestamp<br>' +
					'• <b>Resume URL</b>: a signed n8n callback address (HMAC, only valid for this execution)<br>' +
					"• <b>The draft</b>: the agent's answer (<code>data</code>)<br>" +
					'• <b>Upstream context</b> (<code>trail</code>): outputs of the preceding nodes, only when <i>Include Upstream Context</i> is on<br>' +
					'• <b>Trace IDs</b>: OpenTelemetry trace/span IDs, only when <i>Export Agent Trace</i> is on<br>' +
					'Credentials, API keys and the chat model configuration are <b>never</b> sent. The <b>exact request bodies</b> (registration and OTLP trace) are attached to the output item as <code>review-trace.json</code> — open the <b>Binary</b> tab of the output and click View to read them as JSON.',
				name: 'noticeDataSent',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['sync', 'async'] } },
			},
			{
				displayName:
					'<b>Trace exported</b> (OTLP, to the OTLP Endpoint in Options — the review service by default):<br>' +
					'• Model provider and name, temperature / max tokens, tokens in/out (incl. cache), estimated cost in USD<br>' +
					'• One span per model call and per tool call with latency and status<br>' +
					'• <b>Content</b> — the prompt, system message, model outputs and tool inputs/outputs — only while <i>Record Trace Content</i> is on (Options)<br>' +
					'• Workflow/execution/node IDs, review round and thread IDs, and your <i>Trace Attributes</i>',
				name: 'noticeTraceSent',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['sync', 'async'], includeAgentTrace: [true] } },
			},
			{
				displayName:
					'<b>Nothing leaves this instance.</b> No registration, no trace export — the agent runs and its answer continues down the Approved output. A <code>review-preview.json</code> file is attached to the output item (Binary tab) with the exact registration and OTLP trace bodies that enabling review <i>would</i> send, so you can inspect them first.',
				name: 'noticeNoneSent',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['none'] } },
			},
			// n8n's waiting-webhook handler only HMAC-validates a resume URL when the
			// node declares this operation; otherwise it expects a plain resumeToken
			// and rejects a signed URL with 401.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				default: SEND_AND_WAIT_OPERATION,
			},
			promptTypeOptions,
			{
				...textFromPreviousNode,
				displayOptions: { show: { promptType: ['auto'] } },
			},
			{
				...textInput,
				displayOptions: { show: { promptType: ['define'] } },
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'hasOutputParser',
				type: 'boolean',
				default: false,
				noDataExpression: true,
			},
			{
				displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
				name: 'outputParserNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { hasOutputParser: [true] } },
			},
			{
				displayName: 'Enable Fallback Model',
				name: 'needsFallback',
				type: 'boolean',
				default: false,
				noDataExpression: true,
			},
			{
				displayName:
					'Connect an additional language model on the canvas to use it as a fallback if the main model fails',
				name: 'fallbackNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { needsFallback: [true] } },
			},
			{
				displayName: 'Include Upstream Context',
				name: 'includeContext',
				displayOptions: { show: { reviewMode: ['sync', 'async'] } },
				type: 'boolean',
				default: true,
				description:
					'Whether to also send what the preceding nodes produced. A reviewer needs the question, not just the answer — and a revise round needs the original input to compose from.',
			},
			{
				displayName: 'Context Depth',
				name: 'contextDepth',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 2,
				displayOptions: { show: { includeContext: [true], reviewMode: ['sync', 'async'] } },
				description: 'How many nodes back to walk. Raising this grows the payload.',
			},
			{
				displayName: 'Export Agent Trace (OTLP)',
				name: 'includeAgentTrace',
				displayOptions: { show: { reviewMode: ['sync', 'async'] } },
				type: 'boolean',
				default: true,
				description:
					"Whether to export each round as OpenTelemetry spans (GenAI semantic conventions): model calls, tool calls, token usage and cost. Sent to the OTLP endpoint in Options, by default the review service's /v1/traces.",
			},
			{
				displayName: 'Limit Wait Time',
				name: 'limitWaitTime',
				displayOptions: { show: { reviewMode: ['sync'] } },
				type: 'boolean',
				default: false,
				description:
					'Whether to give up after a set time. By default the execution waits indefinitely for a decision.',
			},
			{
				displayName: 'Max Wait (Minutes)',
				name: 'maxWaitMinutes',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 60,
				displayOptions: { show: { limitWaitTime: [true], reviewMode: ['sync'] } },
				description:
					'Continue on the Rejected output once this many minutes have passed without a decision',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					...commonOptions.filter((option) =>
						['systemMessage', 'maxIterations', 'returnIntermediateSteps'].includes(option.name),
					),
					{
						displayName: 'OTLP Endpoint',
						name: 'otlpEndpoint',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'string',
						default: '',
						placeholder: 'http://localhost:3100/v1/traces',
						description:
							'Where to POST the OTLP/HTTP JSON traces. Leave empty to use /v1/traces on the review service host. Any OTLP receiver works, e.g. Langfuse: https://cloud.langfuse.com/api/public/otel/v1/traces.',
					},
					{
						displayName: 'OTLP Headers',
						name: 'otlpHeaders',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'string',
						default: '',
						placeholder: 'Authorization=Basic …',
						description:
							'Extra headers for the OTLP endpoint, one name=value per line. The review service headers are sent too.',
					},
					{
						displayName: 'Record Trace Content',
						name: 'otlpRecordContent',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'boolean',
						default: true,
						description:
							'Whether prompts, model outputs and tool payloads are included in the spans. Turn off to export only metrics.',
					},
					{
						displayName: 'Trace Attributes (JSON)',
						name: 'traceAttributes',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'json',
						default: '',
						placeholder: '{ "team": "support", "env": "prod" }',
						description:
							'Custom attributes attached to every trace sent to the review service, like Langfuse metadata',
					},
					{
						displayName: 'Trace Content Limit',
						name: 'traceContentLimit',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'number',
						typeOptions: { minValue: 0 },
						default: 4000,
						description:
							'Max characters kept per prompt, response or tool payload in the trace. 0 keeps everything.',
					},
					{
						displayName: 'Model Pricing Override (JSON)',
						name: 'pricingOverride',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'json',
						default: '',
						placeholder: '{ "claude-sonnet-4-6": { "input": 3, "output": 15 } }',
						description:
							'USD per 1M tokens by model ID prefix, used to compute cost. Built-in list prices are used when a model is not listed here.',
					},
					{
						displayName: 'Attach Full Trace as File',
						name: 'attachTraceFile',
						type: 'boolean',
						default: true,
						description:
							'Whether to attach the exact registration and OTLP trace payloads as a JSON file on the output item (Output → Binary tab, viewable as JSON). In No Review mode the file shows what enabling review would send.',
					},
					{
						displayName: 'Registration Timeout',
						name: 'registrationTimeout',
						displayOptions: { show: { '/reviewMode': ['sync', 'async'] } },
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 10000,
						description:
							'Time in ms to wait for the registration acknowledgement. Unrelated to how long the reviewer may then take.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials<{
					baseUrl: string;
					apiToken?: string;
					allowUnauthorizedCerts?: boolean;
				}>(HITL_CREDENTIAL);
				const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
				const response = (await this.helpers.httpRequest({
					url: `${baseUrl}/api/agents`,
					method: 'GET',
					json: true,
					skipSslCertificateValidation: credentials.allowUnauthorizedCerts ?? false,
					headers: credentials.apiToken ? { 'x-hitl-token': credentials.apiToken } : {},
				})) as { agents?: Array<{ id: string; name: string; description?: string }> };
				const agents = response.agents ?? [];
				if (agents.length === 0) {
					return [
						{
							name: 'No Agents Registered Yet',
							value: '',
							description: 'Add one in the review service (Agents panel), then reload this list',
						},
					];
				}
				return agents.map((a) => ({
					name: a.name,
					value: a.id,
					description: a.description ? `ID ${a.id} — ${a.description}` : `ID ${a.id}`,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// putExecutionToWait pauses the whole execution, so a per-item loop is not
		// expressible. Callers batch with a Loop Over Items node upstream.
		if (items.length !== 1) {
			throw new NodeOperationError(
				this.getNode(),
				`This node handles exactly one item at a time, but received ${items.length}`,
				{ description: 'Add a "Loop Over Items" node upstream to split the batch.' },
			);
		}

		const reviewMode = this.getNodeParameter('reviewMode', 0, 'sync') as ReviewMode;
		const agentId = getParam(this, 'agentId', '') || undefined;
		const agentInfo =
			reviewMode === 'none'
				? { agentId }
				: await fetchAgentInfo(this, await getServiceConfig(this), agentId);

		const input = getPromptInput(this);
		const { output, trace } = await runAgentOnce(
			this,
			input,
			getAgentOptions(this),
			traceContext(this, { round: 0, sessionId: items[0].json.sessionId, ...agentInfo }),
		);

		// No review: plain agent behaviour, and nothing leaves the instance.
		if (reviewMode === 'none') {
			// Built with the same code as a real round, so the user can inspect
			// exactly what enabling review would send. Nothing is posted.
			return outputs(
				APPROVED,
				output,
				await traceAttachment(this, 'review-preview.json', {
					reviewMode: 'none',
					...(await previewRecord(this, output, trace)),
				}),
			);
		}

		const service = await getServiceConfig(this);
		const includeTrace = this.getNodeParameter('includeAgentTrace', 0, true) as boolean;
		const trail = (this.getNodeParameter('includeContext', 0, true) as boolean)
			? buildTrail(this, this.getNodeParameter('contextDepth', 0, 2) as number)
			: undefined;
		const otel = includeTrace ? { traceId: newTraceId(), rootSpanId: newSpanId() } : undefined;

		// Register first. Parking after a failed registration would strand the
		// execution forever, since nothing would exist to call the resume URL.
		const ack = await registerDraft(this, service, output, {
			trail,
			otel,
			mode: reviewMode,
			agentId: getParam(this, 'agentId', '') || undefined,
		});
		const traceResult = otel ? await exportTrace(this, service, trace, otel, ack) : undefined;
		const sent = sentRecord(service, ack.sentBody, traceResult);

		// Background review: the draft goes downstream now; the decision is an audit record.
		if (reviewMode === 'async') {
			return outputs(
				APPROVED,
				{
					...output,
					review: {
						mode: 'async',
						status: 'pending',
						requestId: ack.requestId,
						threadId: ack.threadId,
						round: ack.round,
					},
				},
				await traceAttachment(this, 'review-trace.json', {
					reviewMode: 'async',
					round: ack.round,
					requestId: ack.requestId,
					threadId: ack.threadId,
					...sent,
				}),
			);
		}

		let waitTill = WAIT_INDEFINITELY;
		if (this.getNodeParameter('limitWaitTime', 0, false) as boolean) {
			const maxWaitMinutes = this.getNodeParameter('maxWaitMinutes', 0, 60) as number;
			waitTill = new Date(Date.now() + maxWaitMinutes * 60 * 1000);
		}
		await this.putExecutionToWait(waitTill);

		// Only used if the wait times out; a decision replaces this via webhook().
		return outputs(
			REJECTED,
			{
				...output,
				reason: 'No decision was received before the wait time ran out',
				round: ack.round,
				threadId: ack.threadId,
				suggestionsHistory: [],
			},
			await traceAttachment(this, 'review-trace.json', {
				reviewMode: 'sync',
				status: 'timeout',
				round: ack.round,
				requestId: ack.requestId,
				threadId: ack.threadId,
				...sent,
			}),
		);
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		if (this.getWebhookName() !== 'default' || this.getRequestObject().method !== 'POST') {
			return { webhookResponse: { status: 'waiting' } };
		}

		const body = this.getBodyData() as DecisionCallbackBody;
		const service = await getServiceConfig(this);
		const suggestionsHistory = await fetchSuggestionsHistory(
			this,
			service,
			body.threadId,
			body.suggestions,
		);
		// The run that registered each round is gone on resume, so the exact
		// payloads of every round are read back from the service for the output.
		const rounds =
			body.decision === 'revise' ? [] : await fetchRoundsSent(this, service, body.threadId);
		const common = { round: body.round, threadId: body.threadId, suggestionsHistory };
		// One entry per round: the registration content and the OTLP spans as the
		// service received them — attached as a file, not mixed into the answer.
		const attachment =
			body.decision === 'revise'
				? undefined
				: await traceAttachment(this, 'review-trace.json', {
						reviewMode: 'sync',
						status: body.decision,
						requestId: body.requestId,
						threadId: body.threadId,
						rounds,
						neverSent: ['credentials', 'API keys', 'chat model configuration'],
					});

		switch (body.decision) {
			case 'approved':
				return {
					webhookResponse: { status: 'approved', ...common },
					workflowData: outputs(APPROVED, { ...(body.data ?? {}), ...common }, attachment),
				};

			case 'rejected':
				return {
					webhookResponse: { status: 'rejected', ...common },
					workflowData: outputs(
						REJECTED,
						{ ...(body.data ?? {}), reason: body.suggestions ?? '', ...common },
						attachment,
					),
				};

			case 'revise': {
				if (!body.chatInput) {
					throw new NodeOperationError(
						this.getNode(),
						'A revise decision must carry "chatInput" — the prompt for the next round',
					);
				}
				const { output, trace } = await runAgentOnce(
					this,
					body.chatInput,
					getAgentOptions(this),
					traceContext(this, {
						round: (body.round ?? 0) + 1,
						threadId: body.threadId,
						previousRequestId: body.requestId,
						reviewerFeedback: body.suggestions,
						...(await fetchAgentInfo(this, service, getParam(this, 'agentId', '') || undefined)),
					}),
				);
				const otel = getParam(this, 'includeAgentTrace', true)
					? { traceId: newTraceId(), rootSpanId: newSpanId() }
					: undefined;
				const ack = await registerDraft(this, service, output, {
					otel,
					agentId: getParam(this, 'agentId', '') || undefined,
				});
				const traceResult = otel ? await exportTrace(this, service, trace, otel, ack) : undefined;
				// No workflowData: the execution stays parked on the same resume URL
				// and the service now holds the next round for review.
				return {
					webhookResponse: {
						status: 'revised',
						round: ack.round,
						threadId: ack.threadId,
						sent: sentRecord(service, ack.sentBody, traceResult),
					},
				};
			}

			default:
				throw new NodeOperationError(
					this.getNode(),
					`Unknown decision "${String(body.decision)}" — expected approved, revise or rejected`,
				);
		}
	}
}

function outputs(
	index: number,
	json: IDataObject,
	binary?: INodeExecutionData['binary'],
): INodeExecutionData[][] {
	const result: INodeExecutionData[][] = [[], []];
	result[index] = [{ json, pairedItem: { item: 0 }, ...(binary ? { binary } : {}) }];
	return result;
}

const TRACE_BINARY_KEY = 'trace';

/**
 * The full trace goes on the item as a JSON file (Output → Binary tab), not in
 * the JSON output, so the answer stays readable and the evidence stays attached.
 */
async function traceAttachment(
	ctx: AgentContext,
	fileName: string,
	content: IDataObject,
): Promise<INodeExecutionData['binary'] | undefined> {
	const options = getParam<{ attachTraceFile?: boolean }>(ctx, 'options', {});
	if (options.attachTraceFile === false) return undefined;
	const data = await ctx.helpers.prepareBinaryData(
		Buffer.from(JSON.stringify(content, null, 2), 'utf8'),
		fileName,
		'application/json',
	);
	return { [TRACE_BINARY_KEY]: data };
}

/** Serialises the round as OTLP spans and ships them; registration already succeeded. */
async function exportTrace(
	ctx: AgentContext,
	service: ServiceConfig,
	trace: AgentTrace,
	otel: OtlpIds,
	ack: RegisterAck,
): Promise<{ exported: boolean; payload: ExportTraceServiceRequest }> {
	const options = getParam<{ otlpRecordContent?: boolean }>(ctx, 'options', {});
	const payload = toOtlp(
		trace,
		otel,
		{ requestId: ack.requestId, threadId: ack.threadId, round: ack.round },
		{ recordContent: options.otlpRecordContent ?? true, serviceName: 'n8n' },
	);
	return { exported: await exportOtlp(ctx, service, payload), payload };
}

/**
 * The exact payloads this node sent, attached to the output item so a workflow
 * author can verify them without reading service logs. Only the resume URL's
 * HMAC signature is masked — it is a bearer capability for this execution.
 */
function sentRecord(
	service: ServiceConfig,
	registrationBody: IDataObject,
	traceResult?: { exported: boolean; payload: ExportTraceServiceRequest },
): IDataObject {
	return {
		registration: {
			method: 'POST',
			url: service.url,
			headers: Object.keys(service.headers),
			body: { ...registrationBody, resumeUrl: maskResumeUrl(registrationBody.resumeUrl) },
		},
		trace: traceResult
			? {
					method: 'POST',
					url: service.otlpEndpoint,
					headers: Object.keys(service.otlpHeaders),
					delivered: traceResult.exported,
					body: traceResult.payload as unknown as IDataObject,
				}
			: null,
		neverSent: ['credentials', 'API keys', 'chat model configuration'],
	};
}

/**
 * What a review round would send, for the no-review mode. Uses the real
 * builders with placeholder ids, since no registration, resume URL or trace
 * export exists without review.
 */
async function previewRecord(
	ctx: IExecuteFunctions,
	output: IDataObject,
	trace: AgentTrace,
): Promise<IDataObject> {
	// No credential is required in this mode; fall back to the default base URL
	const service = await getServiceConfig(ctx, 'preview');
	const options = getParam<{ otlpRecordContent?: boolean }>(ctx, 'options', {});
	const trail = getParam(ctx, 'includeContext', true)
		? buildTrail(ctx, getParam(ctx, 'contextDepth', 2))
		: undefined;
	const otel = getParam(ctx, 'includeAgentTrace', true)
		? { traceId: newTraceId(), rootSpanId: newSpanId() }
		: undefined;
	const registration = buildRegistrationBody(
		ctx,
		output,
		{ trail, otel, agentId: getParam(ctx, 'agentId', '') || undefined },
		'<signed resume URL, generated only when review is enabled>',
	);
	const traceBody = otel
		? toOtlp(
				trace,
				otel,
				{ requestId: '<assigned by the review service>', round: 0 },
				{ recordContent: options.otlpRecordContent ?? true, serviceName: 'n8n' },
			)
		: undefined;
	return {
		note: 'Nothing was sent. This is what "Wait for Review" or "Review in Background" would post.',
		registration: { method: 'POST', url: service.url, body: registration },
		trace: traceBody
			? { method: 'POST', url: service.otlpEndpoint, body: traceBody as unknown as IDataObject }
			: null,
		neverSent: ['credentials', 'API keys', 'chat model configuration'],
	};
}

/** Workflow-level identifiers that let the service correlate a trace with n8n. */
function traceContext(ctx: AgentContext, extra: IDataObject): TraceContext {
	const workflow = ctx.getWorkflow();
	const node = ctx.getNode();
	const context: TraceContext = {
		executionId: ctx.getExecutionId(),
		executionMode: ctx.getMode(),
		workflowId: workflow.id ?? 'unknown',
		workflowName: workflow.name ?? '',
		nodeId: node.id,
		nodeName: node.name,
		nodeType: node.type,
		nodeVersion: node.typeVersion,
		promptType: getParam(ctx, 'promptType', 'auto'),
		instanceId: ctx.getInstanceId(),
	};
	for (const [key, value] of Object.entries(extra)) {
		if (value !== undefined && value !== null && value !== '') context[key] = value;
	}
	return context;
}

function getAgentOptions(ctx: AgentContext): AgentOptions {
	return getParam<AgentOptions>(ctx, 'options', {});
}

/** Same resolution as the stock agent: chat trigger input, or an explicit prompt. */
function getPromptInput(ctx: IExecuteFunctions): string {
	const promptType = ctx.getNodeParameter('promptType', 0, 'auto') as string;
	const input =
		promptType === 'auto'
			? (ctx.evaluateExpression('{{ $json["chatInput"] }}', 0) as string)
			: (ctx.getNodeParameter('text', 0) as string);

	if (input === undefined || input === null || input === '') {
		throw new NodeOperationError(ctx.getNode(), 'No prompt specified', {
			description:
				promptType === 'auto'
					? "Expected to find the prompt in an input field called 'chatInput' (what the Chat Trigger outputs). To use something else, change the 'Source for Prompt' parameter."
					: 'The "text" parameter is empty.',
		});
	}
	return input;
}
