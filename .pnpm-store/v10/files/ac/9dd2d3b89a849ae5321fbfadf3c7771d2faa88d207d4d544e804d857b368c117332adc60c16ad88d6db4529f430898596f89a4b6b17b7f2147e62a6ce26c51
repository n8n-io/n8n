import path from 'node:path';
import {isRegExp} from 'node:util/types';
import {defaultsDeep, upperFirst, lowerFirst} from './utils/lodash.js';
import {
	getAvailableVariableName,
	cartesianProductSamples,
	isShorthandPropertyValue,
	isShorthandImportLocal,
	getVariableIdentifiers,
	getScopes,
} from './utils/index.js';
import {defaultReplacements, defaultAllowList, defaultIgnore} from './shared/abbreviations.js';
import {renameVariable} from './fix/index.js';
import {isStaticRequire} from './ast/index.js';

const MESSAGE_ID_REPLACE = 'replace';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const anotherNameMessage = 'A more descriptive name will do too.';
const messages = {
	[MESSAGE_ID_REPLACE]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${anotherNameMessage}`,
	[MESSAGE_ID_SUGGESTION]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${anotherNameMessage}`,
};

const isUpperCase = string => string === string.toUpperCase();
const isUpperFirst = string => isUpperCase(string[0]);

const prepareOptions = ({
	checkProperties = false,
	checkVariables = true,

	checkDefaultAndNamespaceImports = 'internal',
	checkShorthandImports = 'internal',
	checkShorthandProperties = false,

	checkFilenames = true,

	extendDefaultReplacements = true,
	replacements = {},

	extendDefaultAllowList = true,
	allowList = {},

	ignore = [],
} = {}) => {
	const mergedReplacements = extendDefaultReplacements
		? defaultsDeep({}, replacements, defaultReplacements)
		: replacements;

	const mergedAllowList = extendDefaultAllowList
		? defaultsDeep({}, allowList, defaultAllowList)
		: allowList;

	ignore = [...defaultIgnore, ...ignore];

	ignore = ignore.map(
		pattern => isRegExp(pattern) ? pattern : new RegExp(pattern, 'u'),
	);

	return {
		checkProperties,
		checkVariables,

		checkDefaultAndNamespaceImports,
		checkShorthandImports,
		checkShorthandProperties,

		checkFilenames,

		replacements: new Map(
			Object.entries(mergedReplacements).map(
				([discouragedName, replacements]) =>
					[discouragedName, new Map(Object.entries(replacements))],
			),
		),
		allowList: new Map(Object.entries(mergedAllowList)),

		ignore,
	};
};

const getWordReplacements = (word, {replacements, allowList}) => {
	// Skip constants and allowList
	if (isUpperCase(word) || allowList.get(word)) {
		return [];
	}

	const replacement = replacements.get(lowerFirst(word))
		|| replacements.get(word)
		|| replacements.get(upperFirst(word));

	let wordReplacement = [];
	if (replacement) {
		const transform = isUpperFirst(word) ? upperFirst : lowerFirst;
		wordReplacement = [...replacement.keys()]
			.filter(name => replacement.get(name))
			.map(name => transform(name));
	}

	return wordReplacement.length > 0 ? wordReplacement.sort() : [];
};

const getNameReplacements = (name, options, limit = 3) => {
	const {allowList, ignore} = options;

	// Skip constants and allowList
	if (isUpperCase(name) || allowList.get(name) || ignore.some(regexp => regexp.test(name))) {
		return {total: 0};
	}

	// Find exact replacements
	const exactReplacements = getWordReplacements(name, options);

	if (exactReplacements.length > 0) {
		return {
			total: exactReplacements.length,
			samples: exactReplacements.slice(0, limit),
		};
	}

	// Split words
	const words = name.split(/(?=\P{Lowercase_Letter})|(?<=\P{Letter})/u).filter(Boolean);

	let hasReplacements = false;
	const combinations = words.map(word => {
		const wordReplacements = getWordReplacements(word, options);

		if (wordReplacements.length > 0) {
			hasReplacements = true;
			return wordReplacements;
		}

		return [word];
	});

	// No replacements for any word
	if (!hasReplacements) {
		return {total: 0};
	}

	const {
		total,
		samples,
	} = cartesianProductSamples(combinations, limit);

	// `retVal` -> `['returnValue', 'Value']` -> `['returnValue']`
	for (const parts of samples) {
		for (let index = parts.length - 1; index > 0; index--) {
			const word = parts[index];
			if (/^[A-Za-z]+$/.test(word) && parts[index - 1].endsWith(parts[index])) {
				parts.splice(index, 1);
			}
		}
	}

	return {
		total,
		samples: samples.map(words => words.join('')),
	};
};

const getMessage = (discouragedName, replacements, nameTypeText) => {
	const {total, samples = []} = replacements;

	if (total === 1) {
		return {
			messageId: MESSAGE_ID_REPLACE,
			data: {
				nameTypeText,
				discouragedName,
				replacement: samples[0],
			},
		};
	}

	let replacementsText = samples
		.map(replacement => `\`${replacement}\``)
		.join(', ');

	const omittedReplacementsCount = total - samples.length;
	if (omittedReplacementsCount > 0) {
		replacementsText += `, ... (${omittedReplacementsCount > 99 ? '99+' : omittedReplacementsCount} more omitted)`;
	}

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {
			nameTypeText,
			discouragedName,
			replacementsText,
		},
	};
};

const isExportedIdentifier = identifier => {
	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
	) {
		return (
			identifier.parent.parent.type === 'VariableDeclaration'
			&& identifier.parent.parent.parent.type === 'ExportNamedDeclaration'
		);
	}

	if (
		identifier.parent.type === 'FunctionDeclaration'
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (
		identifier.parent.type === 'ClassDeclaration'
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (
		identifier.parent.type === 'TSTypeAliasDeclaration'
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

const shouldFix = variable => getVariableIdentifiers(variable)
	.every(identifier =>
		!isExportedIdentifier(identifier)
		// In typescript parser, only `JSXOpeningElement` is added to variable
		// `<foo></foo>` -> `<bar></foo>` will cause parse error
		&& identifier.type !== 'JSXIdentifier',
	);

const isDefaultOrNamespaceImportName = identifier => {
	if (
		identifier.parent.type === 'ImportDefaultSpecifier'
		&& identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportNamespaceSpecifier'
		&& identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportSpecifier'
		&& identifier.parent.local === identifier
		&& identifier.parent.imported.type === 'Identifier'
		&& identifier.parent.imported.name === 'default'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
		&& isStaticRequire(identifier.parent.init)
	) {
		return true;
	}

	return false;
};

const isClassVariable = variable => {
	if (variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	return definition.type === 'ClassName';
};

const shouldReportIdentifierAsProperty = identifier => {
	if (
		identifier.parent.type === 'MemberExpression'
		&& identifier.parent.property === identifier
		&& !identifier.parent.computed
		&& identifier.parent.parent.type === 'AssignmentExpression'
		&& identifier.parent.parent.left === identifier.parent
	) {
		return true;
	}

	if (
		identifier.parent.type === 'Property'
		&& identifier.parent.key === identifier
		&& !identifier.parent.computed
		&& !identifier.parent.shorthand // Shorthand properties are reported and fixed as variables
		&& identifier.parent.parent.type === 'ObjectExpression'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ExportSpecifier'
		&& identifier.parent.exported === identifier
		&& identifier.parent.local !== identifier // Same as shorthand properties above
	) {
		return true;
	}

	if (
		(
			identifier.parent.type === 'MethodDefinition'
			|| identifier.parent.type === 'PropertyDefinition'
		)
		&& identifier.parent.key === identifier
		&& !identifier.parent.computed
	) {
		return true;
	}

	return false;
};

const isInternalImport = node => {
	let source = '';

	if (node.type === 'Variable') {
		source = node.node.init.arguments[0].value;
	} else if (node.type === 'ImportBinding') {
		source = node.parent.source.value;
	}

	return (
		!source.includes('node_modules')
		&& (source.startsWith('.') || source.startsWith('/'))
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = prepareOptions(context.options[0]);
	const filenameWithExtension = context.physicalFilename;

	// A `class` declaration produces two variables in two scopes:
	// the inner class scope, and the outer one (wherever the class is declared).
	// This map holds the outer ones to be later processed when the inner one is encountered.
	// For why this is not a eslint issue see https://github.com/eslint/eslint-scope/issues/48#issuecomment-464358754
	const identifierToOuterClassVariable = new WeakMap();

	const checkPossiblyWeirdClassVariable = variable => {
		if (isClassVariable(variable)) {
			if (variable.scope.type === 'class') { // The inner class variable
				const [definition] = variable.defs;
				const outerClassVariable = identifierToOuterClassVariable.get(definition.name);

				if (!outerClassVariable) {
					return checkVariable(variable);
				}

				// Create a normal-looking variable (like a `var` or a `function`)
				// For which a single `variable` holds all references, unlike with a `class`
				const combinedReferencesVariable = {
					name: variable.name,
					scope: variable.scope,
					defs: variable.defs,
					identifiers: variable.identifiers,
					references: [...variable.references, ...outerClassVariable.references],
				};

				// Call the common checker with the newly forged normalized class variable
				return checkVariable(combinedReferencesVariable);
			}

			// The outer class variable, we save it for later, when it's inner counterpart is encountered
			const [definition] = variable.defs;
			identifierToOuterClassVariable.set(definition.name, variable);

			return;
		}

		return checkVariable(variable);
	};

	// Holds a map from a `Scope` to a `Set` of new variable names generated by our fixer.
	// Used to avoid generating duplicate names, see for instance `let errCb, errorCb` test.
	const scopeToNamesGeneratedByFixer = new WeakMap();
	const isSafeName = (name, scopes) => scopes.every(scope => {
		const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
		return !generatedNames || !generatedNames.has(name);
	});

	const checkVariable = variable => {
		if (variable.defs.length === 0) {
			return;
		}

		const [definition] = variable.defs;

		if (isDefaultOrNamespaceImportName(definition.name)) {
			if (!options.checkDefaultAndNamespaceImports) {
				return;
			}

			if (
				options.checkDefaultAndNamespaceImports === 'internal'
				&& !isInternalImport(definition)
			) {
				return;
			}
		}

		if (isShorthandImportLocal(definition.name)) {
			if (!options.checkShorthandImports) {
				return;
			}

			if (
				options.checkShorthandImports === 'internal'
				&& !isInternalImport(definition)
			) {
				return;
			}
		}

		if (
			!options.checkShorthandProperties
			&& isShorthandPropertyValue(definition.name)
		) {
			return;
		}

		const variableReplacements = getNameReplacements(variable.name, options);

		if (variableReplacements.total === 0) {
			return;
		}

		const scopes = [
			...variable.references.map(reference => reference.from),
			variable.scope,
		];
		variableReplacements.samples = variableReplacements.samples.map(
			name => getAvailableVariableName(name, scopes, isSafeName),
		);

		const problem = {
			...getMessage(definition.name.name, variableReplacements, 'variable'),
			node: definition.name,
		};

		if (
			variableReplacements.total === 1
			&& shouldFix(variable)
			&& variableReplacements.samples[0]
			&& !variable.references.some(reference => reference.vueUsedInTemplate)
		) {
			const [replacement] = variableReplacements.samples;

			for (const scope of scopes) {
				if (!scopeToNamesGeneratedByFixer.has(scope)) {
					scopeToNamesGeneratedByFixer.set(scope, new Set());
				}

				const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
				generatedNames.add(replacement);
			}

			problem.fix = fixer => renameVariable(variable, replacement, fixer);
		}

		context.report(problem);
	};

	const checkVariables = scope => {
		for (const variable of scope.variables) {
			checkPossiblyWeirdClassVariable(variable);
		}
	};

	const checkScope = scope => {
		const scopes = getScopes(scope);
		for (const scope of scopes) {
			checkVariables(scope);
		}
	};

	return {
		Identifier(node) {
			if (!options.checkProperties) {
				return;
			}

			if (node.name === '__proto__') {
				return;
			}

			const identifierReplacements = getNameReplacements(node.name, options);

			if (identifierReplacements.total === 0) {
				return;
			}

			if (!shouldReportIdentifierAsProperty(node)) {
				return;
			}

			const problem = {
				...getMessage(node.name, identifierReplacements, 'property'),
				node,
			};

			context.report(problem);
		},

		Program(node) {
			if (!options.checkFilenames) {
				return;
			}

			if (
				filenameWithExtension === '<input>'
				|| filenameWithExtension === '<text>'
			) {
				return;
			}

			const filename = path.basename(filenameWithExtension);
			const extension = path.extname(filename);
			const filenameReplacements = getNameReplacements(path.basename(filename, extension), options);

			if (filenameReplacements.total === 0) {
				return;
			}

			filenameReplacements.samples = filenameReplacements.samples.map(replacement => `${replacement}${extension}`);

			context.report({
				...getMessage(filename, filenameReplacements, 'filename'),
				node,
			});
		},

		'Program:exit'(program) {
			if (!options.checkVariables) {
				return;
			}

			checkScope(context.sourceCode.getScope(program));
		},
	};
};

const schema = {
	type: 'array',
	additionalItems: false,
	items: [
		{
			type: 'object',
			additionalProperties: false,
			properties: {
				checkProperties: {
					type: 'boolean',
				},
				checkVariables: {
					type: 'boolean',
				},
				checkDefaultAndNamespaceImports: {
					type: [
						'boolean',
						'string',
					],
					pattern: 'internal',
				},
				checkShorthandImports: {
					type: [
						'boolean',
						'string',
					],
					pattern: 'internal',
				},
				checkShorthandProperties: {
					type: 'boolean',
				},
				checkFilenames: {
					type: 'boolean',
				},
				extendDefaultReplacements: {
					type: 'boolean',
				},
				replacements: {
					$ref: '#/definitions/abbreviations',
				},
				extendDefaultAllowList: {
					type: 'boolean',
				},
				allowList: {
					$ref: '#/definitions/booleanObject',
				},
				ignore: {
					type: 'array',
					uniqueItems: true,
				},
			},
		},
	],
	definitions: {
		abbreviations: {
			type: 'object',
			additionalProperties: {
				$ref: '#/definitions/replacements',
			},
		},
		replacements: {
			anyOf: [
				{
					enum: [
						false,
					],
				},
				{
					$ref: '#/definitions/booleanObject',
				},
			],
		},
		booleanObject: {
			type: 'object',
			additionalProperties: {
				type: 'boolean',
			},
		},
	},
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prevent abbreviations.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
