import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import type { TestRun } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash, randomBytes } from 'node:crypto';
import {
	assertCredentialAllowsUrl,
	NodeConnectionTypes,
	type IDataObject,
	type INode,
	type INodeExecutionData,
	type IRun,
	type ITaskData,
	type IWorkflowBase,
} from 'n8n-workflow';
import pLimit from 'p-limit';

import { N8N_VERSION } from '@/constants';
import { CredentialsHelper } from '@/credentials-helper';
import { extractTokenUsage } from '@/evaluation.ee/test-runner/utils.ee';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { getBase } from '@/workflow-execute-additional-data';

const LANGFUSE_CREDENTIAL_TYPE = 'langfuseApi';
const DEFAULT_HOST = 'https://cloud.langfuse.com';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTRIBUTE_BYTES = 100 * 1024;
const MAX_RUN_METADATA_BYTES = 8 * 1024;
const MAX_RESPONSE_BODY_BYTES = 1024 * 1024;
const MAX_CONCURRENT_SENDS = 4;
const MAX_PENDING_CASES = 1000;
const MAX_CHILD_SPANS = 200;
const MAX_TRACE_BYTES = 4 * 1024 * 1024;
const MAX_NODE_ERROR_BYTES = 4 * 1024;
const MAX_ERROR_NAME_LENGTH = 100;
const NODE_ERROR_STATUS_MESSAGE = 'Node execution failed';
const TRUNCATION_MARKER = '... [truncated by n8n]';
const ENVIRONMENT_PATTERN = /^(?!langfuse)[a-z0-9-_]+$/;
const MAX_ENVIRONMENT_LENGTH = 40;
const SPAN_KIND_INTERNAL = 1;
const STATUS_CODE_OK = 1;
const STATUS_CODE_ERROR = 2;
const ROOT_SPAN_NAME = 'n8n-evaluation-item';
const SCOPE_NAME = 'n8n-evaluation';
const SUCCESS_RATE_METRIC = 'n8n_success_rate';
const OBSERVATION_TYPE_GENERATION = 'generation';

interface OtlpKeyValue {
	key: string;
	value: { stringValue: string };
}

export interface OtlpSpan {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	name: string;
	kind: number;
	startTimeUnixNano: string;
	endTimeUnixNano: string;
	attributes: OtlpKeyValue[];
	status: { code: number; message?: string };
}

interface TraceBudget {
	usedBytes: number;
	exceeded: boolean;
}

interface NodeSpanPlan {
	nodeName: string;
	task: ITaskData;
	startMs: number;
	attributes: OtlpKeyValue[];
	errored: boolean;
}

export interface ChildSpanParent {
	traceId: string;
	spanId: string;
	startTimeUnixNano: string;
	endTimeUnixNano: string;
	sharedAttributes: OtlpKeyValue[];
	attributeBytes: number;
}

interface LangfuseScore {
	id: string;
	name: string;
	value: number;
	dataType: 'NUMERIC';
	traceId?: string;
	observationId?: string;
	datasetRunId?: string;
	environment?: string;
	timestamp: string;
	metadata: IDataObject;
}

interface LangfuseRowContext {
	datasetId?: string;
	itemId?: string;
	datasetVersion?: string | null;
	fetchedAt?: string | null;
	expectedOutput?: unknown;
}

export interface ReporterRun {
	host: string;
	authorization: string;
	experimentId: string;
	runName: string;
	datasetId: string;
	testRunId: string;
	workflowName: string;
	description?: string;
	environment?: string;
	metadata: IDataObject;
	includeNodeSpans: boolean;
	includeNodeOutputs: boolean;
	nodesByName: Map<string, INode>;
	pending: Set<Promise<void>>;
	sendLimit: ReturnType<typeof pLimit>;
	droppedCases: number;
	cappedCases: number;
	budgetExceededCases: number;
}

export interface StartRunParams {
	testRun: Pick<TestRun, 'id'>;
	workflow: IWorkflowBase;
	triggerNode: INode;
	testCases: INodeExecutionData[];
	userId?: string;
}

export interface ReportCaseParams {
	testCase: INodeExecutionData;
	status: 'success' | 'error';
	errorCode?: string;
	inputs?: IDataObject;
	outputs?: IDataObject;
	metrics?: Record<string, number>;
	runAt?: Date;
	completedAt?: Date;
	executionId?: string;
	testCaseExecutionId?: string;
	executionData?: IRun;
}

export interface FinishRunParams {
	status: 'success' | 'fail' | 'cancelled';
	aggregatedMetrics: Record<string, number>;
	totalCases: number;
	successCases: number;
}

const isPlainObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

const toJsonString = (value: unknown) => JSON.stringify(value) ?? 'null';

const toNanos = (date: Date) => (BigInt(date.getTime()) * BigInt(1_000_000)).toString();

const truncate = (value: string, limit = MAX_ATTRIBUTE_BYTES) => {
	const bytes = Buffer.from(value);
	if (bytes.length <= limit) return value;

	let end = limit - Buffer.byteLength(TRUNCATION_MARKER);
	while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
	return `${bytes.subarray(0, end).toString('utf8')}${TRUNCATION_MARKER}`;
};

const attribute = (key: string, value: string, { truncated = true } = {}): OtlpKeyValue => ({
	key,
	value: { stringValue: truncated ? truncate(value) : value },
});

const attributeBytes = (attributes: OtlpKeyValue[]) =>
	attributes.reduce((total, entry) => total + Buffer.byteLength(JSON.stringify(entry)), 0);

const withoutLangfuseContext = (value: IDataObject | undefined): IDataObject =>
	Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== '_langfuse'));

const msToNanos = (ms: number) => (BigInt(Math.trunc(ms)) * BigInt(1_000_000)).toString();

const isUsableStartTime = (startTime: unknown): startTime is number =>
	typeof startTime === 'number' && Number.isFinite(startTime) && startTime > 0;

const finiteOr = (value: unknown, fallback: number) =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const describeNodeError = (task: ITaskData, includeMessage: boolean) => {
	const { error, redactedError } = task;
	if (!error && !redactedError) return undefined;
	if (!redactedError && includeMessage && error?.message) {
		return truncate(error.message, MAX_NODE_ERROR_BYTES);
	}

	const { name, httpCode } = redactedError
		? { name: redactedError.type, httpCode: redactedError.httpCode }
		: (error as { name?: unknown; httpCode?: unknown });
	const parts = [
		typeof name === 'string' && name ? name.slice(0, MAX_ERROR_NAME_LENGTH) : undefined,
		(typeof httpCode === 'string' || typeof httpCode === 'number') && /^\d{3}$/.test(`${httpCode}`)
			? `HTTP ${httpCode}`
			: undefined,
	].filter((part) => part !== undefined);

	return parts.length > 0 ? parts.join(' ') : undefined;
};

const wasUsageEstimated = (task: ITaskData) => {
	const json = task.data?.[NodeConnectionTypes.AiLanguageModel]?.[0]?.[0]?.json;
	return json?.tokenUsage === undefined || json.tokenUsage === null;
};

const readModelName = (node: INode | undefined): string | undefined => {
	const parameters = node?.parameters;
	if (!parameters) return undefined;

	const options: IDataObject = isPlainObject(parameters.options)
		? (parameters.options as IDataObject)
		: {};
	for (const candidate of [parameters.model, parameters.modelName, options.model]) {
		const value = isPlainObject(candidate) ? candidate.value : candidate;
		if (typeof value !== 'string') continue;

		const name = value.trim();
		if (name && !name.startsWith('=')) return name;
	}
	return undefined;
};

const firstOutputItem = (task: ITaskData): INodeExecutionData | undefined => {
	const outputs = task.data ?? {};
	for (const connection of [outputs.main, ...Object.values(outputs)]) {
		const item = connection?.find((items) => items && items.length > 0)?.[0];
		if (item) return item;
	}
	return undefined;
};

const isSuccess = (status: number) => status >= 200 && status < 300;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const computeExperimentId = (projectId: string, datasetId: string, runName: string) =>
	sha256Hex(JSON.stringify(['langfuse-experiment-v1', projectId, datasetId, runName])).slice(0, 16);

@Service()
export class LangfuseExperimentReporter {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly logger: Logger,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({ timeout: REQUEST_TIMEOUT_MS });
	}

	async startRun({
		testRun,
		workflow,
		triggerNode,
		testCases,
		userId,
	}: StartRunParams): Promise<ReporterRun | undefined> {
		try {
			const { parameters } = triggerNode;
			if (parameters?.source !== 'langfuse' || parameters.reportToLangfuse === false) {
				return undefined;
			}

			const datasetId = this.readRowContext(testCases[0])?.datasetId;
			if (!datasetId) {
				this.logger.warn('Langfuse reporting skipped: rows carry no dataset id', {
					testRunId: testRun.id,
				});
				return undefined;
			}

			const { host, authorization } = await this.resolveCredentials(workflow, triggerNode, userId);
			const projectId = await this.fetchProjectId(host, authorization);

			const reporting: IDataObject = isPlainObject(parameters.langfuseReporting)
				? (parameters.langfuseReporting as IDataObject)
				: {};

			const runName =
				typeof reporting.runName === 'string' && reporting.runName.trim()
					? reporting.runName
					: `${workflow.name} - ${testRun.id}`;

			const metadata = this.buildRunMetadata(
				this.parseRunMetadata(reporting.runMetadata, testRun.id),
				workflow,
				testRun.id,
			);

			const description =
				typeof reporting.runDescription === 'string' && reporting.runDescription.trim()
					? reporting.runDescription
					: undefined;

			return {
				host,
				authorization,
				experimentId: computeExperimentId(projectId, datasetId, runName),
				runName,
				datasetId,
				testRunId: testRun.id,
				workflowName: workflow.name,
				description,
				environment: this.validateEnvironment(reporting.environment, testRun.id),
				metadata,
				includeNodeSpans: reporting.includeNodeSpans !== false,
				includeNodeOutputs: reporting.includeNodeOutputs === true,
				nodesByName: new Map(workflow.nodes.map((node) => [node.name, node])),
				pending: new Set(),
				sendLimit: pLimit(MAX_CONCURRENT_SENDS),
				droppedCases: 0,
				cappedCases: 0,
				budgetExceededCases: 0,
			};
		} catch (error) {
			this.logger.warn('Failed to start Langfuse experiment reporting', {
				testRunId: testRun.id,
				error: errorMessage(error),
			});
			return undefined;
		}
	}

	reportCase(run: ReporterRun, params: ReportCaseParams): void {
		try {
			const itemContext = this.readRowContext(params.testCase);
			if (!itemContext?.itemId) {
				this.logger.warn('Langfuse reporting skipped for case: row carries no dataset item id', {
					testRunId: run.testRunId,
					testCaseExecutionId: params.testCaseExecutionId,
				});
				return;
			}

			if (run.pending.size >= MAX_PENDING_CASES) {
				if (run.droppedCases++ === 0) {
					this.logger.warn('Langfuse reporting backlog is full; dropping further case reports', {
						testRunId: run.testRunId,
						limit: MAX_PENDING_CASES,
					});
				}
				return;
			}

			const traceId = randomBytes(16).toString('hex');
			const spanId = randomBytes(8).toString('hex');
			const rootSpan = this.buildRootSpan(run, params, itemContext, traceId, spanId);
			const parent: ChildSpanParent = {
				traceId,
				spanId,
				startTimeUnixNano: rootSpan.startTimeUnixNano,
				endTimeUnixNano: rootSpan.endTimeUnixNano,
				sharedAttributes: this.buildLinkingAttributes(run, itemContext.itemId, spanId),
				attributeBytes: attributeBytes(rootSpan.attributes),
			};
			const spans = [rootSpan, ...this.buildChildSpans(run, params.executionData, parent)];
			const scores = this.buildItemScores(
				run,
				itemContext.itemId,
				traceId,
				spanId,
				params.metrics,
				params.completedAt ?? new Date(),
			);

			const task = run.sendLimit(
				async () => await this.sendCase(run, spans, scores, params.testCaseExecutionId),
			);
			run.pending.add(task);
			void task.finally(() => run.pending.delete(task));
		} catch (error) {
			this.logger.warn('Failed to report test case to Langfuse', {
				testRunId: run.testRunId,
				testCaseExecutionId: params.testCaseExecutionId,
				error: errorMessage(error),
			});
		}
	}

	async finishRun(
		run: ReporterRun,
		{ aggregatedMetrics, totalCases, successCases }: FinishRunParams,
	): Promise<void> {
		try {
			while (run.pending.size > 0) await Promise.allSettled([...run.pending]);

			const timestamp = new Date().toISOString();
			const values: Array<[string, number]> = Object.entries(aggregatedMetrics);
			if (totalCases > 0) values.push([SUCCESS_RATE_METRIC, successCases / totalCases]);

			const scores = values
				.filter(([, value]) => Number.isFinite(value))
				.map(
					([name, value]): LangfuseScore => ({
						id: sha256Hex(run.experimentId + name).slice(0, 32),
						datasetRunId: run.experimentId,
						name,
						value,
						dataType: 'NUMERIC',
						...(run.environment ? { environment: run.environment } : {}),
						timestamp,
						metadata: { n8n_test_run_id: run.testRunId },
					}),
				);

			await this.postScores(run, scores, 'run');
		} catch (error) {
			this.logger.warn('Failed to finish Langfuse experiment reporting', {
				testRunId: run.testRunId,
				error: errorMessage(error),
			});
		}
	}

	protected buildChildSpans(
		run: ReporterRun,
		executionData: IRun | undefined,
		parent: ChildSpanParent,
	): OtlpSpan[] {
		const runData = executionData?.data?.resultData?.runData;
		if (!run.includeNodeSpans || !runData) return [];

		const rootStartMs = Number(BigInt(parent.startTimeUnixNano) / BigInt(1_000_000));

		const nodeRuns = Object.entries(runData)
			.flatMap(([nodeName, tasks]) =>
				tasks.map((task, runIndex) => ({
					nodeName,
					task,
					runIndex,
					startMs: isUsableStartTime(task.startTime) ? task.startTime : rootStartMs,
				})),
			)
			.sort(
				(a, b) =>
					a.startMs - b.startMs ||
					finiteOr(a.task.executionIndex, Number.MAX_SAFE_INTEGER) -
						finiteOr(b.task.executionIndex, Number.MAX_SAFE_INTEGER) ||
					(a.nodeName < b.nodeName ? -1 : a.nodeName > b.nodeName ? 1 : 0) ||
					a.runIndex - b.runIndex,
			);

		if (nodeRuns.length > MAX_CHILD_SPANS) {
			if (run.cappedCases++ === 0) {
				this.logger.warn('Langfuse node spans capped; dropping further node runs of a case', {
					testRunId: run.testRunId,
					limit: MAX_CHILD_SPANS,
				});
			}
			nodeRuns.length = MAX_CHILD_SPANS;
		}

		const tokenUsage = extractTokenUsage(runData);
		const budget: TraceBudget = { usedBytes: parent.attributeBytes, exceeded: false };

		const nodeSpans: NodeSpanPlan[] = [];
		for (const { nodeName, task, runIndex, startMs } of nodeRuns) {
			const { attributes, errored } = this.buildNodeAttributes(
				run,
				parent,
				nodeName,
				task,
				runIndex,
				tokenUsage[`${nodeName}__${runIndex}`],
			);
			const bytes = attributeBytes(attributes);

			if (budget.usedBytes + bytes > MAX_TRACE_BYTES) {
				this.markBudgetExceeded(run, budget, 'spans');
				break;
			}

			budget.usedBytes += bytes;
			nodeSpans.push({ nodeName, task, startMs, attributes, errored });
		}

		return nodeSpans.map((plan) => this.buildNodeSpan(run, parent, budget, plan));
	}

	private buildNodeAttributes(
		run: ReporterRun,
		parent: ChildSpanParent,
		nodeName: string,
		task: ITaskData,
		runIndex: number,
		usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined,
	): { attributes: OtlpKeyValue[]; errored: boolean } {
		const node = run.nodesByName.get(nodeName);
		const errored =
			task.executionStatus === 'error' ||
			task.error !== undefined ||
			task.redactedError !== undefined;
		const errorText = describeNodeError(task, run.includeNodeOutputs);
		const model = usage ? readModelName(node) : undefined;

		const attributes: OtlpKeyValue[] = [
			...parent.sharedAttributes,
			...(usage
				? [
						attribute('langfuse.observation.type', OBSERVATION_TYPE_GENERATION),
						...(model ? [attribute('langfuse.observation.model.name', model)] : []),
						attribute(
							'langfuse.observation.usage_details',
							toJsonString({
								input: usage.promptTokens,
								output: usage.completionTokens,
								total: usage.totalTokens,
							}),
							{ truncated: false },
						),
					]
				: []),
			attribute(
				'langfuse.observation.metadata',
				toJsonString({
					node_type: node?.type,
					node_type_version: node?.typeVersion,
					run_index: runIndex,
					...(usage && wasUsageEstimated(task) ? { usage_estimated: true } : {}),
				}),
				{ truncated: false },
			),
			...(errored
				? [
						attribute('langfuse.observation.level', 'ERROR'),
						...(errorText
							? [
									attribute('langfuse.observation.status_message', errorText, {
										truncated: false,
									}),
								]
							: []),
					]
				: []),
		];

		return { attributes, errored };
	}

	private buildNodeSpan(
		run: ReporterRun,
		parent: ChildSpanParent,
		budget: TraceBudget,
		{ nodeName, task, startMs, attributes, errored }: NodeSpanPlan,
	): OtlpSpan {
		const duration = Math.max(0, finiteOr(task.executionTime, 0));
		const outputAttribute = this.buildNodeOutputAttribute(run, budget, task);

		return {
			traceId: parent.traceId,
			spanId: randomBytes(8).toString('hex'),
			parentSpanId: parent.spanId,
			name: nodeName,
			kind: SPAN_KIND_INTERNAL,
			startTimeUnixNano: msToNanos(startMs),
			endTimeUnixNano: msToNanos(startMs + duration),
			attributes: outputAttribute ? [...attributes, outputAttribute] : attributes,
			status: errored
				? { code: STATUS_CODE_ERROR, message: NODE_ERROR_STATUS_MESSAGE }
				: { code: STATUS_CODE_OK },
		};
	}

	private buildNodeOutputAttribute(
		run: ReporterRun,
		budget: TraceBudget,
		task: ITaskData,
	): OtlpKeyValue | undefined {
		if (!run.includeNodeOutputs || budget.exceeded) return undefined;

		const output = firstOutputItem(task);
		if (!output) return undefined;

		const outputAttribute = attribute(
			'langfuse.observation.output',
			toJsonString(withoutLangfuseContext(output.json)),
		);
		const bytes = attributeBytes([outputAttribute]);
		if (budget.usedBytes + bytes <= MAX_TRACE_BYTES) {
			budget.usedBytes += bytes;
			return outputAttribute;
		}

		this.markBudgetExceeded(run, budget, 'outputs');
		return undefined;
	}

	private markBudgetExceeded(run: ReporterRun, budget: TraceBudget, dropped: 'spans' | 'outputs') {
		if (budget.exceeded) return;

		budget.exceeded = true;
		if (run.budgetExceededCases++ === 0) {
			this.logger.warn(`Langfuse node ${dropped} dropped; the trace exceeds its size budget`, {
				testRunId: run.testRunId,
				limitBytes: MAX_TRACE_BYTES,
			});
		}
	}

	private readRowContext(testCase: INodeExecutionData | undefined): LangfuseRowContext | undefined {
		const context = testCase?.json?._langfuse;
		return isPlainObject(context) ? (context as LangfuseRowContext) : undefined;
	}

	private async resolveCredentials(
		workflow: IWorkflowBase,
		triggerNode: INode,
		userId: string | undefined,
	) {
		const credential = triggerNode.credentials?.[LANGFUSE_CREDENTIAL_TYPE];
		if (!credential?.id) throw new Error('Evaluation trigger has no Langfuse credential');

		const { inaccessibleIds } = await this.credentialsPermissionChecker.findInaccessible(
			workflow.id,
			[credential.id],
			userId,
		);
		if (inaccessibleIds.length > 0) {
			throw new Error('Langfuse credential is not accessible to this workflow or user');
		}

		const additionalData = await getBase({ userId, workflowId: workflow.id });
		const data = await this.credentialsHelper.getDecrypted(
			additionalData,
			credential,
			LANGFUSE_CREDENTIAL_TYPE,
			'internal',
		);

		const { publicKey, secretKey } = data;
		if (typeof publicKey !== 'string' || typeof secretKey !== 'string') {
			throw new Error('Langfuse credential is missing its public or secret key');
		}

		const host = this.parseHost(typeof data.host === 'string' ? data.host : '');

		assertCredentialAllowsUrl({
			node: triggerNode,
			credentialData: data,
			url: host,
			surface: 'Evaluation Trigger',
		});

		return {
			host,
			authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`,
		};
	}

	private parseHost(raw: string): string {
		const configured = raw.trim() || DEFAULT_HOST;

		let url: URL;
		try {
			url = new URL(configured);
		} catch {
			throw new Error('Langfuse credential host is not a valid URL');
		}
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error('Langfuse credential host must use http or https');
		}
		if (url.username || url.password) {
			throw new Error('Langfuse credential host must not embed credentials');
		}

		return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
	}

	private async request<T>(
		host: string,
		authorization: string,
		path: string,
		options: { body?: unknown; headers?: Record<string, string> } = {},
	) {
		const hasBody = options.body !== undefined;
		return await this.http.request<T>({
			url: `${host}${path}`,
			method: hasBody ? 'POST' : 'GET',
			headers: {
				Authorization: authorization,
				...(hasBody ? { 'Content-Type': 'application/json' } : {}),
				...options.headers,
			},
			body: hasBody ? JSON.stringify(options.body) : undefined,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
			maxResponseBodyBytes: MAX_RESPONSE_BODY_BYTES,
			timeout: REQUEST_TIMEOUT_MS,
			abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			disableFollowRedirect: true,
		});
	}

	private async fetchProjectId(host: string, authorization: string): Promise<string> {
		const response = await this.request<{ data?: Array<{ id?: unknown }> }>(
			host,
			authorization,
			'/api/public/projects',
		);
		if (!isSuccess(response.statusCode)) {
			throw new Error(`Langfuse project lookup failed with HTTP ${response.statusCode}`);
		}

		const projectId = response.body?.data?.[0]?.id;
		if (typeof projectId !== 'string' || !projectId) {
			throw new Error('Langfuse project lookup returned no project');
		}
		return projectId;
	}

	private buildRunMetadata(
		userMetadata: IDataObject,
		workflow: IWorkflowBase,
		testRunId: string,
	): IDataObject {
		const n8nMetadata: IDataObject = {
			n8n_workflow_id: workflow.id,
			n8n_workflow_version_id: workflow.versionId,
			n8n_test_run_id: testRunId,
			n8n_version: N8N_VERSION,
		};
		const metadata = { ...userMetadata, ...n8nMetadata };

		if (Buffer.byteLength(toJsonString(metadata)) <= MAX_RUN_METADATA_BYTES) return metadata;

		this.logger.warn('Dropping Langfuse run metadata: it exceeds the size limit', { testRunId });
		return n8nMetadata;
	}

	private parseRunMetadata(raw: unknown, testRunId: string): IDataObject {
		if (isPlainObject(raw)) return raw;
		if (typeof raw !== 'string' || !raw.trim()) return {};

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			parsed = undefined;
		}
		if (isPlainObject(parsed)) return parsed;

		this.logger.warn('Ignoring Langfuse run metadata: not a valid JSON object', { testRunId });
		return {};
	}

	private validateEnvironment(raw: unknown, testRunId: string): string | undefined {
		if (typeof raw !== 'string' || !raw) return undefined;
		if (raw.length <= MAX_ENVIRONMENT_LENGTH && ENVIRONMENT_PATTERN.test(raw)) return raw;

		this.logger.warn('Ignoring invalid Langfuse environment', { testRunId });
		return undefined;
	}

	private buildLinkingAttributes(run: ReporterRun, itemId: string, spanId: string): OtlpKeyValue[] {
		return [
			attribute('langfuse.experiment.id', run.experimentId),
			attribute('langfuse.experiment.name', run.runName),
			attribute('langfuse.experiment.dataset.id', run.datasetId),
			attribute('langfuse.experiment.item.id', itemId),
			attribute('langfuse.experiment.item.root_observation_id', spanId),
			attribute('langfuse.experiment.metadata', toJsonString(run.metadata), { truncated: false }),
			...(run.environment ? [attribute('langfuse.environment', run.environment)] : []),
		];
	}

	private buildRootSpan(
		run: ReporterRun,
		params: ReportCaseParams,
		itemContext: LangfuseRowContext,
		traceId: string,
		spanId: string,
	): OtlpSpan {
		const now = new Date();
		const start = params.runAt ?? params.completedAt ?? now;
		const end = params.completedAt ?? now;
		const isError = params.status === 'error';

		const cleanInputs = withoutLangfuseContext(params.inputs);
		const inputs =
			Object.keys(cleanInputs).length > 0
				? cleanInputs
				: withoutLangfuseContext(params.testCase.json);
		const itemVersion = itemContext.datasetVersion ?? itemContext.fetchedAt;

		const observationMetadata: IDataObject = {
			n8n_execution_id: params.executionId,
			n8n_test_case_execution_id: params.testCaseExecutionId,
			status: params.status,
			error_code: params.errorCode,
		};

		const attributes: OtlpKeyValue[] = [
			...this.buildLinkingAttributes(run, itemContext.itemId as string, spanId),
			...(itemVersion ? [attribute('langfuse.experiment.item.version', itemVersion)] : []),
			...(itemContext.expectedOutput !== undefined && itemContext.expectedOutput !== null
				? [
						attribute(
							'langfuse.experiment.item.expected_output',
							toJsonString(itemContext.expectedOutput),
						),
					]
				: []),
			...(run.description ? [attribute('langfuse.experiment.description', run.description)] : []),
			attribute('langfuse.observation.input', toJsonString(inputs)),
			attribute(
				'langfuse.observation.output',
				toJsonString(withoutLangfuseContext(params.outputs)),
			),
			attribute('langfuse.trace.name', run.workflowName),
			attribute('langfuse.observation.metadata', toJsonString(observationMetadata), {
				truncated: false,
			}),
			...(isError
				? [
						attribute('langfuse.observation.level', 'ERROR'),
						...(params.errorCode
							? [attribute('langfuse.observation.status_message', params.errorCode)]
							: []),
					]
				: []),
		];

		return {
			traceId,
			spanId,
			name: ROOT_SPAN_NAME,
			kind: SPAN_KIND_INTERNAL,
			startTimeUnixNano: toNanos(start),
			endTimeUnixNano: toNanos(end < start ? start : end),
			attributes,
			status: isError
				? { code: STATUS_CODE_ERROR, message: params.errorCode }
				: { code: STATUS_CODE_OK },
		};
	}

	private buildItemScores(
		run: ReporterRun,
		itemId: string,
		traceId: string,
		spanId: string,
		metrics: Record<string, number> | undefined,
		completedAt: Date,
	): LangfuseScore[] {
		return Object.entries(metrics ?? {})
			.filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
			.map(([name, value]) => ({
				id: sha256Hex(run.experimentId + run.testRunId + itemId + name).slice(0, 32),
				traceId,
				observationId: spanId,
				name,
				value,
				dataType: 'NUMERIC',
				...(run.environment ? { environment: run.environment } : {}),
				timestamp: completedAt.toISOString(),
				metadata: { n8n_test_run_id: run.testRunId },
			}));
	}

	private async sendCase(
		run: ReporterRun,
		spans: OtlpSpan[],
		scores: LangfuseScore[],
		testCaseExecutionId: string | undefined,
	): Promise<void> {
		try {
			const traceExported = await this.postTraces(run, spans);
			if (traceExported) await this.postScores(run, scores, 'case');
		} catch (error) {
			this.logger.warn('Failed to report test case to Langfuse', {
				testRunId: run.testRunId,
				testCaseExecutionId,
				error: errorMessage(error),
			});
		}
	}

	private async postTraces(run: ReporterRun, spans: OtlpSpan[]): Promise<boolean> {
		const body = {
			resourceSpans: [
				{
					resource: {
						attributes: [
							{ key: 'service.name', value: { stringValue: 'n8n' } },
							{ key: 'service.version', value: { stringValue: N8N_VERSION } },
						],
					},
					scopeSpans: [{ scope: { name: SCOPE_NAME }, spans }],
				},
			],
		};

		const response = await this.request(run.host, run.authorization, '/api/public/otel/v1/traces', {
			body,
			headers: {
				'x-langfuse-ingestion-version': '4',
				'x-langfuse-sdk-name': 'n8n',
				'x-langfuse-sdk-version': N8N_VERSION,
			},
		});

		if (isSuccess(response.statusCode)) return true;

		this.logger.warn('Langfuse rejected the experiment trace', {
			testRunId: run.testRunId,
			status: response.statusCode,
		});
		return false;
	}

	private async postScores(
		run: ReporterRun,
		scores: LangfuseScore[],
		scope: 'case' | 'run',
	): Promise<void> {
		if (scores.length === 0) return;

		const response = await this.request<{
			rejected?: number;
			errors?: Array<{ message?: string }>;
		}>(run.host, run.authorization, '/api/public/scores', { body: scores });

		if (!isSuccess(response.statusCode)) {
			this.logger.warn('Langfuse rejected the experiment scores', {
				testRunId: run.testRunId,
				scope,
				status: response.statusCode,
			});
			return;
		}

		if (response.statusCode === 207) {
			const result = isPlainObject(response.body) ? response.body : {};
			if (result.rejected) {
				this.logger.warn('Langfuse rejected some experiment scores', {
					testRunId: run.testRunId,
					scope,
					rejected: result.rejected,
					errors: result.errors?.map((error) => error.message),
				});
			}
		}
	}
}
