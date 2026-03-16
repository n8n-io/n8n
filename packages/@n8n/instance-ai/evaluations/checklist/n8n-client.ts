// ---------------------------------------------------------------------------
// HTTP client for n8n REST + instance-ai APIs
//
// Used by the checklist evaluation runner to interact with a running n8n
// instance: authenticate, send chat messages, confirm actions, and query
// the REST API for post-run verification.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Response shapes from the n8n REST API (wrapped in { data: ... })
// ---------------------------------------------------------------------------

interface WorkflowNode {
	type: string;
	name: string;
}

interface WorkflowListItem {
	id: string;
	name: string;
	active: boolean;
	nodes: WorkflowNode[];
}

interface ExecutionListItem {
	id: string;
	workflowId: string;
	status: string;
}

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

	// ── Auth ──────────────────────────────────────────────────────────────

	/**
	 * Authenticate with the n8n instance via POST /rest/login.
	 * Captures the `n8n-auth` cookie for subsequent requests.
	 */
	async login(email?: string, password?: string): Promise<void> {
		const loginEmail = email ?? process.env.N8N_EVAL_EMAIL ?? 'admin@n8n.io';
		const loginPassword = password ?? process.env.N8N_EVAL_PASSWORD ?? 'password';

		await this.fetch('/rest/login', {
			method: 'POST',
			body: { emailOrLdapLoginId: loginEmail, password: loginPassword },
		});

		if (!this.sessionCookie) {
			throw new Error('Failed to authenticate with n8n — no session cookie received');
		}
	}

	// ── Instance-AI endpoints ─────────────────────────────────────────────

	/**
	 * Send a chat message to the instance-ai agent.
	 * POST /instance-ai/chat/:threadId  body: { message }
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
	 * POST /instance-ai/confirm/:requestId  body: { approved }
	 */
	async confirmAction(requestId: string, approved: boolean): Promise<void> {
		await this.fetch(`/rest/instance-ai/confirm/${requestId}`, {
			method: 'POST',
			body: { approved },
		});
	}

	/**
	 * Cancel the active run for a thread.
	 * POST /instance-ai/chat/:threadId/cancel
	 */
	async cancelRun(threadId: string): Promise<void> {
		await this.fetch(`/rest/instance-ai/chat/${threadId}/cancel`, {
			method: 'POST',
		});
	}

	/**
	 * Get the current status of a thread (active run, suspended, background tasks).
	 * GET /instance-ai/threads/:threadId/status
	 */
	async getThreadStatus(threadId: string): Promise<ThreadStatus> {
		return (await this.fetch(`/rest/instance-ai/threads/${threadId}/status`)) as ThreadStatus;
	}

	// ── REST API (verification helpers) ───────────────────────────────────

	/**
	 * List all workflows visible to the authenticated user.
	 * GET /rest/workflows
	 */
	async listWorkflows(): Promise<WorkflowListItem[]> {
		const result = (await this.fetch('/rest/workflows')) as { data: WorkflowListItem[] };
		return result.data;
	}

	/**
	 * Get a single workflow by ID.
	 * GET /rest/workflows/:id
	 */
	async getWorkflow(id: string): Promise<Record<string, unknown>> {
		const result = (await this.fetch(`/rest/workflows/${id}`)) as {
			data: Record<string, unknown>;
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
			data: ExecutionListItem[];
		};
		return result.data;
	}

	/**
	 * Delete a workflow by ID.
	 * DELETE /rest/workflows/:id
	 */
	async deleteWorkflow(id: string): Promise<void> {
		await this.fetch(`/rest/workflows/${id}`, { method: 'DELETE' });
	}

	// ── SSE helpers ───────────────────────────────────────────────────────

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

	// ── Internal fetch ────────────────────────────────────────────────────

	private async fetch(
		path: string,
		options: { method?: string; body?: unknown } = {},
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

		return res.json() as Promise<unknown>;
	}
}
