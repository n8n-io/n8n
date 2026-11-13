import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import type { IDataObject } from 'n8n-workflow';

import { CompiledEngineConfig } from './compiled-engine.config';
import type { WfrtEvent } from './compiled-engine.types';
import { isDataObject, parseWfrtEvent } from './compiled-engine.types';

export class WfrtRequestError extends OperationalError {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
	}
}

/** The body of `PUT /_admin/workflows/<workflowId>`. */
export interface WfrtWorkflowUpload {
	versionId: string;
	module: Buffer;
	active: boolean;
	webhookPrefix: string;
	/** Whether `wfrt` sends step args and results of this workflow's executions. */
	saveData: boolean;
	/** The credentials document (spec section 7) of this workflow. */
	credentials: Record<string, unknown>;
	/** `$execution.resumeUrl` is this base, a slash and the execution id. */
	resumeUrlBase: string;
	/** `$execution.resumeFormUrl` is this base, a slash and the execution id. */
	resumeFormUrlBase: string;
	/** n8n's copy of the workflow static data (spec section 9.7); it replaces the copy in `wfrt`. */
	staticData?: IDataObject;
}

/** One entry of `GET /_admin/workflows`. */
export interface WfrtWorkflowStatus {
	workflowId: string;
	versionId: string;
	active: boolean;
	/** Live and parked executions of the current version. */
	executions: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Client of the admin API of `wfrt` (spec section 9.1). The API listens on
 * `127.0.0.1` only, and each request carries the admin secret.
 */
@Service()
export class WfrtAdminClient {
	private secret = '';

	constructor(
		private readonly config: CompiledEngineConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	setSecret(secret: string) {
		this.secret = secret;
	}

	get adminUrl() {
		return `http://127.0.0.1:${this.config.adminPort}`;
	}

	get publicUrl() {
		return `http://127.0.0.1:${this.config.port}`;
	}

	async putWorkflow(workflowId: string, upload: WfrtWorkflowUpload) {
		await this.request('PUT', `/_admin/workflows/${encodeURIComponent(workflowId)}`, {
			versionId: upload.versionId,
			module: upload.module.toString('base64'),
			active: upload.active,
			webhookPrefix: upload.webhookPrefix,
			saveData: upload.saveData,
			credentials: upload.credentials,
			resumeUrlBase: upload.resumeUrlBase,
			resumeFormUrlBase: upload.resumeFormUrlBase,
			...(upload.staticData === undefined ? {} : { staticData: upload.staticData }),
		});
	}

	/** The static data that `wfrt` holds for a workflow; `{}` when it has none. */
	async getStaticData(workflowId: string): Promise<IDataObject> {
		const parsed: unknown = JSON.parse(
			await this.request('GET', `/_admin/workflows/${encodeURIComponent(workflowId)}/static-data`),
		);
		return isDataObject(parsed) ? parsed : {};
	}

	/** Replaces the variables that `$vars` gives to new executions. */
	async putVariables(variables: Record<string, string>) {
		await this.request('PUT', '/_admin/variables', variables);
	}

	async listWorkflows(): Promise<WfrtWorkflowStatus[]> {
		const parsed: unknown = JSON.parse(await this.request('GET', '/_admin/workflows'));
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isRecord).map((w) => ({
			workflowId: String(w.workflowId ?? ''),
			versionId: String(w.versionId ?? ''),
			active: w.active === true,
			executions: typeof w.executions === 'number' ? w.executions : 0,
		}));
	}

	/** Cancels a live or parked execution. Returns false when `wfrt` does not know it. */
	async cancelExecution(executionId: string): Promise<boolean> {
		try {
			await this.request('DELETE', `/_admin/executions/${encodeURIComponent(executionId)}`);
			return true;
		} catch (error) {
			if (error instanceof WfrtRequestError && error.status === 404) return false;
			throw error;
		}
	}

	async deleteWorkflow(workflowId: string) {
		try {
			await this.request('DELETE', `/_admin/workflows/${encodeURIComponent(workflowId)}`);
		} catch (error) {
			// A workflow that `wfrt` does not know has nothing to stop.
			if (error instanceof WfrtRequestError && error.status === 404) return;
			throw error;
		}
	}

	async startExecution(input: {
		workflowId: string;
		versionId: string;
		executionId: string;
		trigger: unknown;
		trace: boolean;
	}) {
		await this.request('POST', '/_admin/executions', input);
	}

	/**
	 * Completes the approval that an execution waits on. Without `effectSeq`,
	 * `wfrt` resumes the one approval that the execution waits on now. `wfrt`
	 * refuses a missing or wrong signature with 403.
	 */
	async resume(
		executionId: string,
		effectSeq: string | undefined,
		signature: string | undefined,
		value: unknown,
	) {
		const tail = effectSeq === undefined ? '' : `/${encodeURIComponent(effectSeq)}`;
		const query = `?signature=${encodeURIComponent(signature ?? '')}`;
		await this.request(
			'POST',
			`/_admin/resume/${encodeURIComponent(executionId)}${tail}${query}`,
			value,
		);
	}

	/**
	 * Answers a service call (spec section 9.9). Returns false when `wfrt` waits
	 * for no such call: it has an answer already, or its execution ended.
	 */
	async answerService(callId: string, answer: unknown): Promise<boolean> {
		try {
			await this.request('POST', `/_admin/services/${encodeURIComponent(callId)}`, answer);
			return true;
		} catch (error) {
			if (error instanceof WfrtRequestError && error.status === 404) return false;
			throw error;
		}
	}

	/**
	 * Reads the event stream until it ends or `signal` aborts. `onOpen` runs
	 * once the stream is open, so the caller knows that `wfrt` is ready.
	 */
	async streamEvents(
		signal: AbortSignal,
		onOpen: () => Promise<void> | void,
		onEvent: (event: WfrtEvent) => void,
	) {
		// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- loopback API of the local wfrt process
		const response = await fetch(`${this.adminUrl}/_admin/events`, {
			headers: { authorization: `Bearer ${this.secret}` },
			signal,
		});
		if (!response.ok || !response.body) {
			throw new WfrtRequestError(
				`wfrt refused the event stream with status ${response.status}`,
				response.status,
			);
		}
		await onOpen();

		const decoder = new TextDecoder();
		let buffer = '';
		for await (const chunk of response.body) {
			buffer += decoder.decode(chunk, { stream: true });
			let newline = buffer.indexOf('\n');
			while (newline >= 0) {
				const line = buffer.slice(0, newline).trim();
				buffer = buffer.slice(newline + 1);
				if (line.length > 0) {
					const event = parseWfrtEvent(line);
					if (event) onEvent(event);
					else this.logger.debug('Ignored an unknown wfrt event', { line: line.slice(0, 200) });
				}
				newline = buffer.indexOf('\n');
			}
		}
	}

	/**
	 * Sends one admin request. The admin port does not answer
	 * `Expect: 100-continue`; `fetch` never sends that header, and this client
	 * sets only `authorization` and `content-type`.
	 */
	private async request(method: string, path: string, body?: unknown) {
		let response: Response;
		try {
			// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- loopback API of the local wfrt process
			response = await fetch(`${this.adminUrl}${path}`, {
				method,
				headers: {
					authorization: `Bearer ${this.secret}`,
					...(body === undefined ? {} : { 'content-type': 'application/json' }),
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
		} catch (error) {
			throw new WfrtRequestError(
				`Could not reach wfrt at ${this.adminUrl}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		if (!response.ok) {
			const text = await response.text().catch(() => '');
			throw new WfrtRequestError(
				`wfrt answered ${method} ${path} with status ${response.status}: ${text.slice(0, 500)}`,
				response.status,
			);
		}
		return await response.text();
	}
}
