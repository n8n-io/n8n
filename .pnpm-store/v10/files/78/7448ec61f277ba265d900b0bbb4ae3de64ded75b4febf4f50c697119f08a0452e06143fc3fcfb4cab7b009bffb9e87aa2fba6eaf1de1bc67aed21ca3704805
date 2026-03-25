import getDocumentationUrl from './get-documentation-url.js';

const isIterable = object => typeof object?.[Symbol.iterator] === 'function';

class FixAbortError extends Error {
	constructor() {
		super();
		this.name = 'FixAbortError';
	}
}
const fixOptions = {
	abort() {
		throw new FixAbortError('Fix aborted.');
	},
};

function wrapFixFunction(fix) {
	return fixer => {
		const result = fix(fixer, fixOptions);

		if (isIterable(result)) {
			try {
				return [...result];
			} catch (error) {
				if (error instanceof FixAbortError) {
					return;
				}

				/* c8 ignore next */
				throw error;
			}
		}

		return result;
	};
}

function reportListenerProblems(problems, context) {
	if (!problems) {
		return;
	}

	if (!isIterable(problems)) {
		problems = [problems];
	}

	for (const problem of problems) {
		if (!problem) {
			continue;
		}

		problem.fix &&= wrapFixFunction(problem.fix);

		if (Array.isArray(problem.suggest)) {
			for (const suggest of problem.suggest) {
				suggest.fix &&= wrapFixFunction(suggest.fix);

				suggest.data = {
					...problem.data,
					...suggest.data,
				};
			}
		}

		context.report(problem);
	}
}

// `checkVueTemplate` function will wrap `create` function, there is no need to wrap twice
const wrappedFunctions = new Set();
function reportProblems(create) {
	if (wrappedFunctions.has(create)) {
		return create;
	}

	const wrapped = context => {
		const listeners = {};
		const addListener = (selector, listener) => {
			listeners[selector] ??= [];
			listeners[selector].push(listener);
		};

		const contextProxy = new Proxy(context, {
			get(target, property, receiver) {
				if (property === 'on') {
					return (selectorOrSelectors, listener) => {
						const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
						for (const selector of selectors) {
							addListener(selector, listener);
						}
					};
				}

				if (property === 'onExit') {
					return (selectorOrSelectors, listener) => {
						const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
						for (const selector of selectors) {
							addListener(`${selector}:exit`, listener);
						}
					};
				}

				return Reflect.get(target, property, receiver);
			},
		});

		for (const [selector, listener] of Object.entries(create(contextProxy) ?? {})) {
			addListener(selector, listener);
		}

		return Object.fromEntries(
			Object.entries(listeners)
				.map(([selector, listeners]) => [
					selector,
					// Listener arguments can be `codePath, node` or `node`
					(...listenerArguments) => {
						for (const listener of listeners) {
							reportListenerProblems(listener(...listenerArguments), context);
						}
					},
				]),
		);
	};

	wrappedFunctions.add(wrapped);

	return wrapped;
}

export function checkVueTemplate(create, options) {
	const {
		visitScriptBlock,
	} = {
		visitScriptBlock: true,
		...options,
	};

	create = reportProblems(create);

	const wrapped = context => {
		const listeners = create(context);
		const {parserServices} = context.sourceCode;

		// `vue-eslint-parser`
		if (parserServices?.defineTemplateBodyVisitor) {
			return visitScriptBlock
				? parserServices.defineTemplateBodyVisitor(listeners, listeners)
				: parserServices.defineTemplateBodyVisitor(listeners);
		}

		return listeners;
	};

	wrappedFunctions.add(wrapped);
	return wrapped;
}

/** @returns {import('eslint').Rule.RuleModule} */
export function createRule(rule, ruleId) {
	return {
		meta: {
			// If there is are, options add `[]` so ESLint can validate that no data is passed to the rule.
			// https://github.com/not-an-aardvark/eslint-plugin-eslint-plugin/blob/master/docs/rules/require-meta-schema.md
			schema: [],
			...rule.meta,
			docs: {
				...rule.meta.docs,
				url: getDocumentationUrl(ruleId),
			},
		},
		create: reportProblems(rule.create),
	};
}
