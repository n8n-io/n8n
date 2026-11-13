/**
 * The n8n URLs that nodes build: the instance, webhook and form base URLs, and
 * the resume URLs of the execution.
 *
 * n8n starts the host with the base URLs in the environment
 * (`WF_FALLBACK_INSTANCE_BASE_URL`, `WF_FALLBACK_WEBHOOK_BASE_URL`,
 * `WF_FALLBACK_WEBHOOK_WAITING_BASE_URL`, `WF_FALLBACK_FORM_BASE_URL`,
 * `WF_FALLBACK_FORM_WAITING_BASE_URL`). Without them the host uses
 * `http://localhost:5678` and n8n's paths.
 *
 * A step frame can carry `execution: { id, mode, resumeUrl, resumeFormUrl }`
 * from the runtime. n8n-core builds `$execution.resumeUrl` as
 * `<webhookWaitingBaseUrl>/<executionId>?signature=<token>`, so the host splits
 * the runtime's URL into these parts. n8n then builds the same URL again, with
 * its `signature`.
 */
import { isJsonObject } from './protocol';

const DEFAULT_BASE = 'http://localhost:5678';

/** The query parameter of the resume token (`WAITING_TOKEN_QUERY_PARAM` of n8n-core). */
const TOKEN_PARAM = 'signature';

export interface BaseUrls {
	instanceBaseUrl: string;
	webhookBaseUrl: string;
	webhookWaitingBaseUrl: string;
	formBaseUrl: string;
	formWaitingBaseUrl: string;
}

function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

/** The base URLs of `process.env`, read once: a read of `process.env` is slow, and nodes ask for the URLs many times in each step. */
let processBaseUrls: BaseUrls | undefined;

/** The base URLs from the environment. The caller gets its own copy. */
export function baseUrls(env: NodeJS.ProcessEnv = process.env): BaseUrls {
	if (env !== process.env) return readBaseUrls(env);
	processBaseUrls ??= readBaseUrls(env);
	return { ...processBaseUrls };
}

function readBaseUrls(env: NodeJS.ProcessEnv): BaseUrls {
	const instance = trimSlash(env.WF_FALLBACK_INSTANCE_BASE_URL ?? DEFAULT_BASE);
	return {
		instanceBaseUrl: instance,
		webhookBaseUrl: trimSlash(env.WF_FALLBACK_WEBHOOK_BASE_URL ?? `${instance}/webhook`),
		webhookWaitingBaseUrl: trimSlash(
			env.WF_FALLBACK_WEBHOOK_WAITING_BASE_URL ?? `${instance}/webhook-waiting`,
		),
		formBaseUrl: trimSlash(env.WF_FALLBACK_FORM_BASE_URL ?? `${instance}/form`),
		formWaitingBaseUrl: trimSlash(
			env.WF_FALLBACK_FORM_WAITING_BASE_URL ?? `${instance}/form-waiting`,
		),
	};
}

/** The execution data of a step frame. */
export interface FrameExecution {
	id: string;
	/** The id of the workflow of the execution (the location of its binary data). */
	workflowId?: string;
	mode: 'test' | 'production';
	resumeUrl?: string;
	resumeFormUrl?: string;
}

export function readFrameExecution(value: unknown): FrameExecution | undefined {
	if (!isJsonObject(value) || typeof value.id !== 'string') return undefined;
	return {
		id: value.id,
		...(typeof value.workflowId === 'string' && value.workflowId !== ''
			? { workflowId: value.workflowId }
			: {}),
		mode: value.mode === 'test' ? 'test' : 'production',
		resumeUrl: typeof value.resumeUrl === 'string' ? value.resumeUrl : undefined,
		resumeFormUrl: typeof value.resumeFormUrl === 'string' ? value.resumeFormUrl : undefined,
	};
}

/**
 * Splits `<base>/<id>?signature=<token>` into the base and the token, so
 * n8n-core builds the same URL. Undefined when the URL has another form.
 */
export function splitResumeUrl(
	url: string,
	id: string,
): { base: string; token: string | undefined } | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}
	const suffix = `/${encodeURIComponent(id)}`;
	if (!parsed.pathname.endsWith(suffix)) return undefined;
	const token = parsed.searchParams.get(TOKEN_PARAM) ?? undefined;
	parsed.searchParams.delete(TOKEN_PARAM);
	if ([...parsed.searchParams.keys()].length > 0) return undefined;
	const base = `${parsed.origin}${parsed.pathname.slice(0, -suffix.length)}`;
	return { base, token };
}

/**
 * The base URLs for a step: the environment, with the waiting bases of the
 * frame's resume URLs, and the resume token.
 */
export function stepUrls(
	execution: FrameExecution | undefined,
	env: NodeJS.ProcessEnv = process.env,
): { urls: BaseUrls; token: string | undefined } {
	const urls = baseUrls(env);
	if (!execution) return { urls, token: undefined };
	let token: string | undefined;
	if (execution.resumeUrl) {
		const split = splitResumeUrl(execution.resumeUrl, execution.id);
		if (split) {
			urls.webhookWaitingBaseUrl = split.base;
			token = split.token;
		}
	}
	if (execution.resumeFormUrl) {
		const split = splitResumeUrl(execution.resumeFormUrl, execution.id);
		if (split) {
			urls.formWaitingBaseUrl = split.base;
			token ??= split.token;
		}
	}
	return { urls, token };
}
