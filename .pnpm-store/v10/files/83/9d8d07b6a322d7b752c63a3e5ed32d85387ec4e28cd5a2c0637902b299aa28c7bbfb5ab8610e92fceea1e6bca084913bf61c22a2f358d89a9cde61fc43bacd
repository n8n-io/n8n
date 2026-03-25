import path from 'node:path';
import {isRegExp} from 'node:util/types';
import semver from 'semver';
import * as ci from 'ci-info';
import getBuiltinRule from './utils/get-builtin-rule.js';
import {readPackageJson} from './shared/package-json.js';

const baseRule = getBuiltinRule('no-warning-comments');

// `unicorn/` prefix is added to avoid conflicts with core rule
const MESSAGE_ID_AVOID_MULTIPLE_DATES = 'unicorn/avoidMultipleDates';
const MESSAGE_ID_EXPIRED_TODO = 'unicorn/expiredTodo';
const MESSAGE_ID_AVOID_MULTIPLE_PACKAGE_VERSIONS
	= 'unicorn/avoidMultiplePackageVersions';
const MESSAGE_ID_REACHED_PACKAGE_VERSION = 'unicorn/reachedPackageVersion';
const MESSAGE_ID_HAVE_PACKAGE = 'unicorn/havePackage';
const MESSAGE_ID_DONT_HAVE_PACKAGE = 'unicorn/dontHavePackage';
const MESSAGE_ID_VERSION_MATCHES = 'unicorn/versionMatches';
const MESSAGE_ID_ENGINE_MATCHES = 'unicorn/engineMatches';
const MESSAGE_ID_REMOVE_WHITESPACE = 'unicorn/removeWhitespaces';
const MESSAGE_ID_MISSING_AT_SYMBOL = 'unicorn/missingAtSymbol';

// Override of core rule message with a more specific one - no prefix
const MESSAGE_ID_CORE_RULE_UNEXPECTED_COMMENT = 'unexpectedComment';
const messages = {
	[MESSAGE_ID_AVOID_MULTIPLE_DATES]:
		'Avoid using multiple expiration dates in TODO: {{expirationDates}}. {{message}}',
	[MESSAGE_ID_EXPIRED_TODO]:
		'There is a TODO that is past due date: {{expirationDate}}. {{message}}',
	[MESSAGE_ID_REACHED_PACKAGE_VERSION]:
		'There is a TODO that is past due package version: {{comparison}}. {{message}}',
	[MESSAGE_ID_AVOID_MULTIPLE_PACKAGE_VERSIONS]:
		'Avoid using multiple package versions in TODO: {{versions}}. {{message}}',
	[MESSAGE_ID_HAVE_PACKAGE]:
		'There is a TODO that is deprecated since you installed: {{package}}. {{message}}',
	[MESSAGE_ID_DONT_HAVE_PACKAGE]:
		'There is a TODO that is deprecated since you uninstalled: {{package}}. {{message}}',
	[MESSAGE_ID_VERSION_MATCHES]:
		'There is a TODO match for package version: {{comparison}}. {{message}}',
	[MESSAGE_ID_ENGINE_MATCHES]:
		'There is a TODO match for Node.js version: {{comparison}}. {{message}}',
	[MESSAGE_ID_REMOVE_WHITESPACE]:
		'Avoid using whitespace on TODO argument. On \'{{original}}\' use \'{{fix}}\'. {{message}}',
	[MESSAGE_ID_MISSING_AT_SYMBOL]:
		'Missing \'@\' on TODO argument. On \'{{original}}\' use \'{{fix}}\'. {{message}}',
	...baseRule.meta.messages,
	[MESSAGE_ID_CORE_RULE_UNEXPECTED_COMMENT]:
		'Unexpected \'{{matchedTerm}}\' comment without any conditions: \'{{comment}}\'.',
};

/** @param {string} dirname */
function getPackageHelpers(dirname) {
	const packageJsonResult = readPackageJson(dirname);
	const packageJson = packageJsonResult?.packageJson ?? {};
	const hasPackage = Boolean(packageJsonResult);

	const packageDependencies = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};

	function parseTodoWithArguments(string, {terms}) {
		const lowerCaseString = string.toLowerCase();
		const lowerCaseTerms = terms.map(term => term.toLowerCase());
		const hasTerm = lowerCaseTerms.some(term => lowerCaseString.includes(term));

		if (!hasTerm) {
			return false;
		}

		const TODO_ARGUMENT_RE = /\[(?<rawArguments>[^}]+)]/i;
		const result = TODO_ARGUMENT_RE.exec(string);

		if (!result) {
			return false;
		}

		const {rawArguments} = result.groups;

		const parsedArguments = rawArguments
			.split(',')
			.map(argument => parseArgument(argument.trim()));

		return createArgumentGroup(parsedArguments);
	}

	function parseArgument(argumentString, dirname) {
		const {hasPackage} = getPackageHelpers(dirname);
		if (ISO8601_DATE.test(argumentString)) {
			return {
				type: 'dates',
				value: argumentString,
			};
		}

		if (hasPackage && DEPENDENCY_INCLUSION_RE.test(argumentString)) {
			const condition = argumentString[0] === '+' ? 'in' : 'out';
			const name = argumentString.slice(1).trim();

			return {
				type: 'dependencies',
				value: {
					name,
					condition,
				},
			};
		}

		if (hasPackage && VERSION_COMPARISON_RE.test(argumentString)) {
			const {groups} = VERSION_COMPARISON_RE.exec(argumentString);
			const name = groups.name.trim();
			const condition = groups.condition.trim();
			const version = groups.version.trim();

			const hasEngineKeyword = name.indexOf('engine:') === 0;
			const isNodeEngine = hasEngineKeyword && name === 'engine:node';

			if (hasEngineKeyword && isNodeEngine) {
				return {
					type: 'engines',
					value: {
						condition,
						version,
					},
				};
			}

			if (!hasEngineKeyword) {
				return {
					type: 'dependencies',
					value: {
						name,
						condition,
						version,
					},
				};
			}
		}

		if (hasPackage && PKG_VERSION_RE.test(argumentString)) {
			const result = PKG_VERSION_RE.exec(argumentString);
			const {condition, version} = result.groups;

			return {
				type: 'packageVersions',
				value: {
					condition: condition.trim(),
					version: version.trim(),
				},
			};
		}

		// Currently being ignored as integration tests pointed
		// some TODO comments have `[random data like this]`
		return {
			type: 'unknowns',
			value: argumentString,
		};
	}

	function parseTodoMessage(todoString) {
		// @example "TODO [...]: message here"
		// @example "TODO [...] message here"
		const argumentsEnd = todoString.indexOf(']');

		const afterArguments = todoString.slice(argumentsEnd + 1).trim();

		// Check if have to skip colon
		// @example "TODO [...]: message here"
		const dropColon = afterArguments[0] === ':';
		if (dropColon) {
			return afterArguments.slice(1).trim();
		}

		return afterArguments;
	}

	return {
		packageResult: packageJsonResult,
		hasPackage,
		packageJson,
		packageDependencies,
		parseArgument,
		parseTodoMessage,
		parseTodoWithArguments,
	};
}

const DEPENDENCY_INCLUSION_RE = /^[+-]\s*@?\S+\/?\S+/;
const VERSION_COMPARISON_RE = /^(?<name>@?\S\/?\S+)@(?<condition>>|>=)(?<version>\d+(?:\.\d+){0,2}(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?)/i;
const PKG_VERSION_RE = /^(?<condition>>|>=)(?<version>\d+(?:\.\d+){0,2}(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?)\s*$/;
const ISO8601_DATE = /\d{4}-\d{2}-\d{2}/;

function createArgumentGroup(arguments_) {
	const groups = {};
	for (const {value, type} of arguments_) {
		groups[type] ??= [];
		groups[type].push(value);
	}

	return groups;
}

function reachedDate(past, now) {
	return Date.parse(past) < Date.parse(now);
}

function tryToCoerceVersion(rawVersion) {
	// `version` in `package.json` and comment can't be empty
	/* c8 ignore next 3 */
	if (!rawVersion) {
		return false;
	}

	let version = String(rawVersion);

	// Remove leading things like `^1.0.0`, `>1.0.0`
	const leadingNoises = [
		'>=',
		'<=',
		'>',
		'<',
		'~',
		'^',
	];
	const foundTrailingNoise = leadingNoises.find(noise => version.startsWith(noise));
	if (foundTrailingNoise) {
		version = version.slice(foundTrailingNoise.length);
	}

	// Get only the first member for cases such as `1.0.0 - 2.9999.9999`
	const parts = version.split(' ');
	// We don't have this `package.json` to test
	/* c8 ignore next 3 */
	if (parts.length > 1) {
		version = parts[0];
	}

	// We don't have this `package.json` to test
	/* c8 ignore next 3 */
	if (semver.valid(version)) {
		return version;
	}

	try {
		// Try to semver.parse a perfect match while semver.coerce tries to fix errors
		// But coerce can't parse pre-releases.
		return semver.parse(version) || semver.coerce(version);
	} catch {
		// We don't have this `package.json` to test
		/* c8 ignore next 3 */
		return false;
	}
}

function semverComparisonForOperator(operator) {
	return {
		'>': semver.gt,
		'>=': semver.gte,
	}[operator];
}

const DEFAULT_OPTIONS = {
	terms: ['todo', 'fixme', 'xxx'],
	ignore: [],
	ignoreDatesOnPullRequests: true,
	allowWarningComments: true,
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = {
		...DEFAULT_OPTIONS,
		date: new Date().toISOString().slice(0, 10),
		...context.options[0],
	};

	const ignoreRegexes = options.ignore.map(
		pattern => isRegExp(pattern) ? pattern : new RegExp(pattern, 'u'),
	);

	const dirname = path.dirname(context.filename);
	const {packageJson, packageDependencies, parseArgument, parseTodoMessage, parseTodoWithArguments} = getPackageHelpers(dirname);

	const {sourceCode} = context;
	const comments = sourceCode.getAllComments();
	const unusedComments = comments
		.filter(token => token.type !== 'Shebang')
		// Block comments come as one.
		// Split for situations like this:
		// /*
		//  * TODO [2999-01-01]: Validate this
		//  * TODO [2999-01-01]: And this
		//  * TODO [2999-01-01]: Also this
		//  */
		.flatMap(comment =>
			comment.value.split('\n').map(line => ({
				...comment,
				value: line,
			})),
		).filter(comment => processComment(comment));

	// This is highly dependable on ESLint's `no-warning-comments` implementation.
	// What we do is patch the parts we know the rule will use, `getAllComments`.
	// Since we have priority, we leave only the comments that we didn't use.
	const fakeContext = new Proxy(context, {
		get(target, property, receiver) {
			if (property === 'sourceCode') {
				return {
					...sourceCode,
					getAllComments: () => options.allowWarningComments ? [] : unusedComments,
				};
			}

			return Reflect.get(target, property, receiver);
		},
	});
	const rules = baseRule.create(fakeContext);

	function processComment(comment) {
		if (ignoreRegexes.some(ignore => ignore.test(comment.value))) {
			return;
		}

		const parsed = parseTodoWithArguments(comment.value, options);

		if (!parsed) {
			return true;
		}

		// Count if there are valid properties.
		// Otherwise, it's a useless TODO and falls back to `no-warning-comments`.
		let uses = 0;

		const {
			packageVersions = [],
			dates = [],
			dependencies = [],
			engines = [],
			unknowns = [],
		} = parsed;

		if (dates.length > 1) {
			uses++;
			context.report({
				loc: sourceCode.getLoc(comment),
				messageId: MESSAGE_ID_AVOID_MULTIPLE_DATES,
				data: {
					expirationDates: dates.join(', '),
					message: parseTodoMessage(comment.value),
				},
			});
		} else if (dates.length === 1) {
			uses++;
			const [expirationDate] = dates;

			const shouldIgnore = options.ignoreDatesOnPullRequests && ci.isPR;
			if (!shouldIgnore && reachedDate(expirationDate, options.date)) {
				context.report({
					loc: sourceCode.getLoc(comment),
					messageId: MESSAGE_ID_EXPIRED_TODO,
					data: {
						expirationDate,
						message: parseTodoMessage(comment.value),
					},
				});
			}
		}

		if (packageVersions.length > 1) {
			uses++;
			context.report({
				loc: sourceCode.getLoc(comment),
				messageId: MESSAGE_ID_AVOID_MULTIPLE_PACKAGE_VERSIONS,
				data: {
					versions: packageVersions
						.map(({condition, version}) => `${condition}${version}`)
						.join(', '),
					message: parseTodoMessage(comment.value),
				},
			});
		} else if (packageVersions.length === 1) {
			uses++;
			const [{condition, version}] = packageVersions;

			const packageVersion = tryToCoerceVersion(packageJson.version);
			const decidedPackageVersion = tryToCoerceVersion(version);

			const compare = semverComparisonForOperator(condition);
			if (packageVersion && compare(packageVersion, decidedPackageVersion)) {
				context.report({
					loc: sourceCode.getLoc(comment),
					messageId: MESSAGE_ID_REACHED_PACKAGE_VERSION,
					data: {
						comparison: `${condition}${version}`,
						message: parseTodoMessage(comment.value),
					},
				});
			}
		}

		// Inclusion: 'in', 'out'
		// Comparison: '>', '>='
		for (const dependency of dependencies) {
			uses++;
			const targetPackageRawVersion = packageDependencies[dependency.name];
			const hasTargetPackage = Boolean(targetPackageRawVersion);

			const isInclusion = ['in', 'out'].includes(dependency.condition);
			if (isInclusion) {
				const [trigger, messageId]
					= dependency.condition === 'in'
						? [hasTargetPackage, MESSAGE_ID_HAVE_PACKAGE]
						: [!hasTargetPackage, MESSAGE_ID_DONT_HAVE_PACKAGE];

				if (trigger) {
					context.report({
						loc: sourceCode.getLoc(comment),
						messageId,
						data: {
							package: dependency.name,
							message: parseTodoMessage(comment.value),
						},
					});
				}

				continue;
			}

			const todoVersion = tryToCoerceVersion(dependency.version);
			const targetPackageVersion = tryToCoerceVersion(targetPackageRawVersion);

			/* c8 ignore start */
			if (!hasTargetPackage || !targetPackageVersion) {
				// Can't compare `¯\_(ツ)_/¯`
				continue;
			}
			/* c8 ignore end */

			const compare = semverComparisonForOperator(dependency.condition);

			if (compare(targetPackageVersion, todoVersion)) {
				context.report({
					loc: sourceCode.getLoc(comment),
					messageId: MESSAGE_ID_VERSION_MATCHES,
					data: {
						comparison: `${dependency.name} ${dependency.condition} ${dependency.version}`,
						message: parseTodoMessage(comment.value),
					},
				});
			}
		}

		const packageEngines = packageJson.engines || {};

		for (const engine of engines) {
			uses++;

			const targetPackageRawEngineVersion = packageEngines.node;
			const hasTargetEngine = Boolean(targetPackageRawEngineVersion);

			/* c8 ignore next 3 */
			if (!hasTargetEngine) {
				continue;
			}

			const todoEngine = tryToCoerceVersion(engine.version);
			const targetPackageEngineVersion = tryToCoerceVersion(
				targetPackageRawEngineVersion,
			);

			const compare = semverComparisonForOperator(engine.condition);

			if (compare(targetPackageEngineVersion, todoEngine)) {
				context.report({
					loc: sourceCode.getLoc(comment),
					messageId: MESSAGE_ID_ENGINE_MATCHES,
					data: {
						comparison: `node${engine.condition}${engine.version}`,
						message: parseTodoMessage(comment.value),
					},
				});
			}
		}

		for (const unknown of unknowns) {
			// In this case, check if there's just an '@' missing before a '>' or '>='.
			const hasAt = unknown.includes('@');
			const comparisonIndex = unknown.indexOf('>');

			if (!hasAt && comparisonIndex !== -1) {
				const testString = `${unknown.slice(
					0,
					comparisonIndex,
				)}@${unknown.slice(comparisonIndex)}`;

				if (parseArgument(testString).type !== 'unknowns') {
					uses++;
					context.report({
						loc: sourceCode.getLoc(comment),
						messageId: MESSAGE_ID_MISSING_AT_SYMBOL,
						data: {
							original: unknown,
							fix: testString,
							message: parseTodoMessage(comment.value),
						},
					});
					continue;
				}
			}

			const withoutWhitespace = unknown.replaceAll(' ', '');

			if (parseArgument(withoutWhitespace).type !== 'unknowns') {
				uses++;
				context.report({
					loc: sourceCode.getLoc(comment),
					messageId: MESSAGE_ID_REMOVE_WHITESPACE,
					data: {
						original: unknown,
						fix: withoutWhitespace,
						message: parseTodoMessage(comment.value),
					},
				});
				continue;
			}
		}

		return uses === 0;
	}

	return {
		Program() {
			rules.Program(); // eslint-disable-line new-cap
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			terms: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			ignore: {
				type: 'array',
				uniqueItems: true,
			},
			ignoreDatesOnPullRequests: {
				type: 'boolean',
			},
			allowWarningComments: {
				type: 'boolean',
			},
			date: {
				type: 'string',
				format: 'date',
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
			description: 'Add expiration conditions to TODO comments.',
			recommended: true,
		},
		schema,
		defaultOptions: [{...DEFAULT_OPTIONS}],
		messages,
	},
};

export default config;
