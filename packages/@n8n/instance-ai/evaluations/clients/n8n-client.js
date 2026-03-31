'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.N8nClient = void 0;
class N8nClient {
	baseUrl;
	sessionCookie;
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}
	async login(email, password) {
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
	async sendMessage(threadId, message) {
		const result = await this.fetch(`/rest/instance-ai/chat/${threadId}`, {
			method: 'POST',
			body: { message },
		});
		return result;
	}
	async confirmAction(requestId, approved, options) {
		await this.fetch(`/rest/instance-ai/confirm/${requestId}`, {
			method: 'POST',
			body: { approved, ...options },
		});
	}
	async cancelRun(threadId) {
		await this.fetch(`/rest/instance-ai/chat/${threadId}/cancel`, {
			method: 'POST',
		});
	}
	async getThreadStatus(threadId) {
		return await this.fetch(`/rest/instance-ai/threads/${threadId}/status`);
	}
	async getThreadMessages(threadId) {
		const result = await this.fetch(`/rest/instance-ai/threads/${threadId}/messages`);
		return result.data;
	}
	async listWorkflows() {
		const result = await this.fetch('/rest/workflows');
		return result.data;
	}
	async getWorkflow(id) {
		const result = await this.fetch(`/rest/workflows/${id}`);
		return result.data;
	}
	async listExecutions(workflowId) {
		const query = workflowId ? `?workflowId=${workflowId}` : '';
		const result = await this.fetch(`/rest/executions${query}`);
		return Array.isArray(result.data) ? result.data : result.data.results;
	}
	async executeWorkflow(workflowId, triggerNodeName) {
		const body = {};
		if (triggerNodeName) {
			body.triggerToStartFrom = { name: triggerNodeName };
		}
		const result = await this.fetch(`/rest/workflows/${workflowId}/run`, {
			method: 'POST',
			body,
		});
		return { executionId: result.data.executionId };
	}
	async getExecution(executionId) {
		const result = await this.fetch(`/rest/executions/${executionId}`);
		return result.data;
	}
	async updateWorkflow(id, updates) {
		const result = await this.fetch(`/rest/workflows/${id}`, {
			method: 'PATCH',
			body: updates,
		});
		return result.data;
	}
	async activateWorkflow(id) {
		await this.fetch(`/rest/workflows/${id}`, {
			method: 'PATCH',
			body: { active: true },
		});
	}
	async deactivateWorkflow(id) {
		await this.fetch(`/rest/workflows/${id}`, {
			method: 'PATCH',
			body: { active: false },
		});
	}
	async callWebhook(path, method, body) {
		const url = `${this.baseUrl}/webhook/${path}`;
		const headers = { 'Content-Type': 'application/json' };
		if (this.sessionCookie) {
			headers.cookie = this.sessionCookie;
		}
		const res = await fetch(url, {
			method: method.toUpperCase(),
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});
		let data;
		const contentType = res.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			data = await res.json();
		} else {
			data = await res.text();
		}
		return { status: res.status, data };
	}
	async deleteWorkflow(id) {
		await this.fetch(`/rest/workflows/${id}`, { method: 'DELETE' });
	}
	async createCredential(name, type, data) {
		const result = await this.fetch('/rest/credentials', {
			method: 'POST',
			body: { name, type, data },
		});
		return { id: result.data.id };
	}
	async deleteCredential(id) {
		await this.fetch(`/rest/credentials/${id}`, { method: 'DELETE' });
	}
	async getPersonalProjectId() {
		const result = await this.fetch('/rest/me');
		const projectId = result.data.personalProjectId ?? result.data.defaultPersonalProjectId ?? '';
		if (!projectId) {
			throw new Error('Could not determine personal project ID');
		}
		return projectId;
	}
	async listDataTables(projectId) {
		const result = await this.fetch(`/rest/projects/${projectId}/data-tables`);
		return Array.isArray(result.data) ? result.data : [];
	}
	async deleteDataTable(projectId, dataTableId) {
		await this.fetch(`/rest/projects/${projectId}/data-tables/${dataTableId}`, {
			method: 'DELETE',
		});
	}
	async executeWithLlmMock(workflowId, scenarioHints, timeoutMs = 120_000) {
		const result = await this.fetch(`/rest/instance-ai/eval/execute-with-llm-mock/${workflowId}`, {
			method: 'POST',
			body: scenarioHints ? { scenarioHints } : {},
			timeoutMs,
		});
		return result.data;
	}
	getEventsUrl(threadId) {
		return `${this.baseUrl}/rest/instance-ai/events/${threadId}`;
	}
	get cookie() {
		if (!this.sessionCookie) {
			throw new Error('Not authenticated — call login() first');
		}
		return this.sessionCookie;
	}
	async fetch(path, options = {}) {
		const headers = { 'Content-Type': 'application/json' };
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
exports.N8nClient = N8nClient;
//# sourceMappingURL=n8n-client.js.map
