const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_structured_query = require_rolldown_runtime.__toESM(require("@langchain/core/structured_query"));

//#region src/structured_query/vectara.ts
var vectara_exports = {};
require_rolldown_runtime.__export(vectara_exports, { VectaraTranslator: () => VectaraTranslator });
function processValue(value) {
	/** Convert a value to a string and add single quotes if it is a string. */
	if (typeof value === "string") return `'${value}'`;
	else return String(value);
}
var VectaraTranslator = class extends __langchain_core_structured_query.BaseTranslator {
	allowedOperators = [__langchain_core_structured_query.Operators.and, __langchain_core_structured_query.Operators.or];
	allowedComparators = [
		__langchain_core_structured_query.Comparators.eq,
		__langchain_core_structured_query.Comparators.ne,
		__langchain_core_structured_query.Comparators.lt,
		__langchain_core_structured_query.Comparators.lte,
		__langchain_core_structured_query.Comparators.gt,
		__langchain_core_structured_query.Comparators.gte
	];
	formatFunction(func) {
		if (func in __langchain_core_structured_query.Comparators) {
			if (this.allowedComparators.length > 0 && this.allowedComparators.indexOf(func) === -1) throw new Error(`Comparator ${func} not allowed. Allowed operators: ${this.allowedComparators.join(", ")}`);
		} else if (func in __langchain_core_structured_query.Operators) {
			if (this.allowedOperators.length > 0 && this.allowedOperators.indexOf(func) === -1) throw new Error(`Operator ${func} not allowed. Allowed operators: ${this.allowedOperators.join(", ")}`);
		} else throw new Error("Unknown comparator or operator");
		const mapDict = {
			and: " and ",
			or: " or ",
			eq: "=",
			ne: "!=",
			lt: "<",
			lte: "<=",
			gt: ">",
			gte: ">="
		};
		return mapDict[func];
	}
	/**
	* Visits an operation and returns a VectaraOperationResult. The
	* operation's arguments are visited and the operator is formatted.
	* @param operation The operation to visit.
	* @returns A VectaraOperationResult.
	*/
	visitOperation(operation) {
		const args = operation.args?.map((arg) => arg.accept(this));
		const operator = this.formatFunction(operation.operator);
		return `( ${args.join(operator)} )`;
	}
	/**
	* Visits a comparison and returns a VectaraComparisonResult. The
	* comparison's value is checked for type and the comparator is formatted.
	* Throws an error if the value type is not supported.
	* @param comparison The comparison to visit.
	* @returns A VectaraComparisonResult.
	*/
	visitComparison(comparison) {
		const comparator = this.formatFunction(comparison.comparator);
		return `( doc.${comparison.attribute} ${comparator} ${processValue(comparison.value)} )`;
	}
	/**
	* Visits a structured query and returns a VectaraStructuredQueryResult.
	* If the query has a filter, it is visited.
	* @param query The structured query to visit.
	* @returns A VectaraStructuredQueryResult.
	*/
	visitStructuredQuery(query) {
		let nextArg = {};
		if (query.filter) nextArg = { filter: { filter: query.filter.accept(this) } };
		return nextArg;
	}
	mergeFilters(defaultFilter, generatedFilter, mergeType = "and", forceDefaultFilter = false) {
		if ((0, __langchain_core_structured_query.isFilterEmpty)(defaultFilter) && (0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) return void 0;
		if ((0, __langchain_core_structured_query.isFilterEmpty)(defaultFilter) || mergeType === "replace") {
			if ((0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) return void 0;
			return generatedFilter;
		}
		if ((0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) {
			if (forceDefaultFilter) return defaultFilter;
			if (mergeType === "and") return void 0;
			return defaultFilter;
		}
		if (mergeType === "and") return { filter: `${defaultFilter} and ${generatedFilter}` };
		else if (mergeType === "or") return { filter: `${defaultFilter} or ${generatedFilter}` };
		else throw new Error("Unknown merge type");
	}
};

//#endregion
exports.VectaraTranslator = VectaraTranslator;
Object.defineProperty(exports, 'vectara_exports', {
  enumerable: true,
  get: function () {
    return vectara_exports;
  }
});
//# sourceMappingURL=vectara.cjs.map