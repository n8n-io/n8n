import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { SsoLoginClaims, SsoProvisioningHandler } from '@/sso.ee/sso-provisioning-hooks';

import { buildOidcClaimsContext, buildSamlClaimsContext } from './claims-context.builder';
import { ProvisioningService } from './provisioning.service.ee';
import type { RoleResolverContext } from './role-resolver-types';

/**
 * Implements the SSO login hooks so provisioning runs on SAML/OIDC logins.
 * Registered with `SsoProvisioningHooks` when the module inits.
 */
@Service()
export class SsoProvisioningHandlerService implements SsoProvisioningHandler {
	constructor(private readonly provisioningService: ProvisioningService) {}

	async getSamlRoleClaimNames() {
		return {
			instanceRole: await this.provisioningService.getInstanceRoleClaimName(),
			projectRoles: await this.provisioningService.getProjectsRolesClaimName(),
		};
	}

	async getOidcScope() {
		const config = await this.provisioningService.getConfig();
		const enabled = config.scopesProvisionInstanceRole || config.scopesProvisionProjectRoles;
		return enabled ? config.scopesName : undefined;
	}

	async assertLoginAllowed(login: SsoLoginClaims) {
		await this.provisioningService.assertSsoLoginAllowed(
			this.buildContext(login),
			await this.getInstanceRoleClaim(login),
		);
	}

	async provisionRoles(user: User, login: SsoLoginClaims) {
		if (await this.provisioningService.isExpressionMappingEnabled()) {
			await this.provisioningService.provisionExpressionMappedRolesForUser(
				user,
				this.buildContext(login),
			);
			return;
		}

		// Called even when the claim is missing so the configured default condition applies
		await this.provisioningService.provisionInstanceRoleForUser(
			user,
			await this.getInstanceRoleClaim(login),
		);

		const projectRolesClaim = await this.getProjectRolesClaim(login);
		if (projectRolesClaim) {
			await this.provisioningService.provisionProjectRolesForUser(user.id, projectRolesClaim);
		}
	}

	private buildContext(login: SsoLoginClaims): RoleResolverContext {
		return login.provider === 'saml'
			? buildSamlClaimsContext(login.rawAttributes)
			: buildOidcClaimsContext(login.claims, login.userInfo);
	}

	private async getInstanceRoleClaim(login: SsoLoginClaims): Promise<unknown> {
		if (login.provider === 'saml') return login.instanceRole;
		const config = await this.provisioningService.getConfig();
		return login.claims[config.scopesInstanceRoleClaimName];
	}

	private async getProjectRolesClaim(login: SsoLoginClaims): Promise<unknown> {
		if (login.provider === 'saml') return login.projectRoles;
		const config = await this.provisioningService.getConfig();
		return login.claims[config.scopesProjectsRolesClaimName];
	}
}
