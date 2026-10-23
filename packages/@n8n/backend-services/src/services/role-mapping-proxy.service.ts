import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { RoleMappingRule } from '@n8n/inbound-auth';

export interface RoleResolverContext {
	/** Protocol-agnostic merged claims */
	$claims: Record<string, unknown>;

	/** OIDC-specific data */
	$oidc?: {
		idToken: Record<string, unknown>;
		userInfo: Record<string, unknown>;
	};

	/** SAML-specific data */
	$saml?: {
		attributes: Record<string, unknown>;
	};

	// Future: $ldap?: { attributes: Record<string, unknown> }

	$provider: 'oidc' | 'saml' | 'ldap' | 'oauth2';

	/** Populated per-rule during project role evaluation */
	$project?: ProjectInfo;
}

export interface RoleMappingConfig {
	instanceRoleRules: RoleMappingRule[];
	projectRoleRules: RoleMappingRule[];
	fallbackInstanceRole: string;
}

export interface ResolvedInstanceRole {
	role: string;
	matchedRuleId: string | null;
	expression: string | null;
	isFallback: boolean;
}

export interface ResolvedProjectRole {
	projectId: string;
	role: string;
	matchedRuleId: string;
	expression: string;
}

export interface ResolvedRoles {
	instanceRole: ResolvedInstanceRole;
	projectRoles: Map<string, ResolvedProjectRole>;
}

export interface ProjectInfo {
	id: string;
	name: string;
	type: 'personal' | 'team';
	description: string | null;
}

export interface RoleMappingProvider {
	resolveRoles(
		config: RoleMappingConfig,
		context: RoleResolverContext,
		ctx?: OperationContext,
	): Promise<ResolvedRoles>;
	applyResolvedRoles(
		user: User,
		resolved: ResolvedRoles,
		managed: { instanceRole: boolean; projectRoles: boolean },
	): Promise<void>;
}

/** Lets the identity layer map roles without importing the licensed provisioning module. */
@Service()
export class RoleMappingProxyService {
	private provider: RoleMappingProvider | null = null;

	registerProvider(provider: RoleMappingProvider): void {
		this.provider = provider;
	}

	/** Null until the provisioning module registers itself; the caller decides how to fail. */
	getProvider(): RoleMappingProvider | null {
		return this.provider;
	}
}
