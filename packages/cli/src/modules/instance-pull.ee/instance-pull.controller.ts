import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { BindingSessionService } from './binding-session.service';

/**
 * Internal REST API backing the prd `/credential-binding/<pr>` page. Reads the
 * per-PR required-credential session, computes live satisfaction against this
 * instance's credentials, and records the operator's resolutions (bind-existing).
 *
 * Sessions are intentionally cross-actor (created by the CI API-key principal via
 * the deploy dry-run, resolved here by a human operator), so they are keyed by PR
 * only — not per-user. Writes are access-checked (an operator can only bind to a
 * credential they can use); reads expose only non-secret requirement metadata.
 * Production hardening (out of POC scope): gate this whole controller behind an
 * operator/admin scope so only release operators can drive binding sessions.
 */
@RestController('/credential-binding')
export class InstancePullController {
	constructor(
		private readonly bindingSessions: BindingSessionService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinder: CredentialsFinderService,
	) {}

	/** Required credentials for a PR + whether each is resolved on this instance. */
	@Get('/:pr')
	async getBinding(req: AuthenticatedRequest<{ pr: string }>) {
		const pr = req.params.pr;
		const requirements = this.bindingSessions.requirementsFor(pr);
		const bindings = this.bindingSessions.bindingsFor(pr);

		const rows = await Promise.all(
			requirements.map(async (requirement) => {
				// Resolved target = an explicit bind, else the source id itself (create-with-id path).
				const targetId = bindings.get(requirement.sourceId) ?? requirement.sourceId;
				const credential = await this.credentialsFinder.findCredentialForUser(targetId, req.user, [
					'credential:read',
				]);
				const satisfied =
					!!credential &&
					(!requirement.expectedType || credential.type === requirement.expectedType);
				return {
					sourceId: requirement.sourceId,
					expectedType: requirement.expectedType ?? null,
					usedByWorkflows: requirement.usedByWorkflows,
					boundTargetId: bindings.get(requirement.sourceId) ?? null,
					satisfied,
				};
			}),
		);

		return { pr, requirements: rows };
	}

	/** Existing credentials of a given type, for the "bind existing" picker. */
	@Get('/:pr/options')
	async getOptions(req: AuthenticatedRequest<{ pr: string }, {}, {}, { type?: string }>) {
		const type = typeof req.query.type === 'string' ? req.query.type : undefined;
		if (!type) return { options: [] };

		const credentials = await this.credentialsService.getMany(req.user, {
			listQueryOptions: { filter: { type } },
			includeGlobal: true,
		});

		// getMany's type filter is a substring match; keep only exact-type matches.
		const options = credentials
			.filter((credential) => credential.type === type)
			.map((credential) => ({ id: credential.id, name: credential.name, type: credential.type }));

		return { options };
	}

	/** Record a "bind existing" resolution (source credential id → target prd credential id). */
	@Post('/:pr/bind')
	async bind(
		req: AuthenticatedRequest<{ pr: string }, {}, { sourceId?: string; targetId?: string }>,
	) {
		const pr = req.params.pr;
		const body = req.body;
		if (!body?.sourceId || !body?.targetId) {
			throw new BadRequestError('sourceId and targetId are required');
		}
		// Only let the operator bind to a credential they can actually use (mirrors the
		// satisfaction check). Prevents binding a PR to an inaccessible credential id.
		const credential = await this.credentialsFinder.findCredentialForUser(body.targetId, req.user, [
			'credential:read',
		]);
		if (!credential) {
			throw new ForbiddenError('You do not have access to the target credential');
		}
		this.bindingSessions.setBinding(pr, body.sourceId, body.targetId);
		return { ok: true };
	}
}
