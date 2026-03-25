/**
 * Adapted from https://github.com/mattphillips/jest-chain/blob/main/src/chain.js
 */
import { evaluatedBy } from "./evaluatedBy.js";
class JestlikeAssertionError extends Error {
    constructor(result, callsite) {
        super(typeof result.message === "function" ? result.message() : result.message);
        Object.defineProperty(this, "matcherResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.matcherResult = result;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, callsite);
        }
    }
}
const _wrapMatchers = (matchers, evaluator, originalArgs, originalExpect, staticPath = []) => {
    return Object.keys(matchers)
        .filter((name) => typeof matchers[name] === "function")
        .map((name) => {
        const newMatcher = async (...args) => {
            try {
                const score = await evaluatedBy(originalArgs[0], evaluator);
                let result = originalExpect(score);
                for (const pathEntry of staticPath) {
                    result = result[pathEntry];
                }
                result = result[name](...args); // run matcher up to current state
                if (result && typeof result.then === "function") {
                    return Object.assign(Promise.resolve(result), matchers);
                }
                else {
                    return matchers;
                }
            }
            catch (error) {
                if (!error.matcherResult) {
                    throw error;
                }
                else {
                    throw new JestlikeAssertionError(error.matcherResult, newMatcher);
                }
            }
        };
        return { [name]: newMatcher };
    });
};
const addEvaluatedBy = (matchers, originalArgs, originalExpect, staticPath = []) => {
    let spreadMatchers = { ...matchers };
    // Handle Bun, which uses a class, and Vitest which uses something weird
    if (Object.keys(matchers).length === 0 ||
        !Object.keys(matchers).includes("toEqual")) {
        const prototypeProps = Object.getOwnPropertyNames(Object.getPrototypeOf(matchers));
        spreadMatchers = Object.fromEntries(prototypeProps.map((prop) => {
            try {
                return [prop, matchers[prop]];
            }
            catch (e) {
                // Ignore bizarre Bun bug
                return [];
            }
        }));
    }
    return Object.assign({}, matchers, {
        evaluatedBy: function (evaluator) {
            const mappedMatchers = _wrapMatchers(spreadMatchers, evaluator, originalArgs, originalExpect, []);
            // .not etc.
            const staticMatchers = Object.keys(spreadMatchers)
                .filter((name) => typeof matchers[name] !== "function")
                .map((name) => {
                return {
                    [name]: Object.assign({}, ..._wrapMatchers(spreadMatchers, evaluator, originalArgs, originalExpect, staticPath.concat(name))),
                };
            });
            return Object.assign({}, ...mappedMatchers, ...staticMatchers);
        },
    });
};
export function wrapExpect(originalExpect) {
    // proxy the expect function
    const expectProxy = Object.assign((...args) => addEvaluatedBy(originalExpect(...args), args, originalExpect, []), // partially apply expect to get all matchers and chain them
    originalExpect // clone additional properties on expect
    );
    return expectProxy;
}
globalThis.expect = wrapExpect(globalThis.expect);
