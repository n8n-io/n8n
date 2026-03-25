const require_ir = require("./ir.cjs");
const require_utils = require("./utils.cjs");
//#region src/structured_query/base.ts
/**
* Abstract class that provides a blueprint for creating specific
* translator classes. Defines two abstract methods: formatFunction and
* mergeFilters.
*/
var BaseTranslator = class extends require_ir.Visitor {};
/**
* Class that extends the BaseTranslator class and provides concrete
* implementations for the abstract methods. Also declares three types:
* VisitOperationOutput, VisitComparisonOutput, and
* VisitStructuredQueryOutput, which are used as the return types for the
* visitOperation, visitComparison, and visitStructuredQuery methods
* respectively.
*/
var BasicTranslator = class extends BaseTranslator {
	allowedOperators;
	allowedComparators;
	constructor(opts) {
		super();
		this.allowedOperators = opts?.allowedOperators ?? [require_ir.Operators.and, require_ir.Operators.or];
		this.allowedComparators = opts?.allowedComparators ?? [
			require_ir.Comparators.eq,
			require_ir.Comparators.ne,
			require_ir.Comparators.gt,
			require_ir.Comparators.gte,
			require_ir.Comparators.lt,
			require_ir.Comparators.lte
		];
	}
	formatFunction(func) {
		if (func in require_ir.Comparators) {
			if (this.allowedComparators.length > 0 && this.allowedComparators.indexOf(func) === -1) throw new Error(`Comparator ${func} not allowed. Allowed comparators: ${this.allowedComparators.join(", ")}`);
		} else if (func in require_ir.Operators) {
			if (this.allowedOperators.length > 0 && this.allowedOperators.indexOf(func) === -1) throw new Error(`Operator ${func} not allowed. Allowed operators: ${this.allowedOperators.join(", ")}`);
		} else throw new Error("Unknown comparator or operator");
		return `$${func}`;
	}
	/**
	* Visits an operation and returns a result.
	* @param operation The operation to visit.
	* @returns The result of visiting the operation.
	*/
	visitOperation(operation) {
		const args = operation.args?.map((arg) => arg.accept(this));
		return { [this.formatFunction(operation.operator)]: args };
	}
	/**
	* Visits a comparison and returns a result.
	* @param comparison The comparison to visit.
	* @returns The result of visiting the comparison.
	*/
	visitComparison(comparison) {
		return { [comparison.attribute]: { [this.formatFunction(comparison.comparator)]: require_utils.castValue(comparison.value) } };
	}
	/**
	* Visits a structured query and returns a result.
	* @param query The structured query to visit.
	* @returns The result of visiting the structured query.
	*/
	visitStructuredQuery(query) {
		let nextArg = {};
		if (query.filter) nextArg = { filter: query.filter.accept(this) };
		return nextArg;
	}
	mergeFilters(defaultFilter, generatedFilter, mergeType = "and", forceDefaultFilter = false) {
		if (require_utils.isFilterEmpty(defaultFilter) && require_utils.isFilterEmpty(generatedFilter)) return;
		if (require_utils.isFilterEmpty(defaultFilter) || mergeType === "replace") {
			if (require_utils.isFilterEmpty(generatedFilter)) return;
			return generatedFilter;
		}
		if (require_utils.isFilterEmpty(generatedFilter)) {
			if (forceDefaultFilter) return defaultFilter;
			if (mergeType === "and") return;
			return defaultFilter;
		}
		if (mergeType === "and") return { $and: [defaultFilter, generatedFilter] };
		else if (mergeType === "or") return { $or: [defaultFilter, generatedFilter] };
		else throw new Error("Unknown merge type");
	}
};
//#endregion
exports.BaseTranslator = BaseTranslator;
exports.BasicTranslator = BasicTranslator;

//# sourceMappingURL=base.cjs.map