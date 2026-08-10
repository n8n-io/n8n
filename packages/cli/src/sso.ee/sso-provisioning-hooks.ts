import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

/** Claims an SSO login carries, in the shape the protocol delivered them. */
export type SsoLoginClaims =
	| {
			provider: 'saml';
			rawAttributes: Record<string, unknown>;
			/** Instance role attribute, already mapped via the configured claim name. */
			instanceRole?: string;
			/** Project role attributes, already mapped via the configured claim name. */
			projectRoles?: string[];
	  }
	| {
			provider: 'oidc';
			claims: Record<string, unknown>;
			userInfo: Record<string, unknown>;
	  };

export interface SsoProvisioningHandler {
	/** SAML attribute names carrying role claims; `null` when that scope's provisioning is disabled. */
	getSamlRoleClaimNames(): Promise<{ instanceRole: string | null; projectRoles: string | null }>;

	/** Extra OAuth scope to request on OIDC logins; `undefined` when role provisioning is disabled. */
	getOidcScope(): Promise<string | undefined>;

	/** Throws when role mapping denies the login. Runs before any account is created or session issued. */
	assertLoginAllowed(login: SsoLoginClaims): Promise<void>;

	/** Provisions instance/project roles for the logged-in user. */
	provisionRoles(user: User, login: SsoLoginClaims): Promise<void>;
}

/**
 * Login hooks through which the provisioning module plugs into SSO logins
 * without the SSO modules importing it.
 *
 * The module registers its handler on init — same pattern as
 * `RoleDeletionCheckProxy`. Until a handler is registered (e.g. the module is
 * unlicensed), every hook no-ops, which matches the provisioning behavior
 * with its default (all-disabled) configuration.
 */
@Service()
export class SsoProvisioningHooks implements SsoProvisioningHandler {
	private handler: SsoProvisioningHandler | undefined;

	registerHandler(handler: SsoProvisioningHandler): void {
		this.handler = handler;
	}

	async getSamlRoleClaimNames(): Promise<{
		instanceRole: string | null;
		projectRoles: string | null;
	}> {
		return (
			(await this.handler?.getSamlRoleClaimNames()) ?? { instanceRole: null, projectRoles: null }
		);
	}

	async getOidcScope(): Promise<string | undefined> {
		return await this.handler?.getOidcScope();
	}

	async assertLoginAllowed(login: SsoLoginClaims): Promise<void> {
		await this.handler?.assertLoginAllowed(login);
	}

	async provisionRoles(user: User, login: SsoLoginClaims): Promise<void> {
		await this.handler?.provisionRoles(user, login);
	}
}
