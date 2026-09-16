import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { CREDENTIAL_TYPES_KIND } from './constants';
import { nodeTypePackageResolver, type PackageResolver } from './policy-evaluator';

/**
 * A credential type name (e.g. `slackApi`) carries no package prefix, unlike a node type
 * (`n8n-nodes-base.slack`), so its package can only be learned from whichever loader actually
 * loaded it. Mirrors `LoadNodesAndCredentials.getCredential()`'s own lookup: find the loader
 * whose `known.credentials` names this type, and report its `packageName`.
 */
function credentialTypePackageResolver(
	loadNodesAndCredentials: LoadNodesAndCredentials,
): PackageResolver {
	return (typeName) => {
		for (const loader of Object.values(loadNodesAndCredentials.loaders)) {
			if (typeName in loader.known.credentials) return loader.packageName;
		}

		return null;
	};
}

/**
 * The package resolver a policy `kind` evaluates and shadow-lints its `package` selectors
 * with — pass to `evaluateType`, `evaluateComposedType` and `lintRulesForShadowing`.
 */
export function packageResolverFor(
	kind: string,
	loadNodesAndCredentials: LoadNodesAndCredentials,
): PackageResolver {
	return kind === CREDENTIAL_TYPES_KIND
		? credentialTypePackageResolver(loadNodesAndCredentials)
		: nodeTypePackageResolver;
}

/**
 * Whether `packageName` names a package this instance actually has loaded — checked at write
 * time so a `package` rule can never be saved unable to match anything.
 */
export function isPackageInstalled(
	loadNodesAndCredentials: LoadNodesAndCredentials,
	packageName: string,
): boolean {
	return packageName in loadNodesAndCredentials.loaders;
}
