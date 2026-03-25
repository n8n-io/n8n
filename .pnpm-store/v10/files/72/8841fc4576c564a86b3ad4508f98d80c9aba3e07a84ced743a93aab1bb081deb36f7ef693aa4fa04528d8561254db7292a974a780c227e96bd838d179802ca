 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import {TokenType as tt} from "../parser/tokenizer/types";


import Transformer from "./Transformer";

const JEST_GLOBAL_NAME = "jest";
const HOISTED_METHODS = ["mock", "unmock", "enableAutomock", "disableAutomock"];

/**
 * Implementation of babel-plugin-jest-hoist, which hoists up some jest method
 * calls above the imports to allow them to override other imports.
 *
 * To preserve line numbers, rather than directly moving the jest.mock code, we
 * wrap each invocation in a function statement and then call the function from
 * the top of the file.
 */
export default class JestHoistTransformer extends Transformer {
    __init() {this.hoistedFunctionNames = []}

  constructor(
     rootTransformer,
     tokens,
     nameManager,
     importProcessor,
  ) {
    super();this.rootTransformer = rootTransformer;this.tokens = tokens;this.nameManager = nameManager;this.importProcessor = importProcessor;JestHoistTransformer.prototype.__init.call(this);;
  }

  process() {
    if (
      this.tokens.currentToken().scopeDepth === 0 &&
      this.tokens.matches4(tt.name, tt.dot, tt.name, tt.parenL) &&
      this.tokens.identifierName() === JEST_GLOBAL_NAME
    ) {
      // TODO: This only works if imports transform is active, which it will be for jest.
      //       But if jest adds module support and we no longer need the import transform, this needs fixing.
      if (_optionalChain([this, 'access', _ => _.importProcessor, 'optionalAccess', _2 => _2.getGlobalNames, 'call', _3 => _3(), 'optionalAccess', _4 => _4.has, 'call', _5 => _5(JEST_GLOBAL_NAME)])) {
        return false;
      }
      return this.extractHoistedCalls();
    }

    return false;
  }

  getHoistedCode() {
    if (this.hoistedFunctionNames.length > 0) {
      // This will be placed before module interop code, but that's fine since
      // imports aren't allowed in module mock factories.
      return this.hoistedFunctionNames.map((name) => `${name}();`).join("");
    }
    return "";
  }

  /**
   * Extracts any methods calls on the jest-object that should be hoisted.
   *
   * According to the jest docs, https://jestjs.io/docs/en/jest-object#jestmockmodulename-factory-options,
   * mock, unmock, enableAutomock, disableAutomock, are the methods that should be hoisted.
   *
   * We do not apply the same checks of the arguments as babel-plugin-jest-hoist does.
   */
   extractHoistedCalls() {
    // We're handling a chain of calls where `jest` may or may not need to be inserted for each call
    // in the chain, so remove the initial `jest` to make the loop implementation cleaner.
    this.tokens.removeToken();
    // Track some state so that multiple non-hoisted chained calls in a row keep their chaining
    // syntax.
    let followsNonHoistedJestCall = false;

    // Iterate through all chained calls on the jest object.
    while (this.tokens.matches3(tt.dot, tt.name, tt.parenL)) {
      const methodName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
      const shouldHoist = HOISTED_METHODS.includes(methodName);
      if (shouldHoist) {
        // We've matched e.g. `.mock(...)` or similar call.
        // Replace the initial `.` with `function __jestHoist(){jest.`
        const hoistedFunctionName = this.nameManager.claimFreeName("__jestHoist");
        this.hoistedFunctionNames.push(hoistedFunctionName);
        this.tokens.replaceToken(`function ${hoistedFunctionName}(){${JEST_GLOBAL_NAME}.`);
        this.tokens.copyToken();
        this.tokens.copyToken();
        this.rootTransformer.processBalancedCode();
        this.tokens.copyExpectedToken(tt.parenR);
        this.tokens.appendCode(";}");
        followsNonHoistedJestCall = false;
      } else {
        // This is a non-hoisted method, so just transform the code as usual.
        if (followsNonHoistedJestCall) {
          // If we didn't hoist the previous call, we can leave the code as-is to chain off of the
          // previous method call. It's important to preserve the code here because we don't know
          // for sure that the method actually returned the jest object for chaining.
          this.tokens.copyToken();
        } else {
          // If we hoisted the previous call, we know it returns the jest object back, so we insert
          // the identifier `jest` to continue the chain.
          this.tokens.replaceToken(`${JEST_GLOBAL_NAME}.`);
        }
        this.tokens.copyToken();
        this.tokens.copyToken();
        this.rootTransformer.processBalancedCode();
        this.tokens.copyExpectedToken(tt.parenR);
        followsNonHoistedJestCall = true;
      }
    }

    return true;
  }
}
