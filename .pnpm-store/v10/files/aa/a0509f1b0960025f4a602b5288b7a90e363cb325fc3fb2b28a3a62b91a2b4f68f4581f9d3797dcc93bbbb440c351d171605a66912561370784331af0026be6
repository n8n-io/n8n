import type { types } from 'recast';
import { visit } from 'recast';
import type { StatementKind, VariableDeclaratorKind } from 'ast-types/lib/gen/kinds';
import type { NodePath } from 'ast-types/lib/node-path';
import type { namedTypes } from 'ast-types';
import { builders as b } from 'ast-types';
import type { ParentKind } from './Constants';
import { EXEMPT_IDENTIFIER_LIST } from './Constants';

function assertNever(value: never): value is never {
	return true;
}

export const globalIdentifier = b.identifier(
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	typeof window !== 'object' ? 'global' : 'window',
);

const buildGlobalSwitch = (node: types.namedTypes.Identifier, dataNode: DataNode) => {
	return b.memberExpression(
		b.conditionalExpression(
			b.binaryExpression('in', b.literal(node.name), dataNode),
			dataNode,
			globalIdentifier,
		),
		b.identifier(node.name),
	);
};

const isInScope = (path: NodePath<types.namedTypes.Identifier>) => {
	let scope = path.scope;
	while (scope !== null) {
		if (scope.declares(path.node.name)) {
			return true;
		}
		scope = scope.parent;
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
		if (path.node !== parent.value) {
			return;
		}
		const objPattern: namedTypes.ObjectPattern = path.parent?.parent?.node;
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
					if (!customPatches[parent.type]) {
						throw new Error(`Couldn\'t find custom patcher for parent type: ${parent.type}`);
					}
					customPatches[parent.type]!(path, parent, dataNode);
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
				case 'ArrowFunctionExpression':
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
				case 'ClassExpression':
				case 'RecordExpression':
				case 'V8IntrinsicIdentifier':
				case 'TopicReference':
				case 'MethodDefinition':
				case 'ClassDeclaration':
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
					break;
			}
		},
	});

	return ast.program.body as StatementKind[];
};
