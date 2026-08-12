import type { CredentialsEntity } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import { z } from 'zod';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { OauthService } from '@/oauth/oauth.service';

// ── One-off task credential contracts ────────────────────────────────────────
//
// Literal copies of `credentialEnvVarName`, `resolvedCredentialEnvSchema`, and
// `OneOffTaskCredentialResolver` from
// `packages/@n8n/instance-ai/src/one-off-task/contracts.ts`. The package does
// not export that module yet, so this service mirrors the contracts
// structurally; integration swaps these copies for the package import once the
// subpath is exported. Keep the logic byte-identical to the source.

/**
 * Deterministic env var name for an injected credential field:
 * `N8N_TASK_<CREDENTIAL>_<FIELD>`, upper-snake.
 */
export function credentialEnvVarName(credentialName: string, field: string): string {
	const toUpperSnake = (value: string) =>
		value
			.replace(/[^a-zA-Z0-9]+/g, '_')
			.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
			.replace(/^_+|_+$/g, '')
			.toUpperCase();
	return `N8N_TASK_${toUpperSnake(credentialName)}_${toUpperSnake(field)}`;
}

export const resolvedCredentialEnvSchema = z.object({
	/** Env var name → secret value, named per `credentialEnvVarName`. */
	envVars: z.record(z.string()),
	/** For OAuth: access-token expiry (ISO 8601). Absent for static keys. */
	expiresAt: z.string().optional(),
});
export type ResolvedCredentialEnv = z.infer<typeof resolvedCredentialEnvSchema>;

export interface OneOffTaskCredentialResolver {
	resolveForOneOffTask(options: {
		credentialId: string;
		userId: string;
		projectId?: string;
	}): Promise<ResolvedCredentialEnv>;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Root credential type every OAuth2-based credential extends. */
const OAUTH2_BASE_CREDENTIAL_TYPE = 'oAuth2Api';

function isObjectLiteral(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Resolves an n8n credential into injectable env values for a one-off task
 * sandbox (see `packages/@n8n/instance-ai/docs/one-off-task-sandboxes.md`,
 * "Decryption: one privileged adapter method").
 *
 * This is the single privileged decryption path for one-off tasks. The general
 * Instance AI credential boundary stays metadata-only; values returned here go
 * straight into the per-exec sandbox environment and must never be logged.
 */
@Service()
export class OneOffTaskCredentialService implements OneOffTaskCredentialResolver {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly oauthService: OauthService,
	) {}

	async resolveForOneOffTask(options: {
		credentialId: string;
		userId: string;
		projectId?: string;
	}): Promise<ResolvedCredentialEnv> {
		const { credentialId, userId, projectId } = options;

		const credential = await this.findUsableCredential(credentialId, userId, projectId);

		const resolved = this.isOAuth2Type(credential.type)
			? await this.resolveOAuth2(credential, projectId)
			: await this.resolveStatic(credential);

		return resolvedCredentialEnvSchema.parse(resolved);
	}

	/**
	 * One error for "does not exist" and "exists but forbidden" — the message
	 * must never reveal whether the credential exists.
	 */
	private accessDeniedError(credentialId: string): UserError {
		return new UserError(`Credential ${credentialId} not found or not accessible`);
	}

	/**
	 * Recheck access at resolve time: the user must be able to use the
	 * credential (same `credential:read` sharing check the credential test and
	 * decrypt endpoints use), and in a project-bound run the credential must
	 * also be usable from that project — the same project-shared-or-global
	 * intersection as `getCredentialsAUserCanUseInAWorkflow`.
	 */
	private async findUsableCredential(
		credentialId: string,
		userId: string,
		projectId?: string,
	): Promise<CredentialsEntity> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role'],
		});
		if (!user) throw this.accessDeniedError(credentialId);

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) throw this.accessDeniedError(credentialId);

		if (projectId && !this.isUsableInProject(credential, projectId)) {
			throw this.accessDeniedError(credentialId);
		}

		return credential;
	}

	/** Mirrors `OauthService.credentialIsAccessibleToProject`. */
	private isUsableInProject(credential: CredentialsEntity, projectId: string): boolean {
		return credential.isGlobal || (credential.shared ?? []).some((s) => s.projectId === projectId);
	}

	/**
	 * A credential is OAuth2-based when its type name ends in `OAuth2Api` or its
	 * `extends` chain (walked transitively, like `getCredentialFields` in the
	 * adapter service) reaches `oAuth2Api`.
	 */
	private isOAuth2Type(credentialType: string): boolean {
		if (credentialType.endsWith('OAuth2Api')) return true;

		const known = this.loadNodesAndCredentials.knownCredentials;
		const queue = [credentialType];
		const seen = new Set<string>();
		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined || seen.has(current)) continue;
			seen.add(current);
			if (current === OAUTH2_BASE_CREDENTIAL_TYPE) return true;
			queue.push(...(known[current]?.extends ?? []));
		}
		return false;
	}

	/**
	 * OAuth2: refresh first (persisted by the existing OAuth machinery), then
	 * inject only the fresh access token — never the refresh token, never the
	 * client id or secret. The sandbox's hard lifetime is far below the token
	 * TTL, so ordering alone solves expiry.
	 */
	private async resolveOAuth2(
		credential: CredentialsEntity,
		projectId?: string,
	): Promise<ResolvedCredentialEnv> {
		// Distinguish "never connected" (user must reconnect) from a transient
		// refresh failure — `refreshOAuth2CredentialById` returns null for both.
		const currentData = await this.credentialsService.decrypt(credential, true);
		if (!isObjectLiteral(currentData.oauthTokenData)) {
			throw new UserError(
				`Credential ${credential.id} is not connected. Reconnect it and try again.`,
			);
		}

		const refreshProjectId = projectId ?? this.resolveOwnerProjectId(credential);
		const refreshed = await this.oauthService.refreshOAuth2CredentialById(
			credential.id,
			refreshProjectId,
		);
		if (!refreshed) {
			throw new OperationalError(
				`Could not refresh the OAuth token for credential ${credential.id}`,
			);
		}

		// Re-read the persisted token data so the injected value is exactly what
		// the refresh stored — the entity in hand still carries pre-refresh data.
		const fresh = await this.credentialsFinderService.findCredentialById(credential.id);
		if (!fresh) throw this.accessDeniedError(credential.id);
		const freshData = await this.credentialsService.decrypt(fresh, true);
		const tokenData: Record<string, unknown> = isObjectLiteral(freshData.oauthTokenData)
			? freshData.oauthTokenData
			: {};
		const accessToken = tokenData.access_token;
		if (typeof accessToken !== 'string' || accessToken.length === 0) {
			throw new OperationalError(
				`Refreshed OAuth token for credential ${credential.id} has no access token`,
			);
		}

		const expiresAt = this.computeExpiresAt(tokenData);
		return {
			envVars: { [credentialEnvVarName(credential.name, 'access_token')]: accessToken },
			...(expiresAt ? { expiresAt } : {}),
		};
	}

	/**
	 * `refreshOAuth2CredentialById` requires a project the credential is shared
	 * with. Without a caller-bound project, use the owning project — the owner
	 * sharing always exists for a project-scoped credential.
	 */
	private resolveOwnerProjectId(credential: CredentialsEntity): string {
		const shared = credential.shared ?? [];
		const projectId =
			shared.find((s) => s.role === 'credential:owner')?.projectId ?? shared[0]?.projectId;
		if (!projectId) {
			throw new UnexpectedError(`Credential ${credential.id} has no owning project`);
		}
		return projectId;
	}

	/** Static credentials: one env var per injectable data field. */
	private async resolveStatic(credential: CredentialsEntity): Promise<ResolvedCredentialEnv> {
		const data = await this.credentialsService.decrypt(credential, true);

		const envVars: Record<string, string> = {};
		for (const [field, value] of Object.entries(data)) {
			const envValue = this.toEnvValue(value);
			if (envValue === undefined) continue;
			envVars[credentialEnvVarName(credential.name, field)] = envValue;
		}

		return { envVars };
	}

	/**
	 * Injectable value for one credential field: strings as-is, other primitives
	 * stringified. Skips empty values, unresolved expressions (`=`-prefixed —
	 * there is no workflow item context to evaluate them against), and
	 * non-primitive values.
	 */
	private toEnvValue(value: unknown): string | undefined {
		if (typeof value === 'string') {
			if (value === '' || value.startsWith('=')) return undefined;
			return value;
		}
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		return undefined;
	}

	/** Absolute expiry from the freshly persisted `expires_in`, when present. */
	private computeExpiresAt(tokenData: Record<string, unknown>): string | undefined {
		const expiresIn = Number(tokenData.expires_in);
		if (!Number.isFinite(expiresIn) || expiresIn <= 0) return undefined;
		return new Date(Date.now() + expiresIn * 1000).toISOString();
	}
}
