import type { namedTypes } from 'ast-types';
import { builders as b, namedTypes as n } from 'ast-types';
import type { StatementKind, VariableDeclaratorKind } from 'ast-types/lib/gen/kinds';
import type { NodePath } from 'ast-types/lib/node-path';
import type { Scope } from 'ast-types/lib/scope';
import type { types } from 'recast';
import { visit } from 'recast';

import type { ParentKind } from './Constants';
import { EXEMPT_IDENTIFIER_LIST } from './Constants';

function assertNever(_value: never): _value is never {
	return true;
}

// Captured at module load so printing stays stable even if the global is later replaced.
const safeStringify = JSON.stringify;

// A string literal carrying its own printed form. recast's printer emits `extra.raw`
// verbatim (when it matches the value) instead of stringifying at print time.
export const rawStringLiteral = (value: string) => {
	const literal = b.literal(value);
	// JSON.stringify leaves U+2028/U+2029 unescaped; since the raw form is printed
	// verbatim, escape them so the emitted literal stays single-line and valid.
	const raw = safeStringify(value)
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
	// Attach `extra` in place so the ast-types node identity is preserved.
	(literal as namedTypes.Literal & { extra?: { raw: string; rawValue: string } }).extra = {
		raw,
		rawValue: value,
	};
	return literal;
};

export const globalIdentifier = b.identifier(
	// @ts-expect-error window not in lib target
	typeof window !== 'object' ? 'global' : 'window',
);

const buildGlobalSwitch = (node: types.namedTypes.Identifier, dataNode: DataNode) => {
	return b.memberExpression(
		b.conditionalExpression(
			b.binaryExpression('in', rawStringLiteral(node.name), dataNode),
			dataNode,
			globalIdentifier,
		),
		b.identifier(node.name),
	);
};

// Narrows a block-scoped declaration below the enclosing function ast-types scopes it to. Loop
// types count: a loop-head declaration is visible in both the head and the body. StaticBlock and
// ForAwaitStatement are omitted — esprima-next never emits either.
const REGION_TYPES: ReadonlySet<string> = new Set<namedTypes.ASTNode['type']>([
	'BlockStatement',
	'SwitchStatement',
	'Program',
	'ForStatement',
	'ForInStatement',
	'ForOfStatement',
]);

// Node bounding the binding's visibility, or 'scope' for the whole scope. `undefined` is an
// unmodelled form, treated as not visible so the identifier gets rewritten.
type BindingRegion = namedTypes.Node | 'scope' | undefined;

const WHOLE_SCOPE: BindingRegion = 'scope';

const lexicalRegionOf = (declaration: NodePath): BindingRegion => {
	for (let ancestor: NodePath | null = declaration.parent; ancestor; ancestor = ancestor.parent) {
		const node: namedTypes.Node = ancestor.node;
		if (REGION_TYPES.has(node.type)) {
			return node;
		}
	}
	return undefined;
};

const bindingRegionOf = (binding: NodePath): BindingRegion => {
	for (let ancestor: NodePath | null = binding.parent; ancestor; ancestor = ancestor.parent) {
		const node: namedTypes.Node = ancestor.node;
		if (n.VariableDeclaration.check(node)) {
			return node.kind === 'var' ? WHOLE_SCOPE : lexicalRegionOf(ancestor);
		}
		if (n.ClassDeclaration.check(node)) {
			return lexicalRegionOf(ancestor);
		}
		if (n.FunctionDeclaration.check(node)) {
			// Params stay scoped to the function itself.
			if (node.id !== binding.node) {
				return WHOLE_SCOPE;
			}
			// Sloppy mode can also hoist a block-scoped function decl into the enclosing var scope
			// (Annex B), but only conditionally, so this ignores that and narrows to the block —
			// same as strict mode. A braceless body (`if (x) function f() {}`) has no block to
			// narrow to, so it resolves to whichever region encloses the statement.
			return lexicalRegionOf(ancestor);
		}
		if (n.CatchClause.check(node) || n.Function.check(node)) {
			return WHOLE_SCOPE;
		}
	}
	return undefined;
};

const regionContains = (region: namedTypes.Node, path: NodePath) => {
	let child: NodePath = path;
	for (let ancestor: NodePath | null = path.parent; ancestor; ancestor = ancestor.parent) {
		if (ancestor.node === region) {
			// A switch discriminant runs before the case body's environment is entered; a case test doesn't.
			return !(n.SwitchStatement.check(region) && child.node === region.discriminant);
		}
		child = ancestor;
	}
	return false;
};

const isInScope = (path: NodePath<types.namedTypes.Identifier>) => {
	const { name } = path.node;
	let scope = path.scope as Scope;
	while (scope !== null) {
		// declares() is hasOwn — must gate the lookup below, since bindings is a plain object and
		// a name like `constructor` would otherwise read off Object.prototype.
		if (scope.declares(name)) {
			const declaringPaths: NodePath[] = scope.getBindings()[name] ?? [];
			for (const binding of declaringPaths) {
				const region = bindingRegionOf(binding);
				if (region === 'scope') {
					return true;
				}
				if (region !== undefined && regionContains(region, path)) {
					return true;
				}
			}
		}
		scope = scope.parent as Scope;
	}
	return false;
};

const polyfillExceptions = ['this', 'window', 'global'];

const polyfillVar = (
	path: NodePath<types.namedTypes.Identifier>,
	dataNode: DataNode,
	force: boolean = false,
) => {
	if (!force) {
		if (isInScope(path)) {
			// console.log('In scope', path.node.name);
			return;
		}
	}
	// For tmpl compat we ignore these identifiers
	if (polyfillExceptions.includes(path.node.name)) {
		return;
	}
	path.replace(buildGlobalSwitch(path.node, dataNode));
};

export type DataNode = namedTypes.ThisExpression | namedTypes.Identifier;

type CustomPatcher = (
	path: NodePath<types.namedTypes.Identifier>,
	parent: any,
	dataNode: DataNode,
) => void;

const customPatches: Partial<Record<ParentKind['type'], CustomPatcher>> = {
	MemberExpression(path, parent: namedTypes.MemberExpression, dataNode) {
		if (parent.object === path.node || parent.computed) {
			polyfillVar(path, dataNode);
		}
	},
	OptionalMemberExpression(path, parent: namedTypes.OptionalMemberExpression, dataNode) {
		if (parent.object === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	Property(path, parent: namedTypes.Property, dataNode) {
		if (parent.computed && parent.key === path.node) {
			polyfillVar(path, dataNode);
			return;
		}
		if (path.node !== parent.value) {
			return;
		}
		const objPattern = path.parent?.parent?.node as namedTypes.ObjectPattern;
		if (!objPattern) {
			return;
		}
		const objParent: VariableDeclaratorKind = path.parent.parent.parent?.node;
		if (!objParent) {
			return;
		}
		if (objParent.type === 'VariableDeclarator' && objParent.id === objPattern) {
			return;
		}

		parent.shorthand = false;
		polyfillVar(path, dataNode);
	},
	AssignmentPattern(path, parent: namedTypes.AssignmentPattern, dataNode) {
		if (parent.right === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	VariableDeclarator(path, parent: namedTypes.VariableDeclarator, dataNode) {
		if (parent.init === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	ArrowFunctionExpression(path, parent: namedTypes.ArrowFunctionExpression, dataNode) {
		// A concise arrow body that is a bare identifier (`() => process`) must be
		// routed through the data context like any other free read. Params are not
		// the body, and body identifiers that reference a param are left alone by
		// polyfillVar's in-scope check.
		if (parent.body === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	SpreadElement(path, parent: namedTypes.SpreadElement, dataNode) {
		if (parent.argument === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	SpreadProperty(path, parent: namedTypes.SpreadProperty, dataNode) {
		if (parent.argument === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	MethodDefinition(path, parent: namedTypes.MethodDefinition, dataNode) {
		if (parent.computed && parent.key === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	SwitchCase(path, parent: namedTypes.SwitchCase, dataNode) {
		if (parent.test === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	ClassDeclaration(path, parent: namedTypes.ClassDeclaration, dataNode) {
		if (parent.superClass === path.node) {
			polyfillVar(path, dataNode);
		}
	},
	ClassExpression(path, parent: namedTypes.ClassExpression, dataNode) {
		if (parent.superClass === path.node) {
			polyfillVar(path, dataNode);
		}
	},
};

export const jsVariablePolyfill = (
	ast: types.namedTypes.File,
	dataNode: DataNode,
): StatementKind[] | undefined => {
	visit(ast, {
		visitImportExpression(_path) {
			throw new Error('Imports are not supported');
		},
		visitIdentifier(path) {
			this.traverse(path);
			const parent: ParentKind = path.parent.node;

			// This is for tmpl compat
			if (EXEMPT_IDENTIFIER_LIST.includes(path.node.name)) {
				return;
			}

			switch (parent.type) {
				case 'AssignmentPattern':
				case 'Property':
				case 'MemberExpression':
				case 'OptionalMemberExpression':
				case 'VariableDeclarator':
				case 'ArrowFunctionExpression':
				case 'SpreadElement':
				case 'SpreadProperty':
				case 'MethodDefinition':
				case 'SwitchCase':
				case 'ClassDeclaration':
				case 'ClassExpression':
					if (!customPatches[parent.type]) {
						throw new Error(`Couldn't find custom patcher for parent type: ${parent.type}`);
					}
					customPatches[parent.type]?.(path, parent, dataNode);
					break;
				case 'BinaryExpression':
				case 'UnaryExpression':
				case 'ArrayExpression':
				case 'AssignmentExpression':
				case 'SequenceExpression':
				case 'YieldExpression':
				case 'UpdateExpression':
				case 'LogicalExpression':
				case 'ConditionalExpression':
				case 'NewExpression':
				case 'CallExpression':
				case 'OptionalCallExpression':
				case 'TaggedTemplateExpression':
				case 'TemplateLiteral':
				case 'AwaitExpression':
				case 'ImportExpression':
				case 'ForStatement':
				case 'IfStatement':
				case 'WhileStatement':
				case 'ForInStatement':
				case 'ForOfStatement':
				case 'SwitchStatement':
				case 'ReturnStatement':
				case 'DoWhileStatement':
				case 'ExpressionStatement':
				case 'ForAwaitStatement':
				case 'ThrowStatement':
				case 'WithStatement':
				case 'TupleExpression':
					polyfillVar(path, dataNode);
					break;

				// Do nothing
				case 'Super':
				case 'Identifier':
				case 'FunctionDeclaration':
				case 'FunctionExpression':
				case 'ThisExpression':
				case 'ObjectExpression':
				case 'MetaProperty':
				case 'ChainExpression':
				case 'PrivateName':
				case 'ParenthesizedExpression':
				case 'Import':
				case 'VariableDeclaration':
				case 'CatchClause':
				case 'BlockStatement':
				case 'TryStatement':
				case 'EmptyStatement':
				case 'LabeledStatement':
				case 'BreakStatement':
				case 'ContinueStatement':
				case 'DebuggerStatement':
				case 'ImportDeclaration':
				case 'ExportDeclaration':
				case 'ExportAllDeclaration':
				case 'ExportDefaultDeclaration':
				case 'Noop':
				case 'ClassMethod':
				case 'ClassPrivateMethod':
				case 'RestElement':
				case 'ArrayPattern':
				case 'ObjectPattern':
				case 'RecordExpression':
				case 'V8IntrinsicIdentifier':
				case 'TopicReference':
				case 'ClassProperty':
				case 'StaticBlock':
				case 'ClassBody':
				case 'ExportNamedDeclaration':
				case 'ClassPrivateProperty':
				case 'ClassAccessorProperty':
				case 'PropertyPattern':
					break;

				// I can't seem to figure out what causes these
				case 'SpreadElementPattern':
				case 'SpreadPropertyPattern':
				case 'ClassPropertyDefinition':
					break;

				// Flow types
				case 'DeclareClass':
				case 'DeclareModule':
				case 'DeclareVariable':
				case 'DeclareFunction':
				case 'DeclareInterface':
				case 'DeclareTypeAlias':
				case 'DeclareOpaqueType':
				case 'DeclareModuleExports':
				case 'DeclareExportDeclaration':
				case 'DeclareExportAllDeclaration':
				case 'InterfaceDeclaration':
				case 'TypeAlias':
				case 'OpaqueType':
				case 'EnumDeclaration':
				case 'TypeCastExpression':
					break;

				// Typescript types
				case 'TSAsExpression':
				case 'TSTypeParameter':
				case 'TSTypeAssertion':
				case 'TSDeclareMethod':
				case 'TSIndexSignature':
				case 'TSDeclareFunction':
				case 'TSMethodSignature':
				case 'TSEnumDeclaration':
				case 'TSExportAssignment':
				case 'TSNonNullExpression':
				case 'TSPropertySignature':
				case 'TSModuleDeclaration':
				case 'TSParameterProperty':
				case 'TSTypeCastExpression':
				case 'TSSatisfiesExpression':
				case 'TSTypeAliasDeclaration':
				case 'TSInterfaceDeclaration':
				case 'TSImportEqualsDeclaration':
				case 'TSExternalModuleReference':
				case 'TSInstantiationExpression':
				case 'TSTypeParameterDeclaration':
				case 'TSCallSignatureDeclaration':
				case 'TSNamespaceExportDeclaration':
				case 'TSConstructSignatureDeclaration':
					break;

				// Literals that can't contain an identifier
				case 'DirectiveLiteral':
				case 'StringLiteral':
				case 'NumericLiteral':
				case 'BigIntLiteral':
				case 'NullLiteral':
				case 'Literal':
				case 'RegExpLiteral':
				case 'BooleanLiteral':
				case 'DecimalLiteral':
					break;

				// Proposals that are stage 0 or 1
				case 'DoExpression':
				case 'BindExpression':
					break;

				// JSX stuff. We don't support this so just do nothing.
				case 'JSXIdentifier':
				case 'JSXText':
				case 'JSXElement':
				case 'JSXFragment':
				case 'JSXMemberExpression':
				case 'JSXExpressionContainer':
					break;

				// I _think_ these are obsolete features proposed as part of ECMAScript 7.
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Deprecated_and_obsolete_features#legacy_generator_and_iterator
				case 'ComprehensionExpression':
				case 'GeneratorExpression':
					polyfillVar(path, dataNode);
					break;

				default:
					// This is a simple type guard that guarantees we haven't missed
					// a case. It'll result in a type error at compile time.
					assertNever(parent);
					polyfillVar(path, dataNode);
					break;
			}
		},
	});

	return ast.program.body;
};
