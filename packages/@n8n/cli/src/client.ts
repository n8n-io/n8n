// The root barrel pulls workflow types into the bundled client declarations.
import type { ExportPackageRequestDto } from '@n8n/api-types/dist/dto/packages/export-package-request.dto';
import type {
	ImportPackageRequestDto,
	ImportPackageSelectionRequestDto,
} from '@n8n/api-types/dist/dto/packages/import-package-request.dto';
import type { ImportResultDto } from '@n8n/api-types/dist/dto/packages/import-result.dto';

export interface PaginatedResponse<T> {
	data: T[];
	nextCursor?: string;
}

export interface ClientOptions {
	baseUrl: string;
	apiKey: string;
	debug?: (message: string) => void;
}

export type ImportPackageFields = Pick<ImportPackageRequestDto, 'conflictPolicy'> &
	Partial<Omit<ImportPackageRequestDto, 'package' | 'conflictPolicy' | 'bindings'>> & {
		/** Multipart bindings remain JSON text until the API validates them. */
		bindings?: string;
	};

export type ImportPackageSelectionFields = Pick<
	ImportPackageSelectionRequestDto,
	'selectedProjectId' | 'selectedWorkflowIds'
> &
	Partial<
		Omit<ImportPackageSelectionRequestDto, 'package' | 'selectedProjectId' | 'selectedWorkflowIds'>
	>;

export type ExportPackageFields = Partial<ExportPackageRequestDto>;

/** True per-entity counts of what ended up in an exported package. */
export interface ExportPackageCounts {
	/** Older servers can omit Agent and project counts. */
	agents?: number;
	projects?: number;
	workflows: number;
	folders: number;
	credentials: number;
	dataTables: number;
	variables: number;
	/** Absent when the server predates tag export. */
	tags?: number;
}

export interface ExportPackageResult {
	archive: Buffer;
	/** Undefined when talking to an older server that doesn't send the counts header. */
	counts?: ExportPackageCounts;
}

export interface ImportPackageCounts {
	projects: { created: number; updated: number; skipped: number; deleted: number };
	folders: {
		created: number;
		updated: number;
		skipped: number;
		/** Part of `updated`: folders that Apply moved under another parent of their project. */
		moved: number;
		/** Part of `updated`: folders that Apply gave the name on the branch. */
		renamed: number;
		removed: number;
	};
	workflows: {
		created: number;
		updated: number;
		skipped: number;
		/** Part of `updated`: workflows that Apply also moved to another folder of their project. */
		moved: number;
		archived: number;
		deleted: number;
		publishing: {
			published: number;
			unpublished: number;
			unchanged: number;
			blocked: number;
			failed: number;
		};
	};
	credentials: { matched: number; stubbed: number };
	dataTables: { matched: number; created: number; updated: number };
	variables: {
		matched: number;
		created: number;
		updated: number;
		stubbed: number;
		missing: number;
	};
	tags: { matched: number; created: number; renamed: number; reconciled: number; skipped: number };
}

/** The direction a promotion environment, checkout, or operation works in. */
export type PromotionDirection = 'apply' | 'promote';

/** The Git part of a promotion operation result. */
export interface PromotionGitResult {
	commitSha: string;
	/** For Promote the branch it pushed to, for Apply the branch the package came from. */
	branchName: string;
}

/** Outcome of promoting the team projects through an environment. */
export type PromotePackageResult = {
	environmentId: string;
	counts: ExportPackageCounts;
	git: PromotionGitResult;
};

/** The reviewed source that Apply must still match. Any mismatch reports `source-changed`. */
export interface PromotionExpectedSource {
	environmentId: string;
	branchName: string;
	commitSha: string;
}

/** References in a package that must be set up on this instance before Apply can import it. */
export interface PromotionBindingPreflight {
	missingProjects: Array<Record<string, unknown>>;
	missingBindings: Array<Record<string, unknown>>;
	accessRequirements: Array<Record<string, unknown>>;
	conflicts: Array<Record<string, unknown>>;
	warnings: Array<Record<string, unknown>>;
}

/** A team project that a full Apply deletes, because the package does not hold it. */
export type PromotionProjectDeletion = {
	kind: 'project';
	code: 'project-deletion';
	project: { id: string; name: string };
};

type ApplyPackageIdentity = {
	environmentId: string;
	git: PromotionGitResult;
};

/** Outcome of applying a package to the instance. Only `applied` imported anything. */
export type ApplyPackageResult =
	| (ApplyPackageIdentity & {
			status: 'applied';
			counts: ImportPackageCounts;
			warnings: Array<Record<string, unknown>>;
	  })
	| (ApplyPackageIdentity & { status: 'blocked'; preflight: PromotionBindingPreflight })
	| (ApplyPackageIdentity & { status: 'source-changed' });

export interface PromotionChangesQuery {
	search?: string;
	sort?: 'name' | 'updatedAt' | 'status';
	order?: 'asc' | 'desc';
}

/** One workflow that differs between a project and its configured branch. */
export interface PromotableResourceSummary {
	id: string;
	name: string;
	type: 'workflow';
	status: 'new' | 'modified' | 'renamed' | 'renamed-and-modified' | 'archived' | 'deleted';
	version: number | null;
	updatedAt: string | null;
	updatedBy: string | null;
	dependencyCount: number;
}

/** The changes of a project in one direction, with the commit they were read from. */
export interface ProjectPromotionChanges {
	commitSha: string | null;
	changes: PromotableResourceSummary[];
}

/** A repository that the token of a Git host provider can access. */
export interface PromotionRepository {
	id: string;
	name: string;
	fullPath: string;
	remoteUrl: string;
	defaultBranch: string | null;
}

/** A branch of a Git host repository. */
export interface PromotionBranch {
	name: string;
	isDefault: boolean;
}

/** State of an environment's local checkout, after a connect or a disconnect. */
export type PromotionCheckoutResult = {
	environmentId: string;
	direction: PromotionDirection;
	branchName: string;
	hasCheckout: boolean;
};

/** A new provider, with the generated public key for SSH providers. */
export type PromotionProviderCreatedResult = {
	provider: Record<string, unknown>;
	publicKey: string | null;
};

export class ApiError extends Error {
	constructor(
		readonly statusCode: number,
		message: string,
		readonly hint?: string,
		readonly details?: unknown,
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
		options: {
			body?: unknown;
			query?: Record<string, string>;
			formData?: FormData;
			responseType?: 'json' | 'binary';
			onResponse?: (response: Response) => void;
		} = {},
	): Promise<T> {
		const url = new URL(`${this.baseUrl}${path}`);
		if (options.query) {
			for (const [k, v] of Object.entries(options.query)) {
				if (v !== undefined && v !== '') url.searchParams.set(k, v);
			}
		}

		this.debug?.(`→ ${method} ${url}`);
		const start = Date.now();

		const headers = new Headers(this.headers);
		let body: BodyInit | undefined;
		if (options.formData) {
			headers.delete('Content-Type');
			body = options.formData;
		} else if (options.body !== undefined) {
			body = JSON.stringify(options.body);
		}

		let response: Response;
		try {
			response = await fetch(url.toString(), { method, headers, body });
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

		if (!response.ok) {
			const errorBody = await this.readBody(response);
			const message =
				typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody
					? String((errorBody as Record<string, unknown>).message)
					: `Request failed (${response.status})`;
			const hint =
				response.status === 401
					? "Check your API key. Run 'n8n-cli config set-api-key <key>' or set N8N_API_KEY."
					: response.status === 404
						? 'Resource not found. Verify the ID is correct.'
						: undefined;
			throw new ApiError(response.status, message, hint, errorBody);
		}

		options.onResponse?.(response);

		if (response.status === 204) {
			return undefined as T;
		}

		if (options.responseType === 'binary') {
			return Buffer.from(await response.arrayBuffer()) as T;
		}

		return (await this.readBody(response)) as T;
	}

	private async readBody(response: Response): Promise<unknown> {
		const contentType = response.headers.get('content-type') ?? '';
		return contentType.includes('application/json') ? await response.json() : await response.text();
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

	// ─── Promotion providers ───────────────────────────────────────

	async listPromotionProviders(limit?: number) {
		return await this.paginate<Record<string, unknown>>('/promotions/providers', {}, limit);
	}

	async getPromotionProvider(id: string) {
		return await this.get<Record<string, unknown>>(`/promotions/providers/${id}`);
	}

	async createPromotionProvider(body: unknown) {
		return await this.post<PromotionProviderCreatedResult>('/promotions/providers', body);
	}

	async updatePromotionProvider(id: string, body: unknown) {
		return await this.put<Record<string, unknown>>(`/promotions/providers/${id}`, body);
	}

	async deletePromotionProvider(id: string) {
		return await this.del<undefined>(`/promotions/providers/${id}`);
	}

	async listPromotionProviderRepositories(id: string, search?: string, limit?: number) {
		return await this.paginate<PromotionRepository>(
			`/promotions/providers/${id}/repositories`,
			search ? { search } : {},
			limit,
		);
	}

	/**
	 * `repositoryId` is a plain full path such as `group/repo`, or a Git host
	 * project ID. A full path contains slashes, so it is encoded into one path
	 * segment here.
	 */
	async listPromotionProviderBranches(
		id: string,
		repositoryId: string,
		search?: string,
		limit?: number,
	) {
		return await this.paginate<PromotionBranch>(
			`/promotions/providers/${id}/repositories/${encodeURIComponent(repositoryId)}/branches`,
			search ? { search } : {},
			limit,
		);
	}

	// ─── Promotion environments ────────────────────────────────────

	async listPromotionEnvironments(query: Record<string, string> = {}, limit?: number) {
		return await this.paginate<Record<string, unknown>>('/promotions/environments', query, limit);
	}

	async getPromotionEnvironment(id: string) {
		return await this.get<Record<string, unknown>>(`/promotions/environments/${id}`);
	}

	async createPromotionEnvironment(body: unknown) {
		return await this.post<Record<string, unknown>>('/promotions/environments', body);
	}

	async updatePromotionEnvironment(id: string, body: unknown) {
		return await this.put<Record<string, unknown>>(`/promotions/environments/${id}`, body);
	}

	async deletePromotionEnvironment(id: string) {
		return await this.del<undefined>(`/promotions/environments/${id}`);
	}

	async connectPromotionCheckout(id: string) {
		return await this.post<PromotionCheckoutResult>(`/promotions/environments/${id}/connect`);
	}

	async disconnectPromotionCheckout(id: string) {
		return await this.post<PromotionCheckoutResult>(`/promotions/environments/${id}/disconnect`);
	}

	async listPromotionEnvironmentProjects(id: string) {
		return await this.get<{ projectIds: string[] }>(`/promotions/environments/${id}/projects`);
	}

	async addProjectToPromotionEnvironment(id: string, projectId: string) {
		return await this.post<{ environmentId: string; projectId: string }>(
			`/promotions/environments/${id}/projects/${projectId}`,
		);
	}

	async removeProjectFromPromotionEnvironment(id: string, projectId: string) {
		return await this.del<undefined>(`/promotions/environments/${id}/projects/${projectId}`);
	}

	async promotePackage(id: string, body: { commitMessage?: string; force?: boolean }) {
		return await this.post<PromotePackageResult>(`/promotions/environments/${id}/promote`, body);
	}

	async applyPackage(id: string, expectedSource?: PromotionExpectedSource) {
		return await this.post<ApplyPackageResult>(
			`/promotions/environments/${id}/apply`,
			expectedSource ? { expectedSource } : undefined,
		);
	}

	async continueApplyPackage(
		id: string,
		expectedSource: PromotionExpectedSource,
		confirmDestructiveChanges?: boolean,
	) {
		return await this.post<ApplyPackageResult>(`/promotions/environments/${id}/apply/continue`, {
			expectedSource,
			confirmDestructiveChanges,
		});
	}

	async listProjectPromotionChanges(
		projectId: string,
		direction: PromotionDirection,
		query: PromotionChangesQuery = {},
	) {
		return await this.get<ProjectPromotionChanges>(
			`/promotions/projects/${projectId}/changes/${direction}`,
			{ ...query },
		);
	}

	async promoteProjectSelection(projectId: string, workflowIds: string[], commitMessage?: string) {
		return await this.post<PromotePackageResult>(`/promotions/projects/${projectId}/promote`, {
			workflowIds,
			// Dropped by JSON serialization when undefined, so the server default applies.
			commitMessage,
		});
	}

	async applyProjectSelection(
		projectId: string,
		workflowIds: string[],
		expectedSource?: PromotionExpectedSource,
	) {
		return await this.post<ApplyPackageResult>(`/promotions/projects/${projectId}/apply`, {
			workflowIds,
			// Dropped by JSON serialization when undefined, so the branch tip is applied.
			expectedSource,
		});
	}

	async continueApplyProjectSelection(
		projectId: string,
		workflowIds: string[],
		expectedSource: PromotionExpectedSource,
		confirmDestructiveChanges?: boolean,
	) {
		return await this.post<ApplyPackageResult>(`/promotions/projects/${projectId}/apply/continue`, {
			workflowIds,
			expectedSource,
			confirmDestructiveChanges,
		});
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

	// ─── Packages (beta) ───────────────────────────────────────────

	async exportPackage(fields: ExportPackageFields): Promise<ExportPackageResult> {
		// Empty collections are dropped so the API's per-field "at least one" rule isn't tripped.
		const body: ExportPackageFields = {};
		if (fields.agentIds?.length) body.agentIds = fields.agentIds;
		if (fields.workflowIds?.length) body.workflowIds = fields.workflowIds;
		if (fields.folderIds?.length) body.folderIds = fields.folderIds;
		if (fields.projectIds?.length) body.projectIds = fields.projectIds;
		// `undefined` is dropped by JSON serialization, so the API's default applies.
		body.includeVariableValues = fields.includeVariableValues;
		body.includeTags = fields.includeTags;
		if (fields.dependencyPolicy) body.dependencyPolicy = fields.dependencyPolicy;
		if (fields.versionPolicy) body.versionPolicy = fields.versionPolicy;
		// Only sent when set, so an older server without this field in its schema never sees it.
		if (fields.credentialExportPolicy) body.credentialExportPolicy = fields.credentialExportPolicy;
		if (fields.includeArchivedWorkflows) body.includeArchivedWorkflows = true;

		let counts: ExportPackageCounts | undefined;
		const archive = await this.request<Buffer>('POST', '/n8n-packages/export', {
			body,
			responseType: 'binary',
			// Older servers omit this header; counts then stays undefined.
			onResponse: (response) => {
				const header = response.headers.get('X-N8n-Export-Counts');
				if (header) counts = this.parseExportCounts(header);
			},
		});

		return { archive, counts };
	}

	private parseExportCounts(header: string): ExportPackageCounts | undefined {
		try {
			return JSON.parse(header) as ExportPackageCounts;
		} catch {
			return undefined;
		}
	}

	async importPackage(
		file: { buffer: Buffer; filename: string },
		fields: ImportPackageFields,
	): Promise<ImportResultDto> {
		const form = new FormData();
		form.append('package', new Blob([new Uint8Array(file.buffer)]), file.filename);
		for (const [key, value] of Object.entries(fields)) {
			if (typeof value === 'string' && value !== '') form.append(key, value);
		}
		return await this.request<ImportResultDto>('POST', '/n8n-packages/import', {
			formData: form,
		});
	}

	async importPackageSelection(
		file: { buffer: Buffer; filename: string },
		fields: ImportPackageSelectionFields,
	): Promise<ImportResultDto> {
		const form = new FormData();
		form.append('package', new Blob([new Uint8Array(file.buffer)]), file.filename);
		const stringFields: Record<string, string | undefined> = {
			selectedProjectId: fields.selectedProjectId,
			conflictPolicy: fields.conflictPolicy,
			idPolicy: fields.idPolicy,
			overwriteDeletionPolicy: fields.overwriteDeletionPolicy,
		};
		for (const [key, value] of Object.entries(stringFields)) {
			if (typeof value === 'string' && value !== '') form.append(key, value);
		}
		// The endpoint expects ID arrays encoded as JSON in multipart text fields.
		form.append('selectedWorkflowIds', JSON.stringify(fields.selectedWorkflowIds));
		if (fields.deletedWorkflowIds !== undefined) {
			form.append('deletedWorkflowIds', JSON.stringify(fields.deletedWorkflowIds));
		}
		return await this.request<ImportResultDto>('POST', '/n8n-packages/import-selection', {
			formData: form,
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
