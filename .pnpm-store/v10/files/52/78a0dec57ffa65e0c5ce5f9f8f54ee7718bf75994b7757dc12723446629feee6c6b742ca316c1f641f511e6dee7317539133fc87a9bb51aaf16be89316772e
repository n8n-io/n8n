"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calledWithFn = void 0;
const Matchers_1 = require("./Matchers");
function isJestAsymmetricMatcher(obj) {
    return !!obj && typeof obj === 'object' && 'asymmetricMatch' in obj && typeof obj.asymmetricMatch === 'function';
}
const checkCalledWith = (calledWithStack, actualArgs, fallbackMockImplementation) => {
    const calledWithInstance = calledWithStack.find((instance) => instance.args.every((matcher, i) => {
        if (matcher instanceof Matchers_1.Matcher) {
            return matcher.asymmetricMatch(actualArgs[i]);
        }
        if (isJestAsymmetricMatcher(matcher)) {
            return matcher.asymmetricMatch(actualArgs[i]);
        }
        return actualArgs[i] === matcher;
    }));
    // @ts-ignore cannot return undefined, but this will fail the test if there is an expectation which is what we want
    return calledWithInstance
        ? calledWithInstance.calledWithFn(...actualArgs)
        : fallbackMockImplementation && fallbackMockImplementation(...actualArgs);
};
const calledWithFn = ({ fallbackMockImplementation, } = {}) => {
    const fn = jest.fn(fallbackMockImplementation);
    let calledWithStack = [];
    fn.calledWith = (...args) => {
        // We create new function to delegate any interactions (mockReturnValue etc.) to for this set of args.
        // If that set of args is matched, we just call that jest.fn() for the result.
        const calledWithFn = jest.fn(fallbackMockImplementation);
        const mockImplementation = fn.getMockImplementation();
        if (!mockImplementation || mockImplementation === fallbackMockImplementation) {
            // Our original function gets a mock implementation which handles the matching
            fn.mockImplementation((...args) => checkCalledWith(calledWithStack, args, fallbackMockImplementation));
            calledWithStack = [];
        }
        calledWithStack.unshift({ args, calledWithFn });
        return calledWithFn;
    };
    return fn;
};
exports.calledWithFn = calledWithFn;
exports.default = exports.calledWithFn;
