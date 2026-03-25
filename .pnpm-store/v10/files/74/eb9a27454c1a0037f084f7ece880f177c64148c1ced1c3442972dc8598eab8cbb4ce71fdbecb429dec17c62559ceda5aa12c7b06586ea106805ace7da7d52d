import {getPropertyName, ReferenceTracker} from '@eslint-community/eslint-utils';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isMemberExpression, isMethodCall} from './ast/index.js';

const messages = {
	'known-method': 'Prefer using `{{constructorName}}.prototype.{{methodName}}`.',
	'unknown-method': 'Prefer using method from `{{constructorName}}.prototype`.',
};

const OBJECT_PROTOTYPE_METHODS = [
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'toLocaleString',
	'toString',
	'valueOf',
];

function getConstructorAndMethodName(methodNode, {sourceCode, globalReferences}) {
	if (!methodNode) {
		return;
	}

	const isGlobalReference = globalReferences.has(methodNode);
	if (isGlobalReference) {
		const path = globalReferences.get(methodNode);
		return {
			isGlobalReference: true,
			constructorName: 'Object',
			methodName: path.at(-1),
		};
	}

	if (!isMemberExpression(methodNode, {optional: false})) {
		return;
	}

	const objectNode = methodNode.object;

	if (!(
		(objectNode.type === 'ArrayExpression' && objectNode.elements.length === 0)
		|| (objectNode.type === 'ObjectExpression' && objectNode.properties.length === 0)
	)) {
		return;
	}

	const constructorName = objectNode.type === 'ArrayExpression' ? 'Array' : 'Object';
	const methodName = getPropertyName(methodNode, sourceCode.getScope(methodNode));

	return {
		constructorName,
		methodName,
	};
}

function getProblem(callExpression, {sourceCode, globalReferences}) {
	let methodNode;

	if (
		// `Reflect.apply([].foo, …)`
		// `Reflect.apply({}.foo, …)`
		isMethodCall(callExpression, {
			object: 'Reflect',
			method: 'apply',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
	) {
		methodNode = callExpression.arguments[0];
	} else if (
		// `[].foo.{apply,bind,call}(…)`
		// `({}).foo.{apply,bind,call}(…)`
		isMethodCall(callExpression, {
			methods: ['apply', 'bind', 'call'],
			optionalCall: false,
			optionalMember: false,
		})
	) {
		methodNode = callExpression.callee.object;
	}

	const {
		isGlobalReference,
		constructorName,
		methodName,
	} = getConstructorAndMethodName(methodNode, {sourceCode, globalReferences}) ?? {};

	if (!constructorName) {
		return;
	}

	return {
		node: methodNode,
		messageId: methodName ? 'known-method' : 'unknown-method',
		data: {constructorName, methodName},
		* fix(fixer) {
			if (isGlobalReference) {
				yield fixer.replaceText(methodNode, `${constructorName}.prototype.${methodName}`);
				return;
			}

			if (isMemberExpression(methodNode)) {
				const objectNode = methodNode.object;

				yield fixer.replaceText(objectNode, `${constructorName}.prototype`);

				if (
					objectNode.type === 'ArrayExpression'
					|| objectNode.type === 'ObjectExpression'
				) {
					yield * fixSpaceAroundKeyword(fixer, callExpression, sourceCode);
				}
			}
		},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {sourceCode} = context;
	const callExpressions = [];

	context.on('CallExpression', callExpression => {
		callExpressions.push(callExpression);
	});

	context.on('Program:exit', function * (program) {
		const globalReferences = new WeakMap();

		const tracker = new ReferenceTracker(sourceCode.getScope(program));

		for (const {node, path} of tracker.iterateGlobalReferences(
			Object.fromEntries(OBJECT_PROTOTYPE_METHODS.map(method => [method, {[ReferenceTracker.READ]: true}])),
		)) {
			globalReferences.set(node, path);
		}

		for (const callExpression of callExpressions) {
			yield getProblem(callExpression, {
				sourceCode,
				globalReferences,
			});
		}
	});
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer borrowing methods from the prototype instead of the instance.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
