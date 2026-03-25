const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const math_expression_evaluator = require_rolldown_runtime.__toESM(require("math-expression-evaluator"));

//#region src/tools/calculator.ts
var calculator_exports = {};
require_rolldown_runtime.__export(calculator_exports, { Calculator: () => Calculator });
/**
* The Calculator class is a tool used to evaluate mathematical
* expressions. It extends the base Tool class.
* @example
* ```typescript
* import { Calculator } from "@langchain/community/tools/calculator";
*
* const calculator = new Calculator();
* const sum = await calculator.invoke("99 + 99");
* console.log("The sum of 99 and 99 is:", sum);
* // The sum of 99 and 99 is: 198
* ```
*/
const Parser = new math_expression_evaluator.default();
var Calculator = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "Calculator";
	}
	get lc_namespace() {
		return [...super.lc_namespace, "calculator"];
	}
	name = "calculator";
	/** @ignore */
	async _call(input) {
		try {
			return Parser.eval(input).toString();
		} catch {
			return "I don't know how to do that.";
		}
	}
	description = `Useful for getting the result of a math expression. The input to this tool should be a valid mathematical expression that could be executed by a simple calculator.`;
};

//#endregion
exports.Calculator = Calculator;
Object.defineProperty(exports, 'calculator_exports', {
  enumerable: true,
  get: function () {
    return calculator_exports;
  }
});
//# sourceMappingURL=calculator.cjs.map