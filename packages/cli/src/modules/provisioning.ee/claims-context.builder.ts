import type { ProjectInfo, RoleResolverContext } from './role-resolver-types';

export function buildOidcClaimsContext(
	idTokenClaims: Record<string, unknown>,
	userInfo: Record<string, unknown>,
): RoleResolverContext {
	return {
		$claims: structuredClone({ ...idTokenClaims, ...userInfo }),
		$oidc: {
			idToken: structuredClone(idTokenClaims),
			userInfo: structuredClone(userInfo),
		},
		$provider: 'oidc',
	};
}

export function buildSamlClaimsContext(
	rawAttributes: Record<string, unknown>,
): RoleResolverContext {
	return {
		$claims: structuredClone(rawAttributes),
		$saml: {
			attributes: structuredClone(rawAttributes),
		},
		$provider: 'saml',
	};
}

export function withProjectContext(
	context: RoleResolverContext,
	project: ProjectInfo,
): RoleResolverContext {
	return {
		...context,
		$project: { ...project },
	};
}
