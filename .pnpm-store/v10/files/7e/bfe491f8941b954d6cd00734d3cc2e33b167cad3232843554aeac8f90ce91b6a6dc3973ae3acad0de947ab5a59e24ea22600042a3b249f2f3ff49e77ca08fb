import path from 'node:path';
import coreJsCompat from 'core-js-compat';
import {camelCase} from './utils/lodash.js';
import isStaticRequire from './ast/is-static-require.js';
import {readPackageJson} from './shared/package-json.js';

const {data: compatData, entries: coreJsEntries} = coreJsCompat;

const MESSAGE_ID_POLYFILL = 'unnecessaryPolyfill';
const MESSAGE_ID_CORE_JS = 'unnecessaryCoreJsModule';
const messages = {
	[MESSAGE_ID_POLYFILL]: 'Use built-in instead.',
	[MESSAGE_ID_CORE_JS]:
		'All polyfilled features imported from `{{coreJsModule}}` are available as built-ins. Use the built-ins instead.',
};

const additionalPolyfillPatterns = {
	'es.promise.finally': '|(p-finally)',
	'es.object.set-prototype-of': '|(setprototypeof)',
	'es.string.code-point-at': '|(code-point-at)',
};

const prefixes = '(mdn-polyfills/|polyfill-)';
const suffixes = '(-polyfill)';
const delimiter = String.raw`(\.|-|\.prototype\.|/)?`;

const polyfills = Object.keys(compatData).map(feature => {
	let [ecmaVersion, constructorName, methodName = ''] = feature.split('.');

	if (ecmaVersion === 'es') {
		ecmaVersion = String.raw`(es\d*)`;
	}

	constructorName = `(${constructorName}|${camelCase(constructorName)})`;
	methodName &&= `(${methodName}|${camelCase(methodName)})`;

	const methodOrConstructor = methodName || constructorName;

	const patterns = [
		`^((${prefixes}?(`,
		methodName && `(${ecmaVersion}${delimiter}${constructorName}${delimiter}${methodName})|`, // Ex: es6-array-copy-within
		methodName && `(${constructorName}${delimiter}${methodName})|`, // Ex: array-copy-within
		`(${ecmaVersion}${delimiter}${constructorName}))`, // Ex: es6-array
		`${suffixes}?)|`,
		`(${prefixes}${methodOrConstructor}|${methodOrConstructor}${suffixes})`, // Ex: polyfill-copy-within / polyfill-promise
		`${additionalPolyfillPatterns[feature] || ''})$`,
	];

	return {
		feature,
		pattern: new RegExp(patterns.join(''), 'i'),
	};
});

function getTargets(options, dirname) {
	if (options?.targets) {
		return options.targets;
	}

	const packageJsonResult = readPackageJson(dirname);

	if (!packageJsonResult) {
		return;
	}

	const {browserslist, engines} = packageJsonResult.packageJson;
	return browserslist ?? engines;
}

function create(context) {
	const targets = getTargets(context.options[0], path.dirname(context.filename));
	if (!targets) {
		return {};
	}

	let unavailableFeatures;
	try {
		unavailableFeatures = coreJsCompat({targets}).list;
	} catch {
		// This can happen if the targets are invalid or use unsupported syntax like `{node:'*'}`.
		return {};
	}

	const checkFeatures = features => !features.every(feature => unavailableFeatures.includes(feature));

	return {
		Literal(node) {
			if (
				!(
					(['ImportDeclaration', 'ImportExpression'].includes(node.parent.type) && node.parent.source === node)
					|| (isStaticRequire(node.parent) && node.parent.arguments[0] === node)
				)
			) {
				return;
			}

			const importedModule = node.value;
			if (typeof importedModule !== 'string' || ['.', '/'].includes(importedModule[0])) {
				return;
			}

			const coreJsModuleFeatures = coreJsEntries[importedModule.replace('core-js-pure', 'core-js')];

			if (coreJsModuleFeatures) {
				if (coreJsModuleFeatures.length > 1) {
					if (checkFeatures(coreJsModuleFeatures)) {
						return {
							node,
							messageId: MESSAGE_ID_CORE_JS,
							data: {
								coreJsModule: importedModule,
							},
						};
					}
				} else if (!unavailableFeatures.includes(coreJsModuleFeatures[0])) {
					return {node, messageId: MESSAGE_ID_POLYFILL};
				}

				return;
			}

			const polyfill = polyfills.find(({pattern}) => pattern.test(importedModule));
			if (polyfill) {
				const [, namespace, method = ''] = polyfill.feature.split('.');
				const features = coreJsEntries[`core-js/full/${namespace}${method && '/'}${method}`];

				if (features && checkFeatures(features)) {
					return {node, messageId: MESSAGE_ID_POLYFILL};
				}
			}
		},
	};
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		required: ['targets'],
		properties: {
			targets: {
				oneOf: [
					{
						type: 'string',
					},
					{
						type: 'array',
					},
					{
						type: 'object',
					},
				],
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
			description: 'Enforce the use of built-in methods instead of unnecessary polyfills.',
			recommended: true,
		},
		schema,
		// eslint-disable-next-line eslint-plugin/require-meta-default-options
		defaultOptions: [],
		messages,
	},
};

export default config;
