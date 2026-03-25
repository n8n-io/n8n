const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_supabase_utils = require('./supabase_utils.cjs');
const __langchain_core_structured_query = require_rolldown_runtime.__toESM(require("@langchain/core/structured_query"));

//#region src/structured_query/supabase.ts
var supabase_exports = {};
require_rolldown_runtime.__export(supabase_exports, { SupabaseTranslator: () => SupabaseTranslator });
/**
* A specialized translator designed to work with Supabase, extending the
* BaseTranslator class. It translates structured queries into a format
* that can be understood by the Supabase database.
* @example
* ```typescript
* const selfQueryRetriever = new SelfQueryRetriever({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   vectorStore: new SupabaseVectorStore(),
*   documentContents: "Brief summary of a movie",
*   attributeInfo: [],
*   structuredQueryTranslator: new SupabaseTranslator(),
* });
*
* const queryResult = await selfQueryRetriever.getRelevantDocuments(
*   "Which movies are directed by Greta Gerwig?",
* );
* ```
*/
var SupabaseTranslator = class extends __langchain_core_structured_query.BaseTranslator {
	allowedOperators = [__langchain_core_structured_query.Operators.and, __langchain_core_structured_query.Operators.or];
	allowedComparators = [
		__langchain_core_structured_query.Comparators.eq,
		__langchain_core_structured_query.Comparators.ne,
		__langchain_core_structured_query.Comparators.gt,
		__langchain_core_structured_query.Comparators.gte,
		__langchain_core_structured_query.Comparators.lt,
		__langchain_core_structured_query.Comparators.lte
	];
	formatFunction() {
		throw new Error("Not implemented");
	}
	/**
	* Returns a function that applies the appropriate comparator operation on
	* the attribute and value provided. The function returned is used to
	* filter data in a Supabase database.
	* @param comparator The comparator to be used in the operation.
	* @returns A function that applies the comparator operation on the attribute and value provided.
	*/
	getComparatorFunction(comparator) {
		switch (comparator) {
			case __langchain_core_structured_query.Comparators.eq: return (attr, value) => (rpc) => rpc.eq(this.buildColumnName(attr, value), value);
			case __langchain_core_structured_query.Comparators.ne: return (attr, value) => (rpc) => rpc.neq(this.buildColumnName(attr, value), value);
			case __langchain_core_structured_query.Comparators.gt: return (attr, value) => (rpc) => rpc.gt(this.buildColumnName(attr, value), value);
			case __langchain_core_structured_query.Comparators.gte: return (attr, value) => (rpc) => rpc.gte(this.buildColumnName(attr, value), value);
			case __langchain_core_structured_query.Comparators.lt: return (attr, value) => (rpc) => rpc.lt(this.buildColumnName(attr, value), value);
			case __langchain_core_structured_query.Comparators.lte: return (attr, value) => (rpc) => rpc.lte(this.buildColumnName(attr, value), value);
			default: throw new Error("Unknown comparator");
		}
	}
	/**
	* Builds a column name based on the attribute and value provided. The
	* column name is used in filtering data in a Supabase database.
	* @param attr The attribute to be used in the column name.
	* @param value The value to be used in the column name.
	* @param includeType Whether to include the data type in the column name.
	* @returns The built column name.
	*/
	buildColumnName(attr, value, includeType = true) {
		let column = "";
		if ((0, __langchain_core_structured_query.isString)(value)) column = `metadata->>${attr}`;
		else if ((0, __langchain_core_structured_query.isInt)(value)) column = `metadata->${attr}${includeType ? "::int" : ""}`;
		else if ((0, __langchain_core_structured_query.isFloat)(value)) column = `metadata->${attr}${includeType ? "::float" : ""}`;
		else if ((0, __langchain_core_structured_query.isBoolean)(value)) column = `metadata->${attr}${includeType ? "::boolean" : ""}`;
		else throw new Error("Data type not supported");
		return column;
	}
	/**
	* Visits an operation and returns a string representation of it. This is
	* used in translating a structured query into a format that can be
	* understood by Supabase.
	* @param operation The operation to be visited.
	* @returns A string representation of the operation.
	*/
	visitOperationAsString(operation) {
		const { args } = operation;
		if (!args) return "";
		return args?.reduce((acc, arg) => {
			if (arg.exprName === "Comparison") acc.push(this.visitComparisonAsString(arg));
			else if (arg.exprName === "Operation") {
				const { operator: innerOperator } = arg;
				acc.push(`${innerOperator}(${this.visitOperationAsString(arg)})`);
			}
			return acc;
		}, []).join(",");
	}
	/**
	* Visits an operation and returns a function that applies the operation
	* on a Supabase database. This is used in translating a structured query
	* into a format that can be understood by Supabase.
	* @param operation The operation to be visited.
	* @returns A function that applies the operation on a Supabase database.
	*/
	visitOperation(operation) {
		const { operator, args } = operation;
		if (this.allowedOperators.includes(operator)) if (operator === __langchain_core_structured_query.Operators.and) {
			if (!args) return (rpc) => rpc;
			const filter = (rpc) => args.reduce((acc, arg) => {
				const filter$1 = arg.accept(this);
				return filter$1(acc);
			}, rpc);
			return filter;
		} else if (operator === __langchain_core_structured_query.Operators.or) return (rpc) => rpc.or(this.visitOperationAsString(operation));
		else throw new Error("Unknown operator");
		else throw new Error("Operator not allowed");
	}
	/**
	* Visits a comparison and returns a string representation of it. This is
	* used in translating a structured query into a format that can be
	* understood by Supabase.
	* @param comparison The comparison to be visited.
	* @returns A string representation of the comparison.
	*/
	visitComparisonAsString(comparison) {
		let { value } = comparison;
		const { comparator: _comparator, attribute } = comparison;
		let comparator = _comparator;
		if (comparator === __langchain_core_structured_query.Comparators.ne) comparator = "neq";
		if (Array.isArray(value)) value = `(${value.map((v) => {
			if (typeof v === "string" && /[,()]/.test(v)) return `"${v}"`;
			return v;
		}).join(",")})`;
		return `${this.buildColumnName(attribute, value, false)}.${comparator}.${value}`;
	}
	/**
	* Visits a comparison and returns a function that applies the comparison
	* on a Supabase database. This is used in translating a structured query
	* into a format that can be understood by Supabase.
	* @param comparison The comparison to be visited.
	* @returns A function that applies the comparison on a Supabase database.
	*/
	visitComparison(comparison) {
		const { comparator, attribute, value } = comparison;
		if (this.allowedComparators.includes(comparator)) {
			const comparatorFunction = this.getComparatorFunction(comparator);
			return comparatorFunction(attribute, value);
		} else throw new Error("Comparator not allowed");
	}
	/**
	* Visits a structured query and returns a function that applies the query
	* on a Supabase database. This is used in translating a structured query
	* into a format that can be understood by Supabase.
	* @param query The structured query to be visited.
	* @returns A function that applies the query on a Supabase database.
	*/
	visitStructuredQuery(query) {
		if (!query.filter) return {};
		const filterFunction = query.filter?.accept(this);
		return { filter: filterFunction ?? {} };
	}
	/**
	* Merges two filters into one. The merged filter can be used to filter
	* data in a Supabase database.
	* @param defaultFilter The default filter to be merged.
	* @param generatedFilter The generated filter to be merged.
	* @param mergeType The type of merge to be performed. It can be 'and', 'or', or 'replace'.
	* @returns The merged filter.
	*/
	mergeFilters(defaultFilter, generatedFilter, mergeType = "and") {
		if ((0, __langchain_core_structured_query.isFilterEmpty)(defaultFilter) && (0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) return void 0;
		if ((0, __langchain_core_structured_query.isFilterEmpty)(defaultFilter) || mergeType === "replace") {
			if ((0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) return void 0;
			return generatedFilter;
		}
		if ((0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) {
			if (mergeType === "and") return void 0;
			return defaultFilter;
		}
		let myDefaultFilter = defaultFilter;
		if ((0, __langchain_core_structured_query.isObject)(defaultFilter)) {
			const { filter } = this.visitStructuredQuery(require_supabase_utils.convertObjectFilterToStructuredQuery(defaultFilter));
			if ((0, __langchain_core_structured_query.isFilterEmpty)(filter)) {
				if ((0, __langchain_core_structured_query.isFilterEmpty)(generatedFilter)) return void 0;
				return generatedFilter;
			}
			myDefaultFilter = filter;
		}
		if (mergeType === "or") return (rpc) => {
			const defaultFlattenedParams = require_supabase_utils.ProxyParamsDuplicator.getFlattenedParams(rpc, myDefaultFilter);
			const generatedFlattenedParams = require_supabase_utils.ProxyParamsDuplicator.getFlattenedParams(rpc, generatedFilter);
			return rpc.or(`${defaultFlattenedParams},${generatedFlattenedParams}`);
		};
		else if (mergeType === "and") return (rpc) => generatedFilter(myDefaultFilter(rpc));
		else throw new Error("Unknown merge type");
	}
};

//#endregion
exports.SupabaseTranslator = SupabaseTranslator;
Object.defineProperty(exports, 'supabase_exports', {
  enumerable: true,
  get: function () {
    return supabase_exports;
  }
});
//# sourceMappingURL=supabase.cjs.map