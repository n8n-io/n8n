import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { CREDENTIAL_TYPES_KIND } from './constants';
import {
	assertPackagesInstalled,
	type PolicyKindDefinition,
	type SelectorMatcher,
} from './policy-kind';
import type { PolicyRule, PolicySelector } from './policy-rule.types';

/** What a credential type's rules need to know about it. */
export type CredentialTypeFacts = {
	packageOf(typeName: string): string | null;
	ancestorsOf(typeName: string): readonly string[];
};

/** Matches a credential type by its name, its package, or a type it is built on. */
export function credentialTypeSelectorMatcher(type: {
	name: string;
	package: string | null;
	ancestors: readonly string[];
}): SelectorMatcher {
	return (selector) => {
		switch (selector.kind) {
			case 'name':
				return selector.value === type.name;
			case 'package':
				return selector.value === type.package;
			case 'extends':
				return selector.value === type.name || type.ancestors.includes(selector.value);
		}
	};
}

/**
 * An `extends` rule covers its base and every type built on it, and a package rule covers its
 * types. A family can span packages, so nothing but a wider family covers an `extends` rule.
 */
export function credentialTypeCoveringSelectors(
	selector: PolicySelector,
	facts: CredentialTypeFacts,
): PolicySelector[] {
	if (selector.kind === 'package') return [selector];

	const family: PolicySelector[] = [selector.value, ...facts.ancestorsOf(selector.value)].map(
		(value) => ({ kind: 'extends', value }),
	);
	if (selector.kind === 'extends') return family;

	const packageName = facts.packageOf(selector.value);
	return [
		selector,
		...(packageName === null ? [] : [{ kind: 'package' as const, value: packageName }]),
		...family,
	];
}

@Service()
export class CredentialTypesPolicyKind implements PolicyKindDefinition, CredentialTypeFacts {
	readonly id = CREDENTIAL_TYPES_KIND;

	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	knownTypeNames() {
		return Object.keys(this.loadNodesAndCredentials.knownCredentials);
	}

	matcherFor(typeName: string) {
		return credentialTypeSelectorMatcher({
			name: typeName,
			package: this.packageOf(typeName),
			ancestors: this.ancestorsOf(typeName),
		});
	}

	coveringSelectors(selector: PolicySelector) {
		return credentialTypeCoveringSelectors(selector, this);
	}

	assertWritable(rules: readonly PolicyRule[]) {
		assertPackagesInstalled(rules, this.loadNodesAndCredentials);

		const unknownBases = new Set(
			rules.flatMap(({ selector }) =>
				selector.kind === 'extends' && !this.isKnown(selector.value) ? [selector.value] : [],
			),
		);
		if (unknownBases.size > 0) {
			throw new UserError(
				`Extends rule names a credential type that is not installed: ${[...unknownBases].join(', ')}`,
			);
		}
	}

	/**
	 * A credential type name carries no package prefix, so the loader that loaded it decides. When
	 * two packages register one type, the last wins, as in `LoadNodesAndCredentials.getCredential()`.
	 */
	packageOf(typeName: string) {
		let packageName: string | null = null;

		for (const loader of Object.values(this.loadNodesAndCredentials.loaders)) {
			if (Object.hasOwn(loader.known.credentials, typeName)) packageName = loader.packageName;
		}

		return packageName;
	}

	/** Breadth-first over `extends`. The visited set stops a community package's cycle. */
	ancestorsOf(typeName: string) {
		const seen = new Set<string>([typeName]);
		const queue = [...this.parentsOf(typeName)];

		for (let index = 0; index < queue.length; index++) {
			const parent = queue[index];
			if (seen.has(parent)) continue;
			seen.add(parent);
			queue.push(...this.parentsOf(parent));
		}

		seen.delete(typeName);
		return [...seen];
	}

	private parentsOf(typeName: string) {
		return this.isKnown(typeName)
			? (this.loadNodesAndCredentials.knownCredentials[typeName].extends ?? [])
			: [];
	}

	/** `Object.hasOwn`, not `in`, so `toString` is never a known type. */
	private isKnown(typeName: string) {
		return Object.hasOwn(this.loadNodesAndCredentials.knownCredentials, typeName);
	}
}
