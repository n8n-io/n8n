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

	$provider: 'oidc' | 'saml' | 'ldap';

	/** Populated per-rule during project role evaluation */
	$project?: ProjectInfo;
}

export interface RoleMappingRule {
	id: string;
	expression: string;
	role: string;
	/** undefined = instance role rule; set = project role rule */
	projectId?: string;
	enabled: boolean;
	description?: string;
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
