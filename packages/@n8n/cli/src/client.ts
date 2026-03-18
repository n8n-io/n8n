export interface PaginatedResponse<T> {
	data: T[];
	nextCursor?: string;
}

export interface ClientOptions {
	baseUrl: string;
	apiKey: string;
	debug?: (message: string) => void;
}

export class ApiError extends Error {
	constructor(
		readonly statusCode: number,
		message: string,
		readonly hint?: string,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export class N8nClient {
	private readonly baseUrl: string;

	private readonly headers: Headers;

	private readonly debug?: (message: string) => void;

	constructor(options: ClientOptions) {
		let url = options.baseUrl.replace(/\/+$/, '');
		if (!url.endsWith('/api/v1')) {
			url = `${url}/api/v1`;
		}
		this.baseUrl = url;
		this.headers = new Headers({
			'X-N8N-API-KEY': options.apiKey,
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent': 'n8n-cli',
		});
		this.debug = options.debug;
	}

	// ─── Low-level HTTP ────────────────────────────────────────────

	private async request<T>(
		method: string,
		path: string,
		options: { body?: unknown; query?: Record<string, string> } = {},
	): Promise<T> {
		const url = new URL(`${this.baseUrl}${path}`);
		if (options.query) {
			for (const [k, v] of Object.entries(options.query)) {
				if (v !== undefined && v !== '') url.searchParams.set(k, v);
			}
		}

		this.debug?.(`→ ${method} ${url}`);
		const start = Date.now();

		let response: Response;
		try {
			response = await fetch(url.toString(), {
				method,
				headers: this.headers,
				body: options.body ? JSON.stringify(options.body) : undefined,
			});
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			this.debug?.(`✗ Connection failed (${Date.now() - start}ms): ${msg}`);
			throw new ApiError(
				0,
				`Could not connect to n8n at ${this.baseUrl.replace('/api/v1', '')}`,
				`Connection error: ${msg}. Check the URL and ensure the instance is running.`,
			);
		}

		this.debug?.(`← ${response.status} ${response.statusText} (${Date.now() - start}ms)`);

		if (response.status === 204) {
			return undefined as T;
		}

		const contentType = response.headers.get('content-type') ?? '';
		const isJson = contentType.includes('application/json');
		const data: unknown = isJson ? await response.json() : await response.text();

		if (!response.ok) {
			const message =
				typeof data === 'object' && data !== null && 'message' in data
					? String((data as Record<string, unknown>).message)
					: `Request failed (${response.status})`;
			const hint =
				response.status === 401
					? "Check your API key. Run 'n8n-cli config set-api-key <key>' or set N8N_API_KEY."
					: response.status === 404
						? 'Resource not found. Verify the ID is correct.'
						: undefined;
			throw new ApiError(response.status, message, hint);
		}

		return data as T;
	}

	private async get<T>(path: string, query?: Record<string, string>): Promise<T> {
		return await this.request('GET', path, { query });
	}

	private async post<T>(path: string, body?: unknown): Promise<T> {
		return await this.request('POST', path, { body });
	}

	private async put<T>(path: string, body?: unknown): Promise<T> {
		return await this.request('PUT', path, { body });
	}

	private async patch<T>(path: string, body?: unknown): Promise<T> {
		return await this.request('PATCH', path, { body });
	}

	private async del<T>(path: string, query?: Record<string, string>): Promise<T> {
		return await this.request('DELETE', path, { query });
	}

	/** Fetch all pages of a paginated list endpoint. */
	async paginate<T>(
		path: string,
		query: Record<string, string> = {},
		limit?: number,
	): Promise<T[]> {
		const results: T[] = [];
		let cursor: string | undefined;

		do {
			const q: Record<string, string> = { ...query, ...(cursor ? { cursor } : {}) };
			if (limit !== undefined) {
				q.limit = String(Math.min(limit - results.length, 250));
			}
			const page = await this.get<PaginatedResponse<T>>(path, q);
			results.push(...page.data);
			cursor = page.nextCursor;
		} while (cursor && (limit === undefined || results.length < limit));

		return limit !== undefined ? results.slice(0, limit) : results;
	}

	// ─── Workflows ─────────────────────────────────────────────────

	async listWorkflows(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/workflows', query, limit);
	}

	async getWorkflow(id: string) {
		return await this.get<Record<string, unknown>>(`/workflows/${id}`);
	}

	async createWorkflow(body: unknown) {
		return await this.post<Record<string, unknown>>('/workflows', body);
	}

	async updateWorkflow(id: string, body: unknown) {
		return await this.put<Record<string, unknown>>(`/workflows/${id}`, body);
	}

	async deleteWorkflow(id: string) {
		return await this.del<Record<string, unknown>>(`/workflows/${id}`);
	}

	async activateWorkflow(id: string) {
		return await this.post<Record<string, unknown>>(`/workflows/${id}/activate`);
	}

	async deactivateWorkflow(id: string) {
		return await this.post<Record<string, unknown>>(`/workflows/${id}/deactivate`);
	}

	async getWorkflowTags(id: string) {
		return await this.get<Array<Record<string, unknown>>>(`/workflows/${id}/tags`);
	}

	async updateWorkflowTags(id: string, tagIds: string[]) {
		return await this.put<Array<Record<string, unknown>>>(
			`/workflows/${id}/tags`,
			tagIds.map((tid) => ({ id: tid })),
		);
	}

	async transferWorkflow(id: string, projectId: string) {
		return await this.put<undefined>(`/workflows/${id}/transfer`, {
			destinationProjectId: projectId,
		});
	}

	// ─── Executions ────────────────────────────────────────────────

	async listExecutions(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/executions', query, limit);
	}

	async getExecution(id: string, includeData = false) {
		const query: Record<string, string> = includeData ? { includeData: 'true' } : {};
		return await this.get<Record<string, unknown>>(`/executions/${id}`, query);
	}

	async retryExecution(id: string) {
		return await this.post<Record<string, unknown>>(`/executions/${id}/retry`);
	}

	async stopExecution(id: string) {
		return await this.post<Record<string, unknown>>(`/executions/${id}/stop`);
	}

	async deleteExecution(id: string) {
		return await this.del<Record<string, unknown>>(`/executions/${id}`);
	}

	// ─── Credentials ───────────────────────────────────────────────

	async listCredentials(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/credentials', query, limit);
	}

	async getCredential(id: string) {
		return await this.get<Record<string, unknown>>(`/credentials/${id}`);
	}

	async getCredentialSchema(typeName: string) {
		return await this.get<Record<string, unknown>>(`/credentials/schema/${typeName}`);
	}

	async createCredential(body: unknown) {
		return await this.post<Record<string, unknown>>('/credentials', body);
	}

	async deleteCredential(id: string) {
		return await this.del<Record<string, unknown>>(`/credentials/${id}`);
	}

	async transferCredential(id: string, projectId: string) {
		return await this.put<undefined>(`/credentials/${id}/transfer`, {
			destinationProjectId: projectId,
		});
	}

	// ─── Tags ──────────────────────────────────────────────────────

	async listTags(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/tags', query, limit);
	}

	async createTag(name: string) {
		return await this.post<Record<string, unknown>>('/tags', { name });
	}

	async updateTag(id: string, name: string) {
		return await this.put<Record<string, unknown>>(`/tags/${id}`, { name });
	}

	async deleteTag(id: string) {
		return await this.del<Record<string, unknown>>(`/tags/${id}`);
	}

	// ─── Projects ──────────────────────────────────────────────────

	async listProjects(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/projects', query, limit);
	}

	async getProject(id: string) {
		return await this.get<Record<string, unknown>>(`/projects/${id}`);
	}

	async createProject(name: string) {
		return await this.post<Record<string, unknown>>('/projects', { name });
	}

	async updateProject(id: string, name: string) {
		return await this.put<undefined>(`/projects/${id}`, { name });
	}

	async deleteProject(id: string) {
		return await this.del<undefined>(`/projects/${id}`);
	}

	async listProjectMembers(projectId: string, limit?: number) {
		return await this.paginate<Record<string, unknown>>(`/projects/${projectId}/users`, {}, limit);
	}

	async addProjectMember(projectId: string, userId: string, role: string) {
		return await this.post<undefined>(`/projects/${projectId}/users`, {
			relations: [{ userId, role }],
		});
	}

	async updateProjectMemberRole(projectId: string, userId: string, role: string) {
		return await this.patch<undefined>(`/projects/${projectId}/users/${userId}`, { role });
	}

	async removeProjectMember(projectId: string, userId: string) {
		return await this.del<undefined>(`/projects/${projectId}/users/${userId}`);
	}

	// ─── Variables ─────────────────────────────────────────────────

	async listVariables(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/variables', query, limit);
	}

	async createVariable(key: string, value: string) {
		return await this.post<Record<string, unknown>>('/variables', { key, value });
	}

	async updateVariable(id: string, key: string, value: string) {
		return await this.put<undefined>(`/variables/${id}`, { key, value });
	}

	async deleteVariable(id: string) {
		return await this.del<undefined>(`/variables/${id}`);
	}

	// ─── Data Tables ───────────────────────────────────────────────

	async listDataTables(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/data-tables', query, limit);
	}

	async getDataTable(id: string) {
		return await this.get<Record<string, unknown>>(`/data-tables/${id}`);
	}

	async createDataTable(body: unknown) {
		return await this.post<Record<string, unknown>>('/data-tables', body);
	}

	async deleteDataTable(id: string) {
		return await this.del<undefined>(`/data-tables/${id}`);
	}

	async listDataTableRows(tableId: string, query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>(
			`/data-tables/${tableId}/rows`,
			query,
			limit,
		);
	}

	async addDataTableRows(tableId: string, data: unknown[]) {
		return await this.post<Record<string, unknown>>(`/data-tables/${tableId}/rows`, {
			data,
			returnType: 'all',
		});
	}

	async updateDataTableRows(tableId: string, filter: unknown, data: unknown) {
		return await this.patch<unknown>(`/data-tables/${tableId}/rows/update`, {
			filter,
			data,
			returnData: true,
		});
	}

	async upsertDataTableRows(tableId: string, filter: unknown, data: unknown) {
		return await this.post<unknown>(`/data-tables/${tableId}/rows/upsert`, {
			filter,
			data,
			returnData: true,
		});
	}

	async deleteDataTableRows(tableId: string, filter: string) {
		return await this.del<unknown>(`/data-tables/${tableId}/rows/delete`, {
			filter,
			returnData: 'true',
		});
	}

	// ─── Users ─────────────────────────────────────────────────────

	async listUsers(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/users', query, limit);
	}

	async getUser(id: string) {
		return await this.get<Record<string, unknown>>(`/users/${id}`);
	}

	// ─── Source Control ────────────────────────────────────────────

	async sourceControlPull(options: { force?: boolean } = {}) {
		return await this.post<Record<string, unknown>>('/source-control/pull', {
			force: options.force ?? false,
		});
	}

	// ─── Audit ─────────────────────────────────────────────────────

	async audit(categories?: string[]) {
		const body: Record<string, unknown> = {};
		if (categories) {
			body.additionalOptions = { categories };
		}
		return await this.post<Record<string, unknown>>('/audit', body);
	}
}
