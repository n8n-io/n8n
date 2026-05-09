// ---------------------------------------------------------------------------
// HTTP client for n8n REST + instance-ai APIs
//
// Used by the evaluation runner to interact with a running n8n instance:
// authenticate, send chat messages, confirm actions, and query the REST API
// for post-run verification.
// ---------------------------------------------------------------------------

import type {
	InstanceAiConfirmRequest,
	InstanceAiRichMessagesResponse,
	InstanceAiEvalExecutionResult,
	InstanceAiEvalSubAgentRequest,
	InstanceAiEvalSubAgentResponse,
} from '@n8n/api-types';

// ---------------------------------------------------------------------------
// Response shapes from the n8n REST API (wrapped in { data: ... })
// ---------------------------------------------------------------------------

/** A node as returned by the n8n REST API — the fields eval code reads. */
export interface WorkflowNodeResponse {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
	disabled?: boolean;
	credentials?: Record<string, unknown>;
}

/** A workflow as returned by GET /rest/workflows/:id. */
export interface WorkflowResponse {
	id: string;
	name: string;
	active: boolean;
	versionId: string;
	description?: string;
	nodes: WorkflowNodeResponse[];
	connections: Record<string, unknown>;
	pinData?: Record<string, unknown>;
}

interface WorkflowListItem {
	id: string;
	name: string;
	active: boolean;
	nodes: WorkflowNodeResponse[];
}

interface ExecutionListItem {
	id: string;
	workflowId: string;
	status: string;
}

export interface ExecutionDetail {
	id: string;
	workflowId: string;
	status: string;
	/** Flatted-serialized execution data (contains error details, run data per node) */
	data: string;
}

// -- Thread types ------------------------------------------------------------

interface ThreadStatus {
	hasActiveRun: boolean;
	isSuspended: boolean;
	backgroundTasks: Array<{
		taskId: string;
		role: string;
		agentId: string;
		status: 'running' | 'completed' | 'failed' | 'cancelled';
		startedAt: number;
		runId?: string;
		messageGroupId?: string;
	}>;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class N8nClient {
	private sessionCookie?: string;

	constructor(private readonly baseUrl: string) {}

	// -- Auth ----------------------------------------------------------------

	/**
	 * Authenticate with the n8n instance via POST /rest/login.
	 * Captures the `n8n-auth` cookie for subsequent requests.
	 */
	async login(email?: string, password?: string): Promise<void> {
		// Defaults match the E2E test owner created by the E2E_TESTS=true bootstrap
		const loginEmail = email ?? process.env.N8N_EVAL_EMAIL ?? 'nathan@n8n.io';
		const loginPassword = password ?? process.env.N8N_EVAL_PASSWORD ?? 'PlaywrightTest123';

		await this.fetch('/rest/login', {
			method: 'POST',
			body: { emailOrLdapLoginId: loginEmail, password: loginPassword },
		});

		if (!this.sessionCookie) {
			throw new Error('Failed to authenticate with n8n — no session cookie received');
		}
	}

	// -- Instance-AI endpoints -----------------------------------------------

	/**
	 * Send a chat message to the instance-ai agent.
	 * POST /rest/instance-ai/chat/:threadId  body: { message }
	 */
	async sendMessage(threadId: string, message: string): Promise<{ runId: string }> {
		const result = await this.fetch(`/rest/instance-ai/chat/${threadId}`, {
			method: 'POST',
			body: { message },
		});
		return result as { runId: string };
	}

	/**
	 * Confirm or reject an action requested by the agent.
	 * POST /rest/instance-ai/confirm/:requestId
	 * body: kind-tagged `InstanceAiConfirmRequest` discriminated union.
	 */
	async confirmAction(requestId: string, payload: InstanceAiConfirmRequest): Promise<void> {
		await this.fetch(`/rest/instance-ai/confirm/${requestId}`, {
			method: 'POST',
			body: payload,
		});
	}

	/**
	 * Cancel the active run for a thread.
	 * POST /rest/instance-ai/chat/:threadId/cancel
	 */
	async cancelRun(threadId: string): Promise<void> {
		await this.fetch(`/rest/instance-ai/chat/${threadId}/cancel`, {
			method: 'POST',
		});
	}

	/**
	 * Run an isolated sub-agent on the instance and return its result.
	 * POST /rest/instance-ai/eval/run-sub-agent
	 */
	async runSubAgentEval(
		request: InstanceAiEvalSubAgentRequest,
	): Promise<InstanceAiEvalSubAgentResponse> {
		const result = (await this.fetch('/rest/instance-ai/eval/run-sub-agent', {
			method: 'POST',
			body: request,
		})) as { data: InstanceAiEvalSubAgentResponse };
		return result.data;
	}

	/**
	 * Get the current status of a thread (active run, suspended, background tasks).
	 * GET /rest/instance-ai/threads/:threadId/status
	 */
	async getThreadStatus(threadId: string): Promise<ThreadStatus> {
		return (await this.fetch(`/rest/instance-ai/threads/${threadId}/status`)) as ThreadStatus;
	}

	/**
	 * Get rich messages for a thread (structured agent trees with tool call results).
	 * GET /rest/instance-ai/threads/:threadId/messages
	 */
	async getThreadMessages(threadId: string): Promise<InstanceAiRichMessagesResponse> {
		const result = (await this.fetch(`/rest/instance-ai/threads/${threadId}/messages`)) as {
			data: InstanceAiRichMessagesResponse;
		};
		return result.data;
	}

	/**
	 * Delete a thread (and its memory + run state).
	 * DELETE /rest/instance-ai/threads/:threadId
	 */
	async deleteThread(threadId: string): Promise<void> {
		await this.fetch(`/rest/instance-ai/threads/${threadId}`, { method: 'DELETE' });
	}

	// -- REST API (verification helpers) -------------------------------------

	/**
	 * List all workflows visible to the authenticated user.
	 * GET /rest/workflows
	 */
	async listWorkflows(): Promise<WorkflowListItem[]> {
		const result = (await this.fetch('/rest/workflows')) as { data: WorkflowListItem[] };
		return result.data;
	}

	/** List all workflow IDs visible to the authenticated user. */
	async listWorkflowIds(): Promise<string[]> {
		const workflows = await this.listWorkflows();
		return workflows.map((w) => w.id);
	}

	/**
	 * Create a workflow from a JSON definition.
	 * POST /rest/workflows
	 */
	async createWorkflow(definition: Record<string, unknown>): Promise<{ id: string }> {
		const result = (await this.fetch('/rest/workflows', {
			method: 'POST',
			body: definition,
		})) as { data: { id: string } };
		return { id: result.data.id };
	}

	/** List all credential IDs visible to the authenticated user. */
	async listCredentialIds(): Promise<string[]> {
		const result = (await this.fetch('/rest/credentials')) as {
			data: Array<{ id: string }>;
		};
		return Array.isArray(result.data) ? result.data.map((c) => c.id) : [];
	}

	/**
	 * Get a single workflow by ID.
	 * GET /rest/workflows/:id
	 */
	async getWorkflow(id: string): Promise<WorkflowResponse> {
		const result = (await this.fetch(`/rest/workflows/${id}`)) as {
			data: WorkflowResponse;
		};
		return result.data;
	}

	/**
	 * List executions, optionally filtered by workflow ID.
	 * GET /rest/executions?workflowId=:id
	 */
	async listExecutions(workflowId?: string): Promise<ExecutionListItem[]> {
		const query = workflowId ? `?workflowId=${workflowId}` : '';
		const result = (await this.fetch(`/rest/executions${query}`)) as {
			data: ExecutionListItem[] | { results: ExecutionListItem[]; count: number };
		};
		// The API may return either a direct array or { results: [...], count }
		return Array.isArray(result.data) ? result.data : result.data.results;
	}

	/**
	 * Execute a workflow manually.
	 * POST /rest/workflows/:id/run  body: { triggerToStartFrom?: { name } }
	 */
	async executeWorkflow(
		workflowId: string,
		triggerNodeName?: string,
	): Promise<{ executionId: string }> {
		const body: Record<string, unknown> = {};
		if (triggerNodeName) {
			body.triggerToStartFrom = { name: triggerNodeName };
		}
		const result = (await this.fetch(`/rest/workflows/${workflowId}/run`, {
			method: 'POST',
			body,
		})) as { data: { executionId: string } };
		return { executionId: result.data.executionId };
	}

	/**
	 * Get a single execution by ID.
	 * GET /rest/executions/:id
	 */
	async getExecution(executionId: string): Promise<ExecutionDetail> {
		const result = (await this.fetch(`/rest/executions/${executionId}`)) as {
			data: ExecutionDetail;
		};
		return result.data;
	}

	/**
	 * Update a workflow (partial update).
	 * PATCH /rest/workflows/:id -- used to set/restore pin data for execution eval.
	 */
	async updateWorkflow(id: string, updates: Record<string, unknown>): Promise<WorkflowResponse> {
		const result = (await this.fetch(`/rest/workflows/${id}`, {
			method: 'PATCH',
			body: updates,
		})) as { data: WorkflowResponse };
		return result.data;
	}

	/**
	 * Activate a workflow.
	 * POST /rest/workflows/:id/activate  body: { versionId, name, description }
	 *
	 * The activate endpoint requires the current `versionId` (concurrency
	 * guard) plus optional name/description for the version label. We fetch
	 * the workflow first to read those — the harness creates workflows from
	 * JSON fixtures and never knows the freshly-assigned versionId otherwise.
	 *
	 * Note: PATCH /rest/workflows/:id silently drops `active` from the body
	 * (`workflows.controller.ts:318` filters it from user input), so the old
	 * `PATCH … { active: true }` shape used to no-op rather than activate.
	 */
	async activateWorkflow(id: string): Promise<void> {
		const workflow = await this.getWorkflow(id);
		await this.fetch(`/rest/workflows/${id}/activate`, {
			method: 'POST',
			body: {
				versionId: workflow.versionId,
				name: workflow.name,
				description: workflow.description ?? '',
			},
		});
	}

	/**
	 * Deactivate a workflow.
	 * POST /rest/workflows/:id/deactivate  body: {}
	 */
	async deactivateWorkflow(id: string): Promise<void> {
		await this.fetch(`/rest/workflows/${id}/deactivate`, {
			method: 'POST',
			body: {},
		});
	}

	/**
	 * Call a live webhook endpoint.
	 * Sends an HTTP request to ${baseUrl}/webhook/${path} and returns the
	 * status code and parsed response body. The workflow must be active.
	 */
	async callWebhook(
		path: string,
		method: string,
		body?: Record<string, unknown>,
	): Promise<{ status: number; data: unknown }> {
		const url = `${this.baseUrl}/webhook/${path}`;
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.sessionCookie) {
			headers.cookie = this.sessionCookie;
		}

		const res = await fetch(url, {
			method: method.toUpperCase(),
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		let data: unknown;
		const contentType = res.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			data = await res.json();
		} else {
			data = await res.text();
		}

		return { status: res.status, data };
	}

	/**
	 * Archive a workflow (soft-delete). Required before hard-deleting.
	 * POST /rest/workflows/:id/archive
	 */
	async archiveWorkflow(id: string): Promise<void> {
		await this.fetch(`/rest/workflows/${id}/archive`, { method: 'POST' });
	}

	/**
	 * Delete a workflow by ID. The workflow must be archived first.
	 * DELETE /rest/workflows/:id
	 */
	async deleteWorkflow(id: string): Promise<void> {
		await this.archiveWorkflow(id);
		await this.fetch(`/rest/workflows/${id}`, { method: 'DELETE' });
	}

	/**
	 * Create a credential.
	 * POST /rest/credentials  body: { name, type, data }
	 */
	async createCredential(
		name: string,
		type: string,
		data: Record<string, unknown>,
	): Promise<{ id: string }> {
		const result = (await this.fetch('/rest/credentials', {
			method: 'POST',
			body: { name, type, data },
		})) as { data: { id: string } };
		return { id: result.data.id };
	}

	/**
	 * Delete a credential by ID.
	 * DELETE /rest/credentials/:id
	 */
	async deleteCredential(id: string): Promise<void> {
		await this.fetch(`/rest/credentials/${id}`, { method: 'DELETE' });
	}

	// -- Data tables ---------------------------------------------------------

	/**
	 * Get the personal project ID for the authenticated user.
	 * GET /rest/projects/personal
	 */
	async getPersonalProjectId(): Promise<string> {
		const result = (await this.fetch('/rest/projects/personal')) as {
			data: { id: string };
		};
		if (!result.data?.id) {
			throw new Error('Could not determine personal project ID');
		}
		return result.data.id;
	}

	/**
	 * List data tables in a project.
	 * GET /rest/projects/:projectId/data-tables
	 */
	async listDataTables(projectId: string): Promise<Array<{ id: string; name: string }>> {
		const result = (await this.fetch(`/rest/projects/${projectId}/data-tables`)) as {
			data: Array<{ id: string; name: string }>;
		};
		return Array.isArray(result.data) ? result.data : [];
	}

	/** List data table IDs for a project. */
	async listDataTableIds(projectId: string): Promise<string[]> {
		const dataTables = await this.listDataTables(projectId);
		return dataTables.map((dt) => dt.id);
	}

	/**
	 * Delete a data table by ID.
	 * DELETE /rest/projects/:projectId/data-tables/:dataTableId
	 */
	async deleteDataTable(projectId: string, dataTableId: string): Promise<void> {
		await this.fetch(`/rest/projects/${projectId}/data-tables/${dataTableId}`, {
			method: 'DELETE',
		});
	}

	// -- Eval mock execution -------------------------------------------------

	/**
	 * Execute a workflow with LLM-based HTTP mocking.
	 * The server handles hint generation and mock execution in a single synchronous call.
	 */
	async executeWithLlmMock(
		workflowId: string,
		scenarioHints?: string,
		timeoutMs: number = 120_000,
	): Promise<InstanceAiEvalExecutionResult> {
		const result = (await this.fetch(`/rest/instance-ai/eval/execute-with-llm-mock/${workflowId}`, {
			method: 'POST',
			body: scenarioHints ? { scenarioHints } : {},
			timeoutMs,
		})) as { data: InstanceAiEvalExecutionResult };
		return result.data;
	}

	// -- SSE helpers ---------------------------------------------------------

	/**
	 * Build the SSE events URL for a given thread.
	 * Used by the SSE client to open a streaming connection.
	 */
	getEventsUrl(threadId: string): string {
		return `${this.baseUrl}/rest/instance-ai/events/${threadId}`;
	}

	/**
	 * Expose the session cookie so the SSE client can authenticate.
	 */
	get cookie(): string {
		if (!this.sessionCookie) {
			throw new Error('Not authenticated — call login() first');
		}
		return this.sessionCookie;
	}

	// -- Internal fetch ------------------------------------------------------

	private async fetch(
		path: string,
		options: { method?: string; body?: unknown; timeoutMs?: number } = {},
	): Promise<unknown> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };

		if (this.sessionCookie) {
			headers.cookie = this.sessionCookie;
		}

		const method = options.method ?? 'GET';

		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: options.body ? JSON.stringify(options.body) : undefined,
			...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`n8n API ${method} ${path} failed (${res.status}): ${text}`);
		}

		// Capture auth cookie from login response
		const setCookie = res.headers.get('set-cookie');
		if (setCookie) {
			const match = setCookie.match(/n8n-auth=[^;]+/);
			if (match) {
				this.sessionCookie = match[0];
			}
		}

		return await res.json();
	}
}
