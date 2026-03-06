import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { CredentialResolver } from './credential/credential.resolver';
import type { ImportBindings, ImportMode, PackageRequirements } from './import-export.types';
import type { ResolveContext } from './requirement-resolver';
import { SubWorkflowResolver } from './workflow/sub-workflow.resolver';

export interface ResolvedBindings {
	credentialBindings: Map<string, string>;
	subWorkflowBindings: Map<string, string>;
}

/**
 * Coordinates requirement resolution during package import.
 *
 * 1. Apply explicit user-provided bindings (always first)
 * 2. Auto-resolve remaining requirements via pluggable resolvers
 * 3. Assert based on mode (auto/strict/force)
 */
@Service()
export class BindingResolver {
	constructor(
		private readonly credentialResolver: CredentialResolver,
		private readonly subWorkflowResolver: SubWorkflowResolver,
	) {}

	async resolve(
		requirements: PackageRequirements,
		options: {
			userBindings?: ImportBindings;
			mode?: ImportMode;
			skipCredentialAssertions?: boolean;
			targetProjectId?: string;
		},
	): Promise<ResolvedBindings> {
		const mode = options.mode ?? 'auto';
		const credentialBindings = new Map<string, string>();
		const subWorkflowBindings = new Map<string, string>();

		// Step 1: Apply explicit user bindings — always take priority
		if (options.userBindings?.credentials) {
			for (const [sourceId, targetId] of Object.entries(options.userBindings.credentials)) {
				credentialBindings.set(sourceId, targetId);
			}
		}
		if (options.userBindings?.subWorkflows) {
			for (const [sourceId, targetId] of Object.entries(options.userBindings.subWorkflows)) {
				subWorkflowBindings.set(sourceId, targetId);
			}
		}

		// Step 2: Auto-resolve via resolvers (auto and force modes)
		if (mode === 'auto' || mode === 'force') {
			const context: ResolveContext = { targetProjectId: options.targetProjectId };

			for (const req of requirements.credentials) {
				if (credentialBindings.has(req.id)) continue;
				const targetId = await this.credentialResolver.resolve(req, context);
				if (targetId) credentialBindings.set(req.id, targetId);
			}

			for (const req of requirements.subWorkflows) {
				if (subWorkflowBindings.has(req.id)) continue;
				const targetId = await this.subWorkflowResolver.resolve(req, context);
				if (targetId) subWorkflowBindings.set(req.id, targetId);
			}
		}

		// Step 3: Assert based on mode
		if (mode === 'strict') {
			this.assertAllResolved(
				requirements,
				credentialBindings,
				subWorkflowBindings,
				'Unresolved requirements',
				'Provide explicit bindings or use mode "auto".',
				options.skipCredentialAssertions,
			);
		}

		if (mode === 'auto') {
			this.assertAllResolved(
				requirements,
				credentialBindings,
				subWorkflowBindings,
				'Could not auto-resolve requirements',
				'Provide explicit bindings or use mode "force".',
				options.skipCredentialAssertions,
			);
		}

		return { credentialBindings, subWorkflowBindings };
	}

	private assertAllResolved(
		requirements: PackageRequirements,
		credentialBindings: Map<string, string>,
		subWorkflowBindings: Map<string, string>,
		errorPrefix: string,
		suggestion: string,
		skipCredentials = false,
	): void {
		const unresolvedCredentials = skipCredentials
			? []
			: requirements.credentials.filter((r) => !credentialBindings.has(r.id));
		const unresolvedSubWorkflows = requirements.subWorkflows.filter(
			(r) => !subWorkflowBindings.has(r.id),
		);

		if (unresolvedCredentials.length === 0 && unresolvedSubWorkflows.length === 0) return;

		const details: string[] = [];
		for (const cred of unresolvedCredentials) {
			details.push(`credential "${cred.name}" (${cred.type}, id: ${cred.id})`);
		}
		for (const wf of unresolvedSubWorkflows) {
			details.push(`sub-workflow (id: ${wf.id})`);
		}
		throw new BadRequestError(`${errorPrefix}: ${details.join(', ')}. ${suggestion}`);
	}
}
