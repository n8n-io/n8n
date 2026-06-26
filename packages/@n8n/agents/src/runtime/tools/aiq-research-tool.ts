import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { ToolContext } from '../../types';
import type { BuiltTool } from '../../types/sdk/tool';

export const AIQ_RESEARCH_TOOL_NAME = 'aiq_research';

const DEFAULT_SERVER_URL = 'http://localhost:8000';
const DEFAULT_LOOPBACK_SERVER_URL = 'http://127.0.0.1:8000';
const DEFAULT_AGENT_TYPE = 'shallow_researcher';
const HEADLESS_HEADERS = { 'Content-Type': 'application/json', 'X-AIQ-Mode': 'headless' };
const LOCAL_BACKEND_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);
const DONE_JOB_STATES = new Set(['completed', 'success', 'failed', 'cancelled', 'failure']);
const SUCCESS_JOB_STATES = new Set(['completed', 'success']);
const DEFAULT_POLL_INTERVAL_SECONDS = 15;
const DEFAULT_MAX_POLL_ATTEMPTS = 240;
const URL_MAX_LENGTH = 2048;
const API_PATH_MAX_LENGTH = 4096;
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;
const CHAT_JOB_ID_PATTERN =
	/Job ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const aiqResearchInputSchema = z
	.object({
		action: z.enum([
			'health',
			'agents',
			'chat',
			'submit',
			'status',
			'state',
			'report',
			'poll',
			'cancel',
		]),
		query: z.string().min(1).optional(),
		jobId: z.string().uuid().optional(),
		agentType: z
			.string()
			.regex(/^[a-zA-Z0-9_.-]{1,128}$/)
			.optional(),
		pollIntervalSeconds: z.number().int().min(1).max(60).optional(),
		maxPollAttempts: z.number().int().min(1).max(240).optional(),
	})
	.superRefine((input, ctx) => {
		if ((input.action === 'chat' || input.action === 'submit') && !input.query) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['query'],
				message: `query is required for action "${input.action}"`,
			});
		}
		if (['status', 'state', 'report', 'poll', 'cancel'].includes(input.action) && !input.jobId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['jobId'],
				message: `jobId is required for action "${input.action}"`,
			});
		}
	});

type AiqResearchInput = z.infer<typeof aiqResearchInputSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateBaseUrl(url: string): string {
	const raw = url.trim();
	if (!raw) throw new Error('AIQ_SERVER_URL is empty');
	if (raw.length > URL_MAX_LENGTH || CONTROL_CHAR_PATTERN.test(raw)) {
		throw new Error('AIQ_SERVER_URL is invalid');
	}

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error('AIQ_SERVER_URL must be an http or https URL with a host');
	}

	if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.host) {
		throw new Error('AIQ_SERVER_URL must be an http or https URL with a host');
	}
	if (parsed.username || parsed.password) {
		throw new Error('AIQ_SERVER_URL must not include user:password@');
	}
	if (parsed.protocol === 'http:' && !LOCAL_BACKEND_HOSTS.has(parsed.hostname)) {
		throw new Error('Non-local AIQ_SERVER_URL values must use https');
	}

	return raw.replace(/\/+$/, '');
}

function validateApiPath(path: string): void {
	if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid AI-Q API path');
	if (path.length > API_PATH_MAX_LENGTH || path.includes('..') || CONTROL_CHAR_PATTERN.test(path)) {
		throw new Error('Invalid AI-Q API path');
	}
}

function aiqBaseUrls(): string[] {
	if (process.env.AIQ_SERVER_URL !== undefined) {
		return [validateBaseUrl(process.env.AIQ_SERVER_URL)];
	}

	return [validateBaseUrl(DEFAULT_SERVER_URL), validateBaseUrl(DEFAULT_LOOPBACK_SERVER_URL)];
}

function formatFetchError(error: unknown): string {
	if (error instanceof Error) {
		const cause = 'cause' in error ? error.cause : undefined;
		return cause ? `${error.message}: ${formatFetchError(cause)}` : error.message;
	}
	if (isRecord(error)) {
		return Object.entries(error)
			.filter(([, value]) => typeof value === 'string' || typeof value === 'number')
			.map(([key, value]) => `${key}=${String(value)}`)
			.join(', ');
	}
	return String(error);
}

async function apiRequest(
	method: 'GET' | 'POST',
	path: string,
	body?: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<unknown> {
	validateApiPath(path);
	const requestInit = {
		method,
		...(method === 'POST'
			? {
					headers: HEADLESS_HEADERS,
					body: JSON.stringify(body ?? {}),
				}
			: {}),
		...(signal ? { signal } : {}),
	};
	const errors: string[] = [];
	let response: Response | undefined;

	for (const baseUrl of aiqBaseUrls()) {
		try {
			response = await globalThis.fetch(`${baseUrl}${path}`, requestInit);
			break;
		} catch (error) {
			errors.push(`${baseUrl}${path}: ${formatFetchError(error)}`);
		}
	}

	if (!response) {
		throw new Error(
			`AI-Q request could not reach the backend. Tried ${errors.join('; ')}. ` +
				'Start AI-Q or set AIQ_SERVER_URL to the reachable backend URL.',
		);
	}

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`AI-Q request failed with HTTP ${response.status}: ${text.slice(0, 1000)}`);
	}
	if (!text) return {};

	try {
		return JSON.parse(text) as unknown;
	} catch (error) {
		throw new Error(
			`Invalid JSON in AI-Q response: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

async function health(signal?: AbortSignal): Promise<unknown> {
	for (const path of ['/health', '/v1/health']) {
		try {
			return await apiRequest('GET', path, undefined, signal);
		} catch {}
	}
	return await apiRequest('GET', '/', undefined, signal);
}

function extractChatJobId(response: unknown): string | undefined {
	if (!isRecord(response)) return undefined;
	const choices = response.choices;
	if (!Array.isArray(choices)) return undefined;
	const firstChoice = choices[0];
	if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return undefined;
	const content = firstChoice.message.content;
	if (typeof content !== 'string') return undefined;
	return CHAT_JOB_ID_PATTERN.exec(content)?.[1];
}

function statusValue(status: unknown): string | undefined {
	if (!isRecord(status)) return undefined;
	const value = status.status;
	return typeof value === 'string' ? value.toLowerCase() : undefined;
}

async function sleep(seconds: number, signal?: AbortSignal): Promise<boolean> {
	if (signal?.aborted) return false;
	return await new Promise((resolve) => {
		const timeout = setTimeout(() => {
			signal?.removeEventListener('abort', abort);
			resolve(true);
		}, seconds * 1000);
		const abort = () => {
			clearTimeout(timeout);
			resolve(false);
		};
		signal?.addEventListener('abort', abort, { once: true });
	});
}

async function pollJob(input: AiqResearchInput, ctx: ToolContext): Promise<unknown> {
	const jobId = input.jobId;
	if (!jobId) throw new Error('jobId is required for action "poll"');
	const interval = input.pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS;
	const maxAttempts = input.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const status = await apiRequest(
			'GET',
			`/v1/jobs/async/job/${jobId}`,
			undefined,
			ctx.abortSignal,
		);
		const state = statusValue(status);
		if (state && DONE_JOB_STATES.has(state)) {
			if (SUCCESS_JOB_STATES.has(state)) {
				return await apiRequest(
					'GET',
					`/v1/jobs/async/job/${jobId}/report`,
					undefined,
					ctx.abortSignal,
				);
			}
			return status;
		}
		const shouldContinue = await sleep(interval, ctx.abortSignal);
		if (!shouldContinue) return { status: 'cancelled', jobId };
	}

	return { status: 'timeout', jobId };
}

async function handleAiqResearch(input: AiqResearchInput, ctx: ToolContext): Promise<unknown> {
	switch (input.action) {
		case 'health':
			return await health(ctx.abortSignal);
		case 'agents':
			return await apiRequest('GET', '/v1/jobs/async/agents', undefined, ctx.abortSignal);
		case 'chat': {
			const response = await apiRequest(
				'POST',
				'/chat',
				{ messages: [{ role: 'user', content: input.query }] },
				ctx.abortSignal,
			);
			const jobId = extractChatJobId(response);
			return jobId ? { status: 'deep_research_running', jobId } : response;
		}
		case 'submit':
			return await apiRequest(
				'POST',
				'/v1/jobs/async/submit',
				{ agent_type: input.agentType ?? DEFAULT_AGENT_TYPE, input: input.query },
				ctx.abortSignal,
			);
		case 'status':
			return await apiRequest(
				'GET',
				`/v1/jobs/async/job/${input.jobId}`,
				undefined,
				ctx.abortSignal,
			);
		case 'state':
			return await apiRequest(
				'GET',
				`/v1/jobs/async/job/${input.jobId}/state`,
				undefined,
				ctx.abortSignal,
			);
		case 'report':
			return await apiRequest(
				'GET',
				`/v1/jobs/async/job/${input.jobId}/report`,
				undefined,
				ctx.abortSignal,
			);
		case 'poll':
			return await pollJob(input, ctx);
		case 'cancel':
			return await apiRequest(
				'POST',
				`/v1/jobs/async/job/${input.jobId}/cancel`,
				undefined,
				ctx.abortSignal,
			);
	}
}

export function createAiqResearchTool(): BuiltTool {
	return new Tool(AIQ_RESEARCH_TOOL_NAME)
		.description(
			'Call a locally running NVIDIA AI-Q Blueprint backend for routed chat and async research job lifecycle operations.',
		)
		.systemInstruction(
			'Use aiq_research only after loading the aiq-research skill. Call health before sending user query text. Preserve citations and source URLs returned by AI-Q.',
		)
		.input(aiqResearchInputSchema)
		.handler(async (input, ctx) => await handleAiqResearch(input, ctx))
		.build();
}
