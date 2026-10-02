import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

/**
 * A `??` fallback or a destructuring default for a field that is always set, e.g. an input with
 * `.default(v)`. The fallback is a second default that can drift from the schema. `no-unnecessary-condition` also
 * reports index reads, which this package types as set (no `noUncheckedIndexedAccess`), so this
 * rule checks reads of declared named fields only, e.g. `input.header.headerRow`.
 */
const noRedefault = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			redefault: '`{{ field }}` is always set. Remove the fallback.',
		},
	},
	create(context) {
		const { program, esTreeNodeToTSNodeMap } = context.sourceCode.parserServices;
		const checker = program.getTypeChecker();
		const typeOf = (node) => checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(node));
		// `getNonNullableType` changes a nullable union, `unknown` and a type parameter.
		// `any` takes `undefined`.
		const typeMaybeUnset = (type) =>
			checker.getNonNullableType(type) !== type ||
			checker.isTypeAssignableTo(checker.getUndefinedType(), type);
		const maybeUnset = (node) => typeMaybeUnset(typeOf(node));
		const isDeclared = (link) =>
			checker.getPropertyOfType(
				checker.getNonNullableType(typeOf(link.object)),
				link.property.name,
			) !== undefined;
		// The named field reads from the root to `node`, or undefined for any other expression.
		const linksOf = (node) => {
			if (node.type === 'Identifier' || node.type === 'ThisExpression') return [];
			if (node.type !== 'MemberExpression' || node.computed) return undefined;
			const before = linksOf(node.object);
			return before && [...before, node];
		};
		return {
			"LogicalExpression[operator='??']"({ left }) {
				const read = left.type === 'ChainExpression' ? left.expression : left;
				const links = linksOf(read);
				if (links === undefined || links.length === 0) return;
				if (!links.every(isDeclared) || maybeUnset(read)) return;
				if (links.some((link) => link.optional && maybeUnset(link.object))) return;
				context.report({
					node: left,
					messageId: 'redefault',
					data: { field: context.sourceCode.getText(left) },
				});
			},
			// `const { into = 'data' } = aggregate`: the type of the pattern is the destructured value.
			'ObjectPattern > Property[computed=false] > AssignmentPattern.value'(pattern) {
				const { key } = pattern.parent;
				if (key.type !== 'Identifier') return;
				const objectPattern = pattern.parent.parent;
				const source = checker.getNonNullableType(typeOf(objectPattern));
				const field = checker.getPropertyOfType(source, key.name);
				if (field === undefined) return;
				const fieldType = checker.getTypeOfSymbolAtLocation(
					field,
					esTreeNodeToTSNodeMap.get(objectPattern),
				);
				if (typeMaybeUnset(fieldType)) return;
				context.report({ node: pattern, messageId: 'redefault', data: { field: key.name } });
			},
		};
	},
};

// Shorthand, so code-health's lint-config-layering does not read the rule table as severities.
const rules = { 'no-redefault': noRedefault };

// Frozen bundles are test fixtures and keep their bytes.
export default defineConfig(globalIgnores(['fixtures/versions/**']), backendConfig, {
	files: ['src/nodes/**/*.ts'],
	plugins: { 'nodes-base-next': { rules } },
	rules: { 'nodes-base-next/no-redefault': 'error' },
});
