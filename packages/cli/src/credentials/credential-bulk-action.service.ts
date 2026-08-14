import type { BulkCredentialActionResult, BulkCredentialActionResultItem } from '@n8n/api-types';
import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { type AuthorizedCredential, CredentialsFinderService } from './credentials-finder.service';
import { CredentialsService } from './credentials.service';
import { EnterpriseCredentialsService } from './credentials.service.ee';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { EventService } from '@/events/event.service';
import { ProjectService } from '@/services/project.service.ee';

type PreflightIssue = {
	credentialId?: string;
	reason: string;
	message: string;
};

const CREDENTIAL_BATCH_SIZE = 5;

@Service()
export class CredentialBulkActionService {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
	) {}

	async delete(user: User, credentialIds: string[]): Promise<BulkCredentialActionResult> {
		const credentials = await this.preflight(user, credentialIds, 'credential:delete');
		const issues = await this.validateResolvableDeletePermissions(user, credentials);
		if (issues.length > 0) throw this.preflightError(issues);

		return await this.execute(credentials, async (authorized) => {
			const { id: credentialId, type: credentialType, isResolvable } = authorized.credential;
			await this.credentialsService.deleteAuthorized(user, authorized);
			this.eventService.emit('credentials-deleted', {
				user,
				credentialType,
				credentialId,
			});
			if (isResolvable) {
				this.eventService.emit('private-credential-deleted', {
					user,
					credentialType,
					credentialId,
				});
			}
		});
	}

	async transfer(
		user: User,
		credentialIds: string[],
		destinationProjectId: string,
	): Promise<BulkCredentialActionResult> {
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['credential:create'],
		);
		if (!destinationProject) {
			throw this.preflightError([
				{
					reason: 'destinationNotFoundOrForbidden',
					message: 'The destination project does not exist or is not accessible.',
				},
			]);
		}

		const credentials = await this.preflight(user, credentialIds, 'credential:move');
		const issues = await this.validateTransfers(user, credentials, destinationProject);
		if (issues.length > 0) throw this.preflightError(issues);

		return await this.execute(credentials, async (authorized) => {
			await this.enterpriseCredentialsService.transferAuthorized(
				user,
				authorized,
				destinationProject,
			);
		});
	}

	private async preflight<S extends Scope>(
		user: User,
		credentialIds: string[],
		scope: S,
	): Promise<Array<AuthorizedCredential<S>>> {
		const uniqueIds = [...new Set(credentialIds)];
		const authorized = await this.credentialsFinderService.findAuthorizedCredentialsByIdsForUser(
			uniqueIds,
			user,
			scope,
		);
		const credentialById = new Map(authorized.map((item) => [item.credential.id, item]));
		const issues = uniqueIds.flatMap((credentialId) =>
			credentialById.has(credentialId)
				? []
				: [
						{
							credentialId,
							reason: 'notFoundOrForbidden',
							message: 'Credential does not exist or is not accessible.',
						},
					],
		);
		if (issues.length > 0) throw this.preflightError(issues);

		return uniqueIds
			.map((id) => credentialById.get(id))
			.filter((credential) => credential !== undefined);
	}

	private async validateResolvableDeletePermissions(
		user: User,
		credentials: Array<AuthorizedCredential<'credential:delete'>>,
	): Promise<PreflightIssue[]> {
		const results = await Promise.allSettled(
			credentials
				.filter(({ credential }) => credential.isResolvable)
				.map(async ({ credential }) => {
					const ownerProjectId = credential.shared.find(
						({ role }) => role === 'credential:owner',
					)?.projectId;
					await this.credentialsService.ensureCanManageEndUserCredential(user, ownerProjectId);
					return credential.id;
				}),
		);

		return results.flatMap((result, index) =>
			result.status === 'rejected'
				? [
						{
							credentialId: credentials.filter(({ credential }) => credential.isResolvable)[index]
								.credential.id,
							reason: 'endUserCredentialForbidden',
							message: ensureError(result.reason).message,
						},
					]
				: [],
		);
	}

	private async validateTransfers(
		user: User,
		credentials: Array<AuthorizedCredential<'credential:move'>>,
		destinationProject: Project,
	): Promise<PreflightIssue[]> {
		const results = await Promise.allSettled(
			credentials.map(
				async (authorized) =>
					await this.enterpriseCredentialsService.validateTransferAuthorized(
						user,
						authorized,
						destinationProject,
					),
			),
		);

		return results.flatMap((result, index) =>
			result.status === 'rejected'
				? [
						{
							credentialId: credentials[index].credential.id,
							reason: 'invalidTransfer',
							message: ensureError(result.reason).message,
						},
					]
				: [],
		);
	}

	private async execute<S extends Scope>(
		credentials: Array<AuthorizedCredential<S>>,
		executeItem: (credential: AuthorizedCredential<S>) => Promise<void>,
	): Promise<BulkCredentialActionResult> {
		const results: BulkCredentialActionResultItem[] = [];

		for (let start = 0; start < credentials.length; start += CREDENTIAL_BATCH_SIZE) {
			const batch = credentials.slice(start, start + CREDENTIAL_BATCH_SIZE);
			const batchResults = await Promise.all(
				batch.map(async (authorized): Promise<BulkCredentialActionResultItem> => {
					const credentialId = authorized.credential.id;
					try {
						await executeItem(authorized);
						return { credentialId, status: 'completed' };
					} catch (error) {
						return {
							credentialId,
							status: 'failed',
							reason: 'runtimeFailure',
							message: ensureError(error).message,
						};
					}
				}),
			);
			results.push(...batchResults);

			if (batchResults.some(({ status }) => status === 'failed')) {
				results.push(
					...credentials.slice(start + batch.length).map(({ credential }) => ({
						credentialId: credential.id,
						status: 'notAttempted' as const,
					})),
				);
				return { status: 'partial', results };
			}
		}

		return { status: 'completed', results };
	}

	private preflightError(issues: PreflightIssue[]): UnprocessableRequestError {
		return new UnprocessableRequestError('Bulk credential action preflight failed', undefined, {
			issues,
		});
	}
}
