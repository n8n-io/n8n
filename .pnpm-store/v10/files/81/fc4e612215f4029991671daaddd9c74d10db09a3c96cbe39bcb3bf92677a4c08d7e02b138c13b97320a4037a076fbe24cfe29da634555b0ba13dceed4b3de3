import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseTranslator, Comparators, Operators, isFilterEmpty } from "@langchain/core/structured_query";

//#region src/structured_query/vectara.ts
var vectara_exports = {};
__export(vectara_exports, { VectaraTranslator: () => VectaraTranslator });
function processValue(value) {
	/** Convert a value to a string and add single quotes if it is a string. */
	if (typeof value === "string") return `'${value}'`;
	else return String(value);
}
var VectaraTranslator = class extends BaseTranslator {
	allowedOperators = [Operators.and, Operators.or];
	allowedComparators = [
		Comparators.eq,
		Comparators.ne,
		Comparators.lt,
		Comparators.lte,
		Comparators.gt,
		Comparators.gte
	];
	formatFunction(func) {
		if (func in Comparators) {
			if (this.allowedComparators.length > 0 && this.allowedComparators.indexOf(func) === -1) throw new Error(`Comparator ${func} not allowed. Allowed operators: ${this.allowedComparators.join(", ")}`);
		} else if (func in Operators) {
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
		if (isFilterEmpty(defaultFilter) && isFilterEmpty(generatedFilter)) return void 0;
		if (isFilterEmpty(defaultFilter) || mergeType === "replace") {
			if (isFilterEmpty(generatedFilter)) return void 0;
			return generatedFilter;
		}
		if (isFilterEmpty(generatedFilter)) {
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
export { VectaraTranslator, vectara_exports };
//# sourceMappingURL=vectara.js.map