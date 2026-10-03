import { isRecord } from '@n8n/utils/is-record';
import type { RuleTester } from 'oxlint/plugins-dev';

import { UserError } from './errors';

// oxlint exports its rule types only through the `RuleTester` signature.
type Rule = Parameters<RuleTester['run']>[1];
type Visitor = ReturnType<NonNullable<Rule['create']>>;
type Expression = Parameters<NonNullable<Visitor['LogicalExpression']>>[0]['left'];
type MemberRead = Extract<Expression, { type: 'MemberExpression'; computed: false }>;

const noRawError: Rule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Node code throws `UserError` or `OperationalError`, not a plain `Error`.',
		},
		schema: [],
		messages: {
			rawError:
				'Throw `UserError` when the user can fix the cause, or `OperationalError` when a retry can pass. Import both from `@n8n/node-sdk`.',
		},
	},
	create: (context) => {
		const check = (callee: Expression) => {
			if (callee.type === 'Identifier' && callee.name === 'Error') {
				context.report({ node: callee, messageId: 'rawError' });
			}
		};
		return {
			NewExpression: ({ callee }) => check(callee),
			CallExpression: ({ callee }) => check(callee),
		};
	},
};

/** The part of the TypeScript compiler API that `no-redefault` reads. */
interface TypeServices {
	readonly program: { getTypeChecker(): TypeChecker };
	readonly esTreeNodeToTSNodeMap: { get(node: object): TsNode };
}
interface TsNode {
	readonly kind: number;
}
interface TsType {
	readonly flags: number;
}
interface TsSymbol {
	readonly flags: number;
}
interface TypeChecker {
	getTypeAtLocation(node: TsNode): TsType;
	getNonNullableType(type: TsType): TsType;
	getUndefinedType(): TsType;
	isTypeAssignableTo(source: TsType, target: TsType): boolean;
	getPropertyOfType(type: TsType, name: string): TsSymbol | undefined;
	getTypeOfSymbolAtLocation(symbol: TsSymbol, node: TsNode): TsType;
}

const hasTypes = (services: unknown): services is TypeServices =>
	isRecord(services) &&
	isRecord(services.program) &&
	typeof services.program.getTypeChecker === 'function' &&
	isRecord(services.esTreeNodeToTSNodeMap);

/** The named field reads from the root to `node`, or undefined for any other expression. */
const linksOf = (node: Expression): readonly MemberRead[] | undefined => {
	if (node.type === 'Identifier' || node.type === 'ThisExpression') return [];
	if (node.type !== 'MemberExpression' || node.computed) return undefined;
	const before = linksOf(node.object);
	return before && [...before, node];
};

/**
 * A `??` fallback or a destructuring default for a field that is always set, e.g. an input with
 * `.default(v)`. The fallback is a second default that can drift from the schema.
 * `no-unnecessary-condition` also reports index reads, which a project without
 * `noUncheckedIndexedAccess` types as set, so this rule checks reads of declared named fields only.
 */
const noRedefault: Rule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'A field that is always set has no fallback.',
			requiresTypeChecking: true,
		},
		schema: [],
		messages: {
			redefault: '`{{ field }}` is always set. Remove the fallback.',
		},
	},
	create: (context) => {
		const services = context.sourceCode.parserServices;
		if (!hasTypes(services)) {
			throw new UserError(
				`${context.id} needs type information. Run it with ESLint and typescript-eslint \`parserOptions.projectService\`, not with oxlint.`,
			);
		}
		const tsNodeOf = (node: object) => services.esTreeNodeToTSNodeMap.get(node);
		const checker = services.program.getTypeChecker();
		const typeOf = (node: object) => checker.getTypeAtLocation(tsNodeOf(node));
		// `getNonNullableType` changes a nullable union, `unknown` and a type parameter.
		// `any` takes `undefined`.
		const typeMaybeUnset = (type: TsType) =>
			checker.getNonNullableType(type) !== type ||
			checker.isTypeAssignableTo(checker.getUndefinedType(), type);
		const maybeUnset = (node: object) => typeMaybeUnset(typeOf(node));
		const isDeclared = (link: MemberRead) =>
			link.property.type === 'Identifier' &&
			checker.getPropertyOfType(
				checker.getNonNullableType(typeOf(link.object)),
				link.property.name,
			) !== undefined;
		return {
			LogicalExpression: ({ operator, left }) => {
				if (operator !== '??') return;
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
			AssignmentPattern: (pattern) => {
				const property = pattern.parent;
				if (property.type !== 'Property' || property.computed || property.value !== pattern) return;
				const objectPattern = property.parent;
				if (objectPattern.type !== 'ObjectPattern' || property.key.type !== 'Identifier') return;
				const field = checker.getPropertyOfType(
					checker.getNonNullableType(typeOf(objectPattern)),
					property.key.name,
				);
				if (field === undefined) return;
				const fieldType = checker.getTypeOfSymbolAtLocation(field, tsNodeOf(objectPattern));
				if (typeMaybeUnset(fieldType)) return;
				context.report({
					node: pattern,
					messageId: 'redefault',
					data: { field: property.key.name },
				});
			},
		};
	},
};

/** A lint plugin in the ESLint shape. */
interface ContractLint {
	/** The plugin metadata. */
	readonly meta: {
		/** The rule prefix: `n8n-contract/<rule>`. */
		readonly name: string;
	};
	/** The rules by name. */
	readonly rules: Readonly<Record<'no-raw-error' | 'no-redefault', Rule>>;
}

/**
 * The lint rules for node code, as one plugin in the ESLint rule shape. oxlint loads it as a
 * `jsPlugins` entry and ESLint as a `plugins` entry. `n8n-node-next check` runs its AST rules.
 *
 * - `n8n-contract/no-raw-error`: node code throws `UserError` or `OperationalError`, not `Error`.
 * - `n8n-contract/no-redefault`: no fallback for a field that is always set. It reads types, so it
 *   runs only in ESLint with typescript-eslint type information, not in oxlint.
 *
 * @example
 * ```ts
 * // eslint.config.mjs
 * import contractLint from '@n8n/node-sdk/lint';
 * export default [{
 * 	files: ['src/**\/*.ts'],
 * 	plugins: { 'n8n-contract': contractLint },
 * 	rules: { 'n8n-contract/no-raw-error': 'error', 'n8n-contract/no-redefault': 'error' },
 * }];
 * ```
 */
const contractLint: ContractLint = {
	meta: { name: 'n8n-contract' },
	rules: { 'no-raw-error': noRawError, 'no-redefault': noRedefault },
};

// `module.exports`: oxlint loads a JS plugin from the default export of `import()`.
export = contractLint;
