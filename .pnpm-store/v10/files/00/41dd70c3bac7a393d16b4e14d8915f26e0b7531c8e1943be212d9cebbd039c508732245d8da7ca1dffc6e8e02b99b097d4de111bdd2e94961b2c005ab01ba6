import {getFunctionHeadLocation, getFunctionNameWithKind} from '@eslint-community/eslint-utils';
import {getReferences, isNodeMatches} from './utils/index.js';
import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'consistent-function-scoping';
const messages = {
	[MESSAGE_ID]: 'Move {{functionNameWithKind}} to the outer scope.',
};

const isSameScope = (scope1, scope2) =>
	scope1 && scope2 && (scope1 === scope2 || scope1.block === scope2.block);

function checkReferences(scope, parent, scopeManager) {
	const hitReference = references => references.some(reference => {
		if (isSameScope(parent, reference.from)) {
			return true;
		}

		const {resolved} = reference;
		const [definition] = resolved.defs;

		// Skip recursive function name
		if (definition?.type === 'FunctionName' && resolved.name === definition.name.name) {
			return false;
		}

		return isSameScope(parent, resolved.scope);
	});

	const hitDefinitions = definitions => definitions.some(definition => {
		const scope = scopeManager.acquire(definition.node);
		return isSameScope(parent, scope);
	});

	// This check looks for neighboring function definitions
	const hitIdentifier = identifiers => identifiers.some(identifier => {
		// Only look at identifiers that live in a FunctionDeclaration
		if (
			!identifier.parent
			|| identifier.parent.type !== 'FunctionDeclaration'
		) {
			return false;
		}

		const identifierScope = scopeManager.acquire(identifier);

		// If we have a scope, the earlier checks should have worked so ignore them here
		/* c8 ignore next 3 */
		if (identifierScope) {
			return false;
		}

		const identifierParentScope = scopeManager.acquire(identifier.parent);
		/* c8 ignore next 3 */
		if (!identifierParentScope) {
			return false;
		}

		// Ignore identifiers from our own scope
		if (isSameScope(scope, identifierParentScope)) {
			return false;
		}

		// Look at the scope above the function definition to see if lives
		// next to the reference being checked
		return isSameScope(parent, identifierParentScope.upper);
	});

	return getReferences(scope)
		.map(({resolved}) => resolved)
		.filter(Boolean)
		.some(variable =>
			hitReference(variable.references)
			|| hitDefinitions(variable.defs)
			|| hitIdentifier(variable.identifiers),
		);
}

// https://reactjs.org/docs/hooks-reference.html
const reactHooks = [
	'useState',
	'useEffect',
	'useContext',
	'useReducer',
	'useCallback',
	'useMemo',
	'useRef',
	'useImperativeHandle',
	'useLayoutEffect',
	'useDebugValue',
].flatMap(hookName => [hookName, `React.${hookName}`]);

const isReactHook = scope =>
	scope.block?.parent?.callee
	&& isNodeMatches(scope.block.parent.callee, reactHooks);

const isArrowFunctionWithThis = scope =>
	scope.type === 'function'
	&& scope.block?.type === 'ArrowFunctionExpression'
	&& (scope.thisFound || scope.childScopes.some(scope => isArrowFunctionWithThis(scope)));

const iifeFunctionTypes = new Set([
	'FunctionExpression',
	'ArrowFunctionExpression',
]);
const isIife = node =>
	iifeFunctionTypes.has(node.type)
	&& node.parent.type === 'CallExpression'
	&& node.parent.callee === node;

function checkNode(node, scopeManager) {
	const scope = scopeManager.acquire(node);

	if (!scope || isArrowFunctionWithThis(scope)) {
		return true;
	}

	let parentNode = node.parent;

	// Skip over junk like the block statement inside of a function declaration
	// or the various pieces of an arrow function.

	if (parentNode.type === 'VariableDeclarator') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'VariableDeclaration') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'BlockStatement') {
		parentNode = parentNode.parent;
	}

	const parentScope = scopeManager.acquire(parentNode);
	if (
		!parentScope
		|| parentScope.type === 'global'
		|| isReactHook(parentScope)
		|| isIife(parentNode)
	) {
		return true;
	}

	return checkReferences(scope, parentScope, scopeManager);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkArrowFunctions} = {checkArrowFunctions: true, ...context.options[0]};
	const {sourceCode} = context;
	const {scopeManager} = sourceCode;

	const functions = [];

	context.on(functionTypes, () => {
		functions.push(false);
	});

	context.on('JSXElement', () => {
		// Turn off this rule if we see a JSX element because scope
		// references does not include JSXElement nodes.
		if (functions.length > 0) {
			functions[functions.length - 1] = true;
		}
	});

	context.onExit(functionTypes, node => {
		const currentFunctionHasJsx = functions.pop();
		if (currentFunctionHasJsx) {
			return;
		}

		if (node.type === 'ArrowFunctionExpression' && !checkArrowFunctions) {
			return;
		}

		if (checkNode(node, scopeManager)) {
			return;
		}

		return {
			node,
			loc: getFunctionHeadLocation(node, sourceCode),
			messageId: MESSAGE_ID,
			data: {
				functionNameWithKind: getFunctionNameWithKind(node, sourceCode),
			},
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkArrowFunctions: {
				type: 'boolean',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Move function definitions to the highest possible scope.',
			recommended: true,
		},
		schema,
		defaultOptions: [{checkArrowFunctions: true}],
		messages,
	},
};

export default config;
