import path from 'node:path';
import {isRegExp} from 'node:util/types';
import {
	camelCase,
	kebabCase,
	snakeCase,
	upperFirst,
} from './utils/lodash.js';
import cartesianProductSamples from './utils/cartesian-product-samples.js';

const MESSAGE_ID = 'filename-case';
const MESSAGE_ID_EXTENSION = 'filename-extension';
const messages = {
	[MESSAGE_ID]: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.',
	[MESSAGE_ID_EXTENSION]: 'File extension `{{extension}}` is not in lowercase. Rename it to `{{filename}}`.',
};

const pascalCase = string => upperFirst(camelCase(string));
const numberRegex = /\d+/;
const PLACEHOLDER = '\uFFFF\uFFFF\uFFFF';
const PLACEHOLDER_REGEX = new RegExp(PLACEHOLDER, 'i');
const isIgnoredChar = char => !/^[a-z\d-_]$/i.test(char);
const ignoredByDefault = new Set(['index.js', 'index.mjs', 'index.cjs', 'index.ts', 'index.tsx', 'index.vue']);
const isLowerCase = string => string === string.toLowerCase();

function ignoreNumbers(caseFunction) {
	return string => {
		const stack = [];
		let execResult = numberRegex.exec(string);

		while (execResult) {
			stack.push(execResult[0]);
			string = string.replace(execResult[0], PLACEHOLDER);
			execResult = numberRegex.exec(string);
		}

		let withCase = caseFunction(string);

		while (stack.length > 0) {
			withCase = withCase.replace(PLACEHOLDER_REGEX, stack.shift());
		}

		return withCase;
	};
}

const cases = {
	camelCase: {
		fn: camelCase,
		name: 'camel case',
	},
	kebabCase: {
		fn: kebabCase,
		name: 'kebab case',
	},
	snakeCase: {
		fn: snakeCase,
		name: 'snake case',
	},
	pascalCase: {
		fn: pascalCase,
		name: 'pascal case',
	},
};

/**
Get the cases specified by the option.

@param {object} options
@returns {string[]} The chosen cases.
*/
function getChosenCases(options) {
	if (options.case) {
		return [options.case];
	}

	if (options.cases) {
		const cases = Object.keys(options.cases)
			.filter(cases => options.cases[cases]);

		return cases.length > 0 ? cases : ['kebabCase'];
	}

	return ['kebabCase'];
}

function validateFilename(words, caseFunctions) {
	return words
		.filter(({ignored}) => !ignored)
		.every(({word}) => caseFunctions.some(caseFunction => caseFunction(word) === word));
}

function fixFilename(words, caseFunctions, {leading, trailing}) {
	const replacements = words
		.map(({word, ignored}) => ignored ? [word] : caseFunctions.map(caseFunction => caseFunction(word)));

	const {
		samples: combinations,
	} = cartesianProductSamples(replacements);

	return [...new Set(combinations.map(parts => `${leading}${parts.join('')}${trailing}`))];
}

function getFilenameParts(filenameWithExtension, {multipleFileExtensions}) {
	const extension = path.extname(filenameWithExtension);
	const filename = path.basename(filenameWithExtension, extension);
	const basename = filename + extension;

	const parts = {
		basename,
		filename,
		middle: '',
		extension,
	};

	if (multipleFileExtensions) {
		const [firstPart] = filename.split('.');
		Object.assign(parts, {
			filename: firstPart,
			middle: filename.slice(firstPart.length),
		});
	}

	return parts;
}

const leadingUnderscoresRegex = /^(?<leading>_+)(?<tailing>.*)$/;
function splitFilename(filename) {
	const result = leadingUnderscoresRegex.exec(filename) || {groups: {}};
	const {leading = '', tailing = filename} = result.groups;

	const words = [];

	let lastWord;
	for (const char of tailing) {
		const isIgnored = isIgnoredChar(char);

		if (lastWord?.ignored === isIgnored) {
			lastWord.word += char;
		} else {
			lastWord = {
				word: char,
				ignored: isIgnored,
			};
			words.push(lastWord);
		}
	}

	return {
		leading,
		words,
	};
}

/**
Turns `[a, b, c]` into `a, b, or c`.

@param {string[]} words
@returns {string}
*/
const englishishJoinWords = words => new Intl.ListFormat('en-US', {type: 'disjunction'}).format(words);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0] || {};
	const chosenCases = getChosenCases(options);
	const ignore = (options.ignore || []).map(item => {
		if (isRegExp(item)) {
			return item;
		}

		return new RegExp(item, 'u');
	});
	const multipleFileExtensions = options.multipleFileExtensions !== false;
	const chosenCasesFunctions = chosenCases.map(case_ => ignoreNumbers(cases[case_].fn));
	const filenameWithExtension = context.physicalFilename;

	if (filenameWithExtension === '<input>' || filenameWithExtension === '<text>') {
		return;
	}

	return {
		Program() {
			const {
				basename,
				filename,
				middle,
				extension,
			} = getFilenameParts(filenameWithExtension, {multipleFileExtensions});

			if (ignoredByDefault.has(basename) || ignore.some(regexp => regexp.test(basename))) {
				return;
			}

			const {leading, words} = splitFilename(filename);
			const isValid = validateFilename(words, chosenCasesFunctions);

			if (isValid) {
				if (!isLowerCase(extension)) {
					return {
						loc: {column: 0, line: 1},
						messageId: MESSAGE_ID_EXTENSION,
						data: {filename: filename + middle + extension.toLowerCase(), extension},
					};
				}

				return;
			}

			const renamedFilenames = fixFilename(words, chosenCasesFunctions, {
				leading,
				trailing: middle + extension.toLowerCase(),
			});

			return {
				// Report on first character like `unicode-bom` rule
				// https://github.com/eslint/eslint/blob/8a77b661bc921c3408bae01b3aa41579edfc6e58/lib/rules/unicode-bom.js#L46
				loc: {column: 0, line: 1},
				messageId: MESSAGE_ID,
				data: {
					chosenCases: englishishJoinWords(chosenCases.map(x => cases[x].name)),
					renamedFilenames: englishishJoinWords(renamedFilenames.map(x => `\`${x}\``)),
				},
			};
		},
	};
};

const schema = [
	{
		oneOf: [
			{
				properties: {
					case: {
						enum: [
							'camelCase',
							'snakeCase',
							'kebabCase',
							'pascalCase',
						],
					},
					ignore: {
						type: 'array',
						uniqueItems: true,
					},
					multipleFileExtensions: {
						type: 'boolean',
					},
				},
				additionalProperties: false,
			},
			{
				properties: {
					cases: {
						properties: {
							camelCase: {
								type: 'boolean',
							},
							snakeCase: {
								type: 'boolean',
							},
							kebabCase: {
								type: 'boolean',
							},
							pascalCase: {
								type: 'boolean',
							},
						},
						additionalProperties: false,
					},
					ignore: {
						type: 'array',
						uniqueItems: true,
					},
					multipleFileExtensions: {
						type: 'boolean',
					},
				},
				additionalProperties: false,
			},
		],
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a case style for filenames.',
			recommended: true,
		},
		schema,
		// eslint-disable-next-line eslint-plugin/require-meta-default-options
		defaultOptions: [],
		messages,
	},
};

export default config;
