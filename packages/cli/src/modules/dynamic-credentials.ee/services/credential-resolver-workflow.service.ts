import { CredentialsEntity, CredentialsRepository, In, User, WorkflowRepository } from '@n8n/db';
import { ICredentialResolver } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { ICredentialContext, INode, isNodeWithWorkflowSelector, jsonParse } from 'n8n-workflow';

import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';

// Upper bound on distinct workflows traversed per status check. Bounds the number of sequential
// DB loads on the unauthenticated execution-status endpoint regardless of tree shape (deep chains
// or wide fan-out), and is far above any realistic sub-workflow tree.
const MAX_TRAVERSED_WORKFLOWS = 100;

type CredentialStatus = {
	credentialId: string;
	credentialName: string;
	resolverId?: string;
	credentialType: string;
	status: 'missing' | 'configured' | 'resolver_missing';
};

type ResolvedResolver = {
	resolverInstance: ICredentialResolver;
	resolverConfig: Record<string, unknown>;
};

function isCredentialStatus(obj: unknown): obj is CredentialStatus {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}
	return (
		'credentialId' in obj &&
		typeof obj.credentialId === 'string' &&
		'credentialType' in obj &&
		typeof obj.credentialType === 'string' &&
		'status' in obj &&
		(obj.status === 'missing' || obj.status === 'configured' || obj.status === 'resolver_missing')
	);
}

@Service()
export class CredentialResolverWorkflowService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialRepository: CredentialsRepository,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly cipher: Cipher,
		private readonly dynamicCredentialsProxy: DynamicCredentialsProxy,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	private async getResolver(resolverId: string): Promise<ResolvedResolver> {
		const resolver = await this.resolverRepository.findOneBy({ id: resolverId });
		if (!resolver) {
			throw new Error('Credential resolver not found');
		}
		const resolverInstance = this.resolverRegistry.getResolverByTypename(resolver.type);
		if (!resolverInstance) {
			throw new Error('Credential resolver implementation not found');
		}
		try {
			const decryptedConfig = await this.cipher.decryptV2(resolver.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			return {
				resolverInstance,
				resolverConfig,
			};
		} catch (error) {
			throw new Error('Failed to decrypt or parse resolver configuration');
		}
	}

	/**
	 * Checks the status of all resolvable credentials in a workflow and its sub-workflows.
	 * Traverses Execute Sub-workflow and AI Workflow Tool references recursively, deduplicating
	 * both workflows (cycles / self-references / diamond references) and credentials, then tests
	 * credential availability by attempting to retrieve secrets using the provided identity token.
	 *
	 * @param workflowId - The (root) workflow ID to check
	 * @param credentialContext - Identity context used for credential authorization
	 * @param user - Optional n8n session user whose access is enforced on the root workflow
	 * @returns Array of credential statuses (configured/missing) with resolver info
	 * @throws {Error} When the root workflow is not found or resolver configuration is invalid
	 */
	async getWorkflowStatus(
		workflowId: string,
		credentialContext: ICredentialContext,
		user?: User,
	): Promise<CredentialStatus[]> {
		const visited = new Set<string>();
		// credentialId -> set of distinct effective resolverIds of the workflows it appears in
		// (fallback only; a credential-level resolverId still takes priority during the status
		// check). A credential without its own resolverId resolves under the resolver of whichever
		// workflow contains it, so it must be checked once per distinct fallback.
		const credentialFallbackResolvers = new Map<string, Set<string | null>>();

		await this.collectResolvableCredentials(
			workflowId,
			credentialFallbackResolvers,
			visited,
			user,
			true,
		);

		if (credentialFallbackResolvers.size === 0) {
			return [];
		}

		const credentials = await this.credentialRepository.find({
			where: {
				id: In([...credentialFallbackResolvers.keys()]),
				isResolvable: true,
			},
		});

		// Fetch/decrypt each distinct resolver at most once across the whole tree.
		const resolverCache = new Map<string, ResolvedResolver>();

		// A credential with its own resolverId always resolves the same way, so check it once.
		// Otherwise check it once per distinct fallback resolver, since the same credential can
		// resolve differently in a parent vs a sub-workflow that override the resolver.
		const credentialChecks = credentials.flatMap((credential) => {
			const fallbacks = credential.resolverId
				? [null]
				: [...(credentialFallbackResolvers.get(credential.id) ?? [null])];
			return fallbacks.map((fallbackResolverId) => ({ credential, fallbackResolverId }));
		});

		const credentialStatusPromises = credentialChecks.map(
			async ({ credential, fallbackResolverId }) =>
				await this.checkCredentialStatus(credential, {
					fallbackResolverId,
					credentialContext,
					resolverCache,
				}),
		);

		return (await Promise.all(credentialStatusPromises)).filter(isCredentialStatus);
	}

	/**
	 * Recursively walks a workflow and its sub-workflows, recording every resolvable-credential id
	 * mapped to the effective resolver of the workflow it was first found in. The `visited` set
	 * prevents processing the same workflow twice (cycles, self-references, diamond references).
	 */
	private async collectResolvableCredentials(
		workflowId: string,
		acc: Map<string, Set<string | null>>,
		visited: Set<string>,
		user: User | undefined,
		isRoot: boolean,
	): Promise<void> {
		if (visited.has(workflowId)) {
			return;
		}
		// Fail closed: erroring is safer than silently stopping traversal, which could report a
		// workflow as ready while unvisited sub-workflows are still missing credentials.
		if (visited.size >= MAX_TRAVERSED_WORKFLOWS) {
			throw new BadRequestError(
				`Workflow references too many sub-workflows to check (limit ${MAX_TRAVERSED_WORKFLOWS})`,
			);
		}
		visited.add(workflowId);

		// Enforce the session user's access on the root workflow only. Sub-workflows resolve by id
		// to match execution-time semantics (a sub-workflow runs regardless of who can read it).
		const workflow =
			isRoot && user
				? await this.workflowFinderService.findWorkflowForUser(workflowId, user, ['workflow:read'])
				: await this.workflowRepository.get({ id: workflowId });

		if (!workflow) {
			if (isRoot) {
				throw new NotFoundError('Workflow not found');
			}
			// A referenced sub-workflow may have been deleted; skip it rather than failing the check.
			return;
		}

		const resolverId = this.dynamicCredentialsProxy.getEffectiveResolverId(workflow.settings);

		for (const node of workflow.nodes ?? []) {
			for (const credentialName in node.credentials ?? {}) {
				const credentialId = node.credentials?.[credentialName]?.id;
				if (!credentialId) {
					continue;
				}
				const fallbacks = acc.get(credentialId) ?? new Set<string | null>();
				fallbacks.add(resolverId);
				acc.set(credentialId, fallbacks);
			}
		}

		for (const subWorkflowId of this.extractSubWorkflowIds(workflow.nodes ?? [])) {
			await this.collectResolvableCredentials(subWorkflowId, acc, visited, user, false);
		}
	}

	/**
	 * Extracts statically-resolvable sub-workflow ids from a workflow's nodes. Considers Execute
	 * Sub-workflow and AI Workflow Tool nodes that reference a stored workflow by id; skips disabled
	 * nodes, non-database sources, and expression-based ids that can't be resolved statically.
	 */
	private extractSubWorkflowIds(nodes: INode[]): string[] {
		const ids = new Set<string>();

		for (const node of nodes) {
			if (node.disabled || !isNodeWithWorkflowSelector(node)) {
				continue;
			}

			const source = node.parameters?.source;
			if (source === 'parameter' || source === 'localFile' || source === 'url') {
				continue;
			}

			const subWorkflowId = this.extractWorkflowId(node.parameters?.workflowId);
			if (subWorkflowId && !subWorkflowId.includes('{')) {
				ids.add(subWorkflowId);
			}
		}

		return [...ids];
	}

	/**
	 * Reads a workflow id from a node's `workflowId` parameter, handling both the plain-string and
	 * the resource-locator (`{ value }`) shapes.
	 */
	private extractWorkflowId(workflowIdParam: unknown): string | undefined {
		if (typeof workflowIdParam === 'string') {
			return workflowIdParam;
		}
		if (
			typeof workflowIdParam === 'object' &&
			workflowIdParam !== null &&
			'value' in workflowIdParam &&
			typeof workflowIdParam.value === 'string'
		) {
			return workflowIdParam.value;
		}
		return undefined;
	}

	private async getCachedResolver(
		resolverId: string,
		cache: Map<string, ResolvedResolver>,
	): Promise<ResolvedResolver> {
		const cached = cache.get(resolverId);
		if (cached) {
			return cached;
		}
		const resolved = await this.getResolver(resolverId);
		cache.set(resolverId, resolved);
		return resolved;
	}

	private async checkCredentialStatus(
		credential: CredentialsEntity,
		options: {
			fallbackResolverId: string | null;
			credentialContext: ICredentialContext;
			resolverCache: Map<string, ResolvedResolver>;
		},
	): Promise<CredentialStatus> {
		const credentialResolverId = credential.resolverId ?? options.fallbackResolverId;
		if (!credentialResolverId) {
			return {
				credentialId: credential.id,
				credentialName: credential.name,
				status: 'resolver_missing' as const,
				credentialType: credential.type,
			};
		}

		const { resolverInstance, resolverConfig } = await this.getCachedResolver(
			credentialResolverId,
			options.resolverCache,
		);

		try {
			await resolverInstance.getSecret(credential.id, options.credentialContext, {
				configuration: resolverConfig,
				resolverName: resolverInstance.metadata.name,
				resolverId: credentialResolverId,
			});
			return {
				credentialId: credential.id,
				resolverId: credentialResolverId,
				credentialName: credential.name,
				status: 'configured',
				credentialType: credential.type,
			};
		} catch (error) {
			return {
				credentialId: credential.id,
				resolverId: credentialResolverId,
				credentialName: credential.name,
				status: 'missing',
				credentialType: credential.type,
			};
		}
	}
}
