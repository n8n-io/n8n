import {findVariable} from '@eslint-community/eslint-utils';
import {
	isMemberExpression,
	isCallExpression,
	isNewExpression,
	isMethodCall,
} from './ast/index.js';

const ERROR_DIRNAME = 'error/calculate-dirname';
const ERROR_FILENAME = 'error/calculate-filename';
const messages = {
	[ERROR_DIRNAME]: 'Do not construct dirname.',
	[ERROR_FILENAME]: 'Do not construct filename using `fileURLToPath()`.',
};

const isParentLiteral = node => {
	if (node?.type !== 'Literal') {
		return false;
	}

	return node.value === '.' || node.value === './';
};

const isImportMeta = node =>
	node.type === 'MetaProperty'
	&& node.meta.name === 'import'
	&& node.property.name === 'meta';

function isNodeBuiltinModuleFunctionCall(node, {modules, functionName, sourceCode}) {
	if (!isCallExpression(node, {optional: false, argumentsLength: 1})) {
		return false;
	}

	const visited = new Set();

	return checkExpression(node.callee, 'property');

	/** @param {import('estree').Expression} node */
	function checkExpression(node, checkKind) {
		if (node.type === 'MemberExpression') {
			if (!(
				checkKind === 'property'
				&& isMemberExpression(node, {property: functionName, computed: false, optional: false})
			)) {
				return false;
			}

			return checkExpression(node.object, 'module');
		}

		if (node.type === 'CallExpression') {
			if (checkKind !== 'module') {
				return false;
			}

			// `process.getBuiltinModule('x')`
			return (
				isMethodCall(node, {
					object: 'process',
					method: 'getBuiltinModule',
					argumentsLength: 1,
					optionalMember: false,
					optionalCall: false,
				})
				&& isModuleLiteral(node.arguments[0])
			);
		}

		if (node.type !== 'Identifier') {
			return false;
		}

		if (visited.has(node)) {
			return false;
		}

		visited.add(node);

		const variable = findVariable(sourceCode.getScope(node), node);
		if (!variable || variable.defs.length !== 1) {
			return;
		}

		return checkDefinition(variable.defs[0], checkKind);
	}

	/** @param {import('eslint').Scope.Definition} define */
	function checkDefinition(define, checkKind) {
		if (define.type === 'ImportBinding') {
			if (!isModuleLiteral(define.parent.source)) {
				return false;
			}

			const specifier = define.node;
			return checkKind === 'module'
				? (specifier?.type === 'ImportDefaultSpecifier' || specifier?.type === 'ImportNamespaceSpecifier')
				: (specifier?.type === 'ImportSpecifier' && specifier.imported.name === functionName);
		}

		return define.type === 'Variable' && checkPattern(define.name, checkKind);
	}

	/** @param {import('estree').Identifier | import('estree').ObjectPattern} node */
	function checkPattern(node, checkKind) {
		/** @type {{parent?: import('estree').Node}} */
		const {parent} = node;
		if (parent.type === 'VariableDeclarator') {
			if (
				!parent.init
				|| parent.id !== node
				|| parent.parent.type !== 'VariableDeclaration'
				|| parent.parent.kind !== 'const'
			) {
				return false;
			}

			return checkExpression(parent.init, checkKind);
		}

		if (parent.type === 'Property') {
			if (!(
				checkKind === 'property'
				&& parent.value === node
				&& !parent.computed
				&& parent.key.type === 'Identifier'
				&& parent.key.name === functionName
			)) {
				return false;
			}

			// Check for ObjectPattern
			return checkPattern(parent.parent, 'module');
		}

		return false;
	}

	function isModuleLiteral(node) {
		return node?.type === 'Literal' && modules.has(node.value);
	}
}

/**
@returns {node is import('estree').SimpleCallExpression}
*/
function isUrlFileURLToPathCall(node, sourceCode) {
	return isNodeBuiltinModuleFunctionCall(node, {
		modules: new Set(['url', 'node:url']),
		functionName: 'fileURLToPath',
		sourceCode,
	});
}

/**
@returns {node is import('estree').SimpleCallExpression}
*/
function isPathDirnameCall(node, sourceCode) {
	return isNodeBuiltinModuleFunctionCall(node, {
		modules: new Set(['path', 'node:path']),
		functionName: 'dirname',
		sourceCode,
	});
}

function create(context) {
	const {sourceCode} = context;

	context.on('MetaProperty', function * (node) {
		if (!isImportMeta(node)) {
			return;
		}

		/** @type {import('estree').Node} */
		const memberExpression = node.parent;
		if (!isMemberExpression(memberExpression, {
			properties: ['url', 'filename'],
			computed: false,
			optional: false,
		})) {
			return;
		}

		const propertyName = memberExpression.property.name;
		if (propertyName === 'url') {
			// `url.fileURLToPath(import.meta.url)`
			if (
				isUrlFileURLToPathCall(memberExpression.parent, sourceCode)
				&& memberExpression.parent.arguments[0] === memberExpression
			) {
				yield * iterateProblemsFromFilename(memberExpression.parent, {
					reportFilenameNode: true,
				});
				return;
			}

			// `new URL(import.meta.url)`
			// `new URL('.', import.meta.url)`
			// `new URL('./', import.meta.url)`
			if (isNewExpression(memberExpression.parent, {name: 'URL', minimumArguments: 1, maximumArguments: 2})) {
				const newUrl = memberExpression.parent;
				const urlParent = newUrl.parent;

				// `new URL(import.meta.url)`
				if (
					newUrl.arguments.length === 1
					&& newUrl.arguments[0] === memberExpression
					// `url.fileURLToPath(new URL(import.meta.url))`
					&& isUrlFileURLToPathCall(urlParent, sourceCode)
					&& urlParent.arguments[0] === newUrl
				) {
					yield * iterateProblemsFromFilename(urlParent, {
						reportFilenameNode: true,
					});
					return;
				}

				// `url.fileURLToPath(new URL(".", import.meta.url))`
				// `url.fileURLToPath(new URL("./", import.meta.url))`
				if (
					newUrl.arguments.length === 2
					&& isParentLiteral(newUrl.arguments[0])
					&& newUrl.arguments[1] === memberExpression
					&& isUrlFileURLToPathCall(urlParent, sourceCode)
					&& urlParent.arguments[0] === newUrl
				) {
					yield getProblem(urlParent, 'dirname');
				}
			}

			return;
		}

		if (propertyName === 'filename') {
			yield * iterateProblemsFromFilename(memberExpression);
		}

		/**
		Iterates over reports where a given filename expression node
		would be used to convert it to a dirname.
		@param { import('estree').Expression} node
		*/
		function * iterateProblemsFromFilename(node, {reportFilenameNode = false} = {}) {
			/** @type {{parent: import('estree').Node}} */
			const {parent} = node;

			// `path.dirname(filename)`
			if (
				isPathDirnameCall(parent, sourceCode)
				&& parent.arguments[0] === node
			) {
				yield getProblem(parent, 'dirname');
				return;
			}

			if (reportFilenameNode) {
				yield getProblem(node, 'filename');
			}

			if (
				parent.type !== 'VariableDeclarator'
				|| parent.init !== node
				|| parent.id.type !== 'Identifier'
				|| parent.parent.type !== 'VariableDeclaration'
				|| parent.parent.kind !== 'const'
			) {
				return;
			}

			/** @type {import('eslint').Scope.Variable|null} */
			const variable = findVariable(sourceCode.getScope(parent.id), parent.id);
			if (!variable) {
				return;
			}

			for (const reference of variable.references) {
				if (!reference.isReadOnly()) {
					continue;
				}

				/** @type {{parent: import('estree').Node}} */
				const {parent} = reference.identifier;
				if (
					isPathDirnameCall(parent, sourceCode)
					&& parent.arguments[0] === reference.identifier
				) {
					// Report `path.dirname(identifier)`
					yield getProblem(parent, 'dirname');
				}
			}
		}

		/**
		@param { import('estree').Node} node
		@param {'dirname' | 'filename'} name
		*/
		function getProblem(node, name) {
			return {
				node,
				messageId: name === 'dirname' ? ERROR_DIRNAME : ERROR_FILENAME,
				fix: fixer => fixer.replaceText(node, `import.meta.${name}`),
			};
		}
	});
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `import.meta.{dirname,filename}` over legacy techniques for getting file paths.',
			recommended: false,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
