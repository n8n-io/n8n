import type { CreateSnippetRequestDto, UpdateSnippetRequestDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import type { SnippetSources, SnippetsProvider } from 'n8n-workflow';
import { isSafeObjectProperty, validateSnippetSource } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

import { Snippet } from './snippet.entity';
import { SnippetRepository } from './snippet.repository';
import { SnippetValidationError } from './errors/snippet-validation.error';

const CACHE_KEY = 'snippets';

const projectSnippetScopes: Partial<Record<Scope, Scope>> = {
	'snippet:list': 'projectSnippet:list',
	'snippet:read': 'projectSnippet:read',
	'snippet:create': 'projectSnippet:create',
	'snippet:update': 'projectSnippet:update',
	'snippet:delete': 'projectSnippet:delete',
};

@Service()
export class SnippetsService implements SnippetsProvider {
	constructor(
		private readonly cacheService: CacheService,
		private readonly snippetRepository: SnippetRepository,
		private readonly projectService: ProjectService,
		private readonly ownershipService: OwnershipService,
	) {}

	private async isAuthorized(user: User, scope: Scope, projectId?: string | null) {
		if (!projectId) return hasGlobalScope(user, scope);

		const projectScope = projectSnippetScopes[scope];
		if (!projectScope) throw new Error(`No project snippet scope mapping for "${scope}"`);

		const project = await this.projectService.getProjectWithScope(user, projectId, [projectScope]);
		return !!project;
	}

	async getAllCached(): Promise<Snippet[]> {
		return (
			(await this.cacheService.get(CACHE_KEY, {
				refreshFn: async () => await this.snippetRepository.findAllWithProject(),
			})) ?? []
		);
	}

	private async getCached(id: string): Promise<Snippet | null> {
		return (await this.getAllCached()).find((snippet) => snippet.id === id) ?? null;
	}

	private async updateCache(): Promise<void> {
		await this.cacheService.set(CACHE_KEY, await this.snippetRepository.findAllWithProject());
	}

	/** Sources exposed to executions as `$snippets` / `$project`. */
	async getSourcesForExecution(workflowId?: string, projectId?: string): Promise<SnippetSources> {
		let resolvedProjectId = projectId;
		if (!resolvedProjectId && workflowId) {
			try {
				resolvedProjectId = (await this.ownershipService.getWorkflowProjectCached(workflowId)).id;
			} catch {
				// Unsaved workflow — only global snippets apply
			}
		}

		const sources: SnippetSources = { global: {}, project: {} };
		for (const snippet of await this.getAllCached()) {
			const blockProjectId = snippet.project?.id ?? snippet.projectId;
			if (!blockProjectId) sources.global[snippet.name] = snippet.code;
			else if (blockProjectId === resolvedProjectId) sources.project[snippet.name] = snippet.code;
		}
		return sources;
	}

	async getAllForUser(user: User, filter: { projectId?: string | null } = {}): Promise<Snippet[]> {
		const canListGlobal = hasGlobalScope(user, 'snippet:list');
		const projectIds = await this.projectService.getProjectIdsWithScope(user, [
			'projectSnippet:list',
		]);

		return (await this.getAllCached()).filter((snippet) => {
			const blockProjectId = snippet.project?.id ?? null;
			const hasAccess =
				(!blockProjectId && canListGlobal) ||
				(blockProjectId && projectIds.includes(blockProjectId));
			const matchesFilter =
				typeof filter.projectId === 'undefined' || blockProjectId === filter.projectId;
			return hasAccess && matchesFilter;
		});
	}

	async getForUser(user: User, id: string): Promise<Snippet | null> {
		const snippet = await this.getCached(id);
		if (!snippet) return null;

		if (!(await this.isAuthorized(user, 'snippet:read', snippet.project?.id))) {
			throw new ForbiddenError('You are not allowed to access this snippet');
		}
		return snippet;
	}

	private validateBlock({
		name,
		code,
		tests,
	}: {
		name?: string;
		code?: string;
		tests?: Array<{ code: string; expected: string }> | null;
	}) {
		if (name && !isSafeObjectProperty(name)) {
			throw new SnippetValidationError(`"${name}" is a reserved name`);
		}
		if (code !== undefined) {
			try {
				validateSnippetSource(code);
			} catch (error) {
				throw new SnippetValidationError(
					`Code must be a single JavaScript expression, e.g. an arrow function: ${(error as Error).message}`,
				);
			}
		}
		for (const test of tests ?? []) {
			for (const source of [test.code, test.expected]) {
				if (!source?.trim()) continue;
				try {
					validateSnippetSource(source);
				} catch (error) {
					throw new SnippetValidationError(
						`Test "${test.code}" must use single JavaScript expressions: ${(error as Error).message}`,
					);
				}
			}
		}
	}

	private async validateUniqueName(name: string, projectId?: string | null, excludeId?: string) {
		const conflict = (await this.getAllCached()).find(
			(snippet) =>
				snippet.name === name &&
				(snippet.project?.id ?? null) === (projectId ?? null) &&
				snippet.id !== excludeId,
		);
		if (conflict) {
			throw new SnippetValidationError(
				projectId
					? `A snippet named "${name}" already exists in this project`
					: `A global snippet named "${name}" already exists`,
			);
		}
	}

	async create(user: User, dto: CreateSnippetRequestDto): Promise<Snippet> {
		if (!(await this.isAuthorized(user, 'snippet:create', dto.projectId))) {
			throw new ForbiddenError(
				`You are not allowed to create a snippet${dto.projectId ? ' in this project' : ''}`,
			);
		}

		this.validateBlock(dto);
		await this.validateUniqueName(dto.name, dto.projectId);

		const saved = await this.snippetRepository.save(
			this.snippetRepository.create({
				name: dto.name,
				code: dto.code,
				description: dto.description ?? null,
				tests: dto.tests ?? null,
				project: dto.projectId ? { id: dto.projectId } : null,
			}),
			{ transaction: false },
		);
		await this.updateCache();
		return saved;
	}

	async update(user: User, id: string, dto: UpdateSnippetRequestDto): Promise<Snippet> {
		const existing = await this.getCached(id);
		if (!existing) throw new NotFoundError(`Snippet with id ${id} not found`);

		if (!(await this.isAuthorized(user, 'snippet:update', existing.project?.id))) {
			throw new ForbiddenError('You are not allowed to update this snippet');
		}

		// projectId: undefined = keep, null = move to global, string = move to project
		let newProjectId = existing.project?.id;
		if (typeof dto.projectId !== 'undefined') newProjectId = dto.projectId ?? undefined;

		if (existing.project?.id !== newProjectId) {
			if (!(await this.isAuthorized(user, 'snippet:update', newProjectId))) {
				throw new ForbiddenError(
					`You are not allowed to move this snippet to ${dto.projectId ? 'the specified project' : 'the global scope'}`,
				);
			}
		}

		this.validateBlock(dto);
		await this.validateUniqueName(dto.name ?? existing.name, newProjectId, id);

		await this.snippetRepository.update(id, {
			...(dto.name !== undefined && { name: dto.name }),
			...(dto.code !== undefined && { code: dto.code }),
			...(dto.description !== undefined && { description: dto.description }),
			...(dto.tests !== undefined && { tests: dto.tests }),
			...(typeof dto.projectId !== 'undefined' && {
				project: dto.projectId ? { id: dto.projectId } : null,
			}),
		});
		await this.updateCache();
		return (await this.getCached(id))!;
	}

	async transferAllByProjectId(
		fromProjectId: string,
		toProjectId: string,
		trx?: Parameters<SnippetRepository['transferAllByProjectId']>[2],
	): Promise<void> {
		await this.snippetRepository.transferAllByProjectId(fromProjectId, toProjectId, trx);
		await this.cacheService.delete(CACHE_KEY);
	}

	async deleteAllByProjectId(projectId: string): Promise<void> {
		await this.snippetRepository.deleteAllByProjectId(projectId);
		await this.cacheService.delete(CACHE_KEY);
	}

	async delete(user: User, id: string): Promise<void> {
		const existing = await this.getCached(id);
		if (!existing) return;

		if (!(await this.isAuthorized(user, 'snippet:delete', existing.project?.id))) {
			throw new ForbiddenError('You are not allowed to delete this snippet');
		}

		await this.snippetRepository.delete(id);
		await this.updateCache();
	}
}
