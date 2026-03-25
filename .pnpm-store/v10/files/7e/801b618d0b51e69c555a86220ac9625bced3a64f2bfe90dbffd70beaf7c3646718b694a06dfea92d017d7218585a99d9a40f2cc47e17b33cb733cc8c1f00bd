const require_ir = require("./ir.cjs");
const require_utils = require("./utils.cjs");
const require_base = require("./base.cjs");
//#region src/structured_query/functional.ts
/**
* A class that extends `BaseTranslator` to translate structured queries
* into functional filters.
* @example
* ```typescript
* const functionalTranslator = new FunctionalTranslator();
* const relevantDocuments = await functionalTranslator.getRelevantDocuments(
*   "Which movies are rated higher than 8.5?",
* );
* ```
*/
var FunctionalTranslator = class extends require_base.BaseTranslator {
	allowedOperators = [require_ir.Operators.and, require_ir.Operators.or];
	allowedComparators = [
		require_ir.Comparators.eq,
		require_ir.Comparators.ne,
		require_ir.Comparators.gt,
		require_ir.Comparators.gte,
		require_ir.Comparators.lt,
		require_ir.Comparators.lte
	];
	formatFunction() {
		throw new Error("Not implemented");
	}
	/**
	* Returns the allowed comparators for a given data type.
	* @param input The input value to get the allowed comparators for.
	* @returns An array of allowed comparators for the input data type.
	*/
	getAllowedComparatorsForType(inputType) {
		switch (inputType) {
			case "string": return [
				require_ir.Comparators.eq,
				require_ir.Comparators.ne,
				require_ir.Comparators.gt,
				require_ir.Comparators.gte,
				require_ir.Comparators.lt,
				require_ir.Comparators.lte
			];
			case "number": return [
				require_ir.Comparators.eq,
				require_ir.Comparators.ne,
				require_ir.Comparators.gt,
				require_ir.Comparators.gte,
				require_ir.Comparators.lt,
				require_ir.Comparators.lte
			];
			case "boolean": return [require_ir.Comparators.eq, require_ir.Comparators.ne];
			default: throw new Error(`Unsupported data type: ${inputType}`);
		}
	}
	/**
	* Returns a function that performs a comparison based on the provided
	* comparator.
	* @param comparator The comparator to base the comparison function on.
	* @returns A function that takes two arguments and returns a boolean based on the comparison.
	*/
	getComparatorFunction(comparator) {
		switch (comparator) {
			case require_ir.Comparators.eq: return (a, b) => a === b;
			case require_ir.Comparators.ne: return (a, b) => a !== b;
			case require_ir.Comparators.gt: return (a, b) => a > b;
			case require_ir.Comparators.gte: return (a, b) => a >= b;
			case require_ir.Comparators.lt: return (a, b) => a < b;
			case require_ir.Comparators.lte: return (a, b) => a <= b;
			default: throw new Error("Unknown comparator");
		}
	}
	/**
	* Returns a function that performs an operation based on the provided
	* operator.
	* @param operator The operator to base the operation function on.
	* @returns A function that takes two boolean arguments and returns a boolean based on the operation.
	*/
	getOperatorFunction(operator) {
		switch (operator) {
			case require_ir.Operators.and: return (a, b) => a && b;
			case require_ir.Operators.or: return (a, b) => a || b;
			default: throw new Error("Unknown operator");
		}
	}
	/**
	* Visits the operation part of a structured query and translates it into
	* a functional filter.
	* @param operation The operation part of a structured query.
	* @returns A function that takes a `Document` as an argument and returns a boolean based on the operation.
	*/
	visitOperation(operation) {
		const { operator, args } = operation;
		if (this.allowedOperators.includes(operator)) {
			const operatorFunction = this.getOperatorFunction(operator);
			return (document) => {
				if (!args) return true;
				return args.reduce((acc, arg) => {
					const result = arg.accept(this);
					if (typeof result === "function") return operatorFunction(acc, result(document));
					else throw new Error("Filter is not a function");
				}, true);
			};
		} else throw new Error("Operator not allowed");
	}
	/**
	* Visits the comparison part of a structured query and translates it into
	* a functional filter.
	* @param comparison The comparison part of a structured query.
	* @returns A function that takes a `Document` as an argument and returns a boolean based on the comparison.
	*/
	visitComparison(comparison) {
		const { comparator, attribute, value } = comparison;
		const undefinedTrue = [require_ir.Comparators.ne];
		if (this.allowedComparators.includes(comparator)) {
			if (!this.getAllowedComparatorsForType(typeof value).includes(comparator)) throw new Error(`'${comparator}' comparator not allowed to be used with ${typeof value}`);
			const comparatorFunction = this.getComparatorFunction(comparator);
			return (document) => {
				const documentValue = document.metadata[attribute];
				if (documentValue === void 0) {
					if (undefinedTrue.includes(comparator)) return true;
					return false;
				}
				return comparatorFunction(documentValue, require_utils.castValue(value));
			};
		} else throw new Error("Comparator not allowed");
	}
	/**
	* Visits a structured query and translates it into a functional filter.
	* @param query The structured query to translate.
	* @returns An object containing a `filter` property, which is a function that takes a `Document` as an argument and returns a boolean based on the structured query.
	*/
	visitStructuredQuery(query) {
		if (!query.filter) return {};
		const filterFunction = query.filter?.accept(this);
		if (typeof filterFunction !== "function") throw new Error("Structured query filter is not a function");
		return { filter: filterFunction };
	}
	/**
	* Merges two filters into one, based on the specified merge type.
	* @param defaultFilter The default filter function.
	* @param generatedFilter The generated filter function.
	* @param mergeType The type of merge to perform. Can be 'and', 'or', or 'replace'. Default is 'and'.
	* @returns A function that takes a `Document` as an argument and returns a boolean based on the merged filters, or `undefined` if both filters are empty.
	*/
	mergeFilters(defaultFilter, generatedFilter, mergeType = "and") {
		if (require_utils.isFilterEmpty(defaultFilter) && require_utils.isFilterEmpty(generatedFilter)) return;
		if (require_utils.isFilterEmpty(defaultFilter) || mergeType === "replace") {
			if (require_utils.isFilterEmpty(generatedFilter)) return;
			return generatedFilter;
		}
		if (require_utils.isFilterEmpty(generatedFilter)) {
			if (mergeType === "and") return;
			return defaultFilter;
		}
		if (mergeType === "and") return (document) => defaultFilter(document) && generatedFilter(document);
		else if (mergeType === "or") return (document) => defaultFilter(document) || generatedFilter(document);
		else throw new Error("Unknown merge type");
	}
};
//#endregion
exports.FunctionalTranslator = FunctionalTranslator;

//# sourceMappingURL=functional.cjs.map