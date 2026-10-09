import { isNodeTypePolicyRule } from '@n8n/api-types';
import { Service } from '@n8n/di';
import {
	getCredentialOnlyNodeCredentialType,
	isCredentialOnlyNodeType,
	UserError,
} from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

import { NODE_TYPES_KIND } from './constants';
import {
	assertPackagesInstalled,
	type PolicyKindDefinition,
	type SelectorMatcher,
} from './policy-kind';
import type { PolicyRule, PolicySelector } from './policy-rule.types';

/** A node type name is always `<packageName>.<nodeName>`. */
const packageOf = (typeName: string) => typeName.split('.')[0];

/**
 * Matches a node type by its name, by the base node it is a synthetic tool variant of, or by
 * its package. Node types build on nothing, so an `extends` selector never matches.
 */
export function nodeTypeSelectorMatcher(type: { name: string; baseName: string }): SelectorMatcher {
	const packageName = packageOf(type.name);

	return (selector) => {
		switch (selector.kind) {
			case 'name':
				return selector.value === type.name || selector.value === type.baseName;
			case 'package':
				return selector.value === packageName;
			case 'extends':
				return false;
		}
	};
}

/** A rule for the base node also covers its tool variant, and a package rule covers its nodes. */
export function nodeTypeCoveringSelectors(
	selector: PolicySelector,
	baseNameOf: (typeName: string) => string,
): PolicySelector[] {
	if (selector.kind !== 'name') return [selector];

	const baseName = baseNameOf(selector.value);
	return [
		selector,
		...(baseName === selector.value ? [] : [{ kind: 'name' as const, value: baseName }]),
		{ kind: 'package', value: packageOf(selector.value) },
	];
}

/**
 * A credential-only node (`n8n-creds-base.<type>`) exists only in the editor. It is stored and
 * executed as `n8n-nodes-base.httpRequest`, so a rule on the generated name never matches. The
 * credential type rule on `<type>` is what hides and blocks that node, so the write points there.
 */
function assertNoCredentialOnlyNodeRules(rules: readonly PolicyRule[]) {
	for (const { selector } of rules) {
		if (selector.kind === 'name' && isCredentialOnlyNodeType(selector.value)) {
			const credentialType = getCredentialOnlyNodeCredentialType(selector.value);
			throw new UserError(
				`Node type rule names the credential-only node "${selector.value}", which is HTTP Request with a credential attached. Write a credential type rule on "${credentialType}" instead.`,
			);
		}
	}
}

@Service()
export class NodeTypesPolicyKind implements PolicyKindDefinition {
	readonly id = NODE_TYPES_KIND;

	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	knownTypeNames() {
		return Object.keys(this.nodeTypes.getKnownTypes());
	}

	matcherFor(typeName: string) {
		return nodeTypeSelectorMatcher({ name: typeName, baseName: this.baseNameOf(typeName) });
	}

	coveringSelectors(selector: PolicySelector) {
		return nodeTypeCoveringSelectors(selector, (typeName) => this.baseNameOf(typeName));
	}

	assertWritable(rules: readonly PolicyRule[]) {
		assertPackagesInstalled(rules, this.loadNodesAndCredentials);
		if (!rules.every(isNodeTypePolicyRule)) {
			throw new UserError('An "extends" rule is only valid in a credential type policy');
		}
		assertNoCredentialOnlyNodeRules(rules);
	}

	private baseNameOf(typeName: string) {
		return this.nodeTypes.resolveBaseName(typeName).baseName;
	}
}
