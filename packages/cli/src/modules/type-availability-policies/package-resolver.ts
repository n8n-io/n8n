import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from './constants';
import {
	nodeTypePackageResolver,
	type PackageResolver,
	type PolicedType,
} from './policy-evaluator';

/**
 * A credential type name (e.g. `slackApi`) carries no package prefix, unlike a node type
 * (`n8n-nodes-base.slack`), so its package can only be learned from whichever loader actually
 * loaded it. Mirrors `LoadNodesAndCredentials.getCredential()`'s own lookup: find the loader
 * whose `known.credentials` names this type, and report its `packageName`.
 *
 * `Object.hasOwn`, not `in`: `in` also matches an inherited property, so a credential type
 * literally named `toString` or `constructor` would resolve through `Object.prototype`
 * instead of reporting `null`.
 *
 * When more than one loaded package registers the same credential type, this reports the
 * last one — the same loader `getCredential()` ends up serving, since its own lookup loop
 * keeps overwriting with each match instead of stopping at the first.
 */
function credentialTypePackageResolver(
	loadNodesAndCredentials: LoadNodesAndCredentials,
): PackageResolver {
	return (typeName) => {
		let packageName: string | null = null;

		for (const loader of Object.values(loadNodesAndCredentials.loaders)) {
			if (Object.hasOwn(loader.known.credentials, typeName)) {
				packageName = loader.packageName;
			}
		}

		return packageName;
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
 * Every type `typeName` is built on, walking `extends` breadth-first. The visited set keeps a
 * community package that declares a cycle from looping forever.
 */
function credentialTypeAncestors(
	loadNodesAndCredentials: LoadNodesAndCredentials,
	typeName: string,
): string[] {
	const { knownCredentials } = loadNodesAndCredentials;
	const parentsOf = (name: string) =>
		Object.hasOwn(knownCredentials, name) ? (knownCredentials[name].extends ?? []) : [];

	const seen = new Set<string>([typeName]);
	const queue = [...parentsOf(typeName)];

	for (let index = 0; index < queue.length; index++) {
		const parent = queue[index];
		if (seen.has(parent)) continue;
		seen.add(parent);
		queue.push(...parentsOf(parent));
	}

	seen.delete(typeName);
	return [...seen];
}

export function policedTypeFor(
	kind: string,
	nodeTypes: NodeTypes,
	loadNodesAndCredentials: LoadNodesAndCredentials,
): (name: string) => PolicedType {
	if (kind === NODE_TYPES_KIND) {
		return (name) => ({ name, baseName: nodeTypes.resolveBaseName(name).baseName });
	}

	return (name) => ({
		name,
		baseName: name,
		ancestors: credentialTypeAncestors(loadNodesAndCredentials, name),
	});
}

/** Whether a credential type is known, checked at write time for an `extends` rule's value. */
export function isCredentialTypeKnown(
	loadNodesAndCredentials: LoadNodesAndCredentials,
	typeName: string,
): boolean {
	return Object.hasOwn(loadNodesAndCredentials.knownCredentials, typeName);
}

/**
 * Whether `packageName` names a package this instance actually has loaded — checked at write
 * time so a `package` rule can never be saved unable to match anything.
 *
 * `Object.hasOwn`, not `in`: `in` also matches an inherited property, so a rule naming
 * `toString` or `constructor` would pass this check through `Object.prototype` even though
 * no such package is loaded.
 */
export function isPackageInstalled(
	loadNodesAndCredentials: LoadNodesAndCredentials,
	packageName: string,
): boolean {
	return Object.hasOwn(loadNodesAndCredentials.loaders, packageName);
}
