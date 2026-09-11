import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import { formStepJsonSchema, type FormStepJson } from './form-json';

/**
 * The state of a multi-page form run, as the renderer sees it: the next page to
 * show, the completion page, `running` while the workflow is still between two
 * pages, or `finished` when the run ended without a completion page.
 */
export type FormStep = FormStepJson | { kind: 'running' } | { kind: 'finished' };

/** Body of a step page as the visitor submitted it: `field-<i>` keys, arrays for choice lists. */
export type FormStepFields = Record<string, string | string[]>;

export const FORM_STEP_FIELD_KEY = /^field-\d+$/;

/** Query a step page lives under, per form block; `_sig` is the run's resume token, as n8n's own form carries it. */
export const formStepQuery = (blockId: string, executionId: string, token: string): string =>
	`?_form=${encodeURIComponent(blockId)}&_exec=${encodeURIComponent(executionId)}&_sig=${encodeURIComponent(token)}`;

const REQUEST_TIMEOUT_MS = 5_000;
const STATUS_POLL_INTERVAL_MS = 500;
const STATUS_POLL_MAX_MS = 30_000;
const STATUS_SUFFIX = 'n8n-execution-status';
/** Execution statuses the status poll waits out. */
const TRANSIENT_STATUSES = new Set(['new', 'running']);
const FAILED_STATUSES = new Set(['error', 'crashed', 'canceled']);

/**
 * Drives a waiting Form workflow through n8n's own `form-waiting` endpoint over the
 * loopback address (the public `WEBHOOK_URL` may sit behind a proxy that does not
 * route back to this process), asking for JSON instead of the HTML form page.
 */
@Service()
export class FormStepClient {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly logger: Logger,
	) {}

	/** The resume token of a waiting run, which the step query carries as `_sig`. */
	async resumeToken(executionId: string): Promise<string> {
		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		const token = execution?.data.resumeToken;
		if (!token) {
			throw new UnexpectedError('The waiting execution has no resume token', {
				extra: { executionId },
			});
		}
		return token;
	}

	async fetchPage(executionId: string, token: string): Promise<FormStep> {
		const url = this.stepUrl(executionId, token);
		const status = await this.awaitSettled(url);

		if (TRANSIENT_STATUSES.has(status) || status === 'waiting') return { kind: 'running' };
		if (status === 'null') throw new UserError('This form is no longer available');
		if (FAILED_STATUSES.has(status)) throw new OperationalError('The form workflow failed');

		const step = await this.getStep(url);
		// A completion page is itself a waiting Form node: n8n's own completion page
		// posts once so the run can end, and so does this client.
		if (step.kind === 'completion' && status === 'form-waiting') await this.finish(url);
		return step;
	}

	async submitPage(executionId: string, token: string, fields: FormStepFields): Promise<FormStep> {
		const url = this.stepUrl(executionId, token);
		const body = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			body.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
		}

		this.rejectFailure(await this.request(url, { method: 'POST', body }));
		return await this.fetchPage(executionId, token);
	}

	private stepUrl(executionId: string, token: string): URL {
		const url = new URL(
			`/${this.globalConfig.endpoints.formWaiting}/${encodeURIComponent(executionId)}`,
			`http://127.0.0.1:${this.globalConfig.port}`,
		);
		url.searchParams.set('signature', token);
		return url;
	}

	private async request(url: URL, init: RequestInit): Promise<Response> {
		return await fetch(url, {
			...init,
			headers: { accept: 'application/json' },
			redirect: 'manual',
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	}

	/** Polls the execution status until it is no longer transient; the last status seen when the cap runs out. */
	private async awaitSettled(url: URL): Promise<string> {
		const statusUrl = new URL(url);
		statusUrl.pathname = `${statusUrl.pathname}/${STATUS_SUFFIX}`;
		const deadline = Date.now() + STATUS_POLL_MAX_MS;

		for (;;) {
			const response = await this.request(statusUrl, { method: 'GET' });
			this.rejectFailure(response);
			const status = (await response.text()).trim();
			if (!TRANSIENT_STATUSES.has(status) || Date.now() >= deadline) return status;
			await sleep(STATUS_POLL_INTERVAL_MS);
		}
	}

	private async getStep(url: URL): Promise<FormStep> {
		const response = await this.request(url, { method: 'GET' });
		this.rejectFailure(response);
		if (!response.headers.get('content-type')?.includes('application/json')) {
			return { kind: 'finished' };
		}
		const parsed = formStepJsonSchema.safeParse(await response.json());
		if (!parsed.success) {
			throw new UnexpectedError('The form page data is not valid', {
				extra: { issues: parsed.error.issues },
			});
		}
		return parsed.data;
	}

	private async finish(url: URL): Promise<void> {
		try {
			await this.request(url, { method: 'POST' });
		} catch (error) {
			this.logger.warn('Form completion could not resume the execution', {
				executionId: url.pathname.split('/').pop(),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private rejectFailure(response: Response): void {
		if (response.status === 401) throw new UserError('This form link is not valid');
		if (response.status === 404) throw new UserError('This form is no longer available');
		if (response.status >= 400) {
			throw new OperationalError(`The form workflow answered with status ${response.status}`);
		}
	}
}
