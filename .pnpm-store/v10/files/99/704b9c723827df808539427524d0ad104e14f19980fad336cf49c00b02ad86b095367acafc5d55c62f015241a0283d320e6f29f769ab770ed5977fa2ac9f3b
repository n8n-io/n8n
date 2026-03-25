const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_structured_query = require_rolldown_runtime.__toESM(require("@langchain/core/structured_query"));

//#region src/structured_query/supabase_utils.ts
/**
* Utility class used to duplicate parameters for a proxy object,
* specifically designed to work with `SupabaseFilter` objects. It
* contains methods to handle different types of operations such as "or",
* "filter", "in", "contains", "textSearch", "match", "not", and default
* operations.
*/
var ProxyParamsDuplicator = class ProxyParamsDuplicator {
	duplicationAllowedOps = [
		"eq",
		"neq",
		"lt",
		"lte",
		"gt",
		"gte",
		"like",
		"ilike",
		"or",
		"in",
		"contains",
		"match",
		"not",
		"textSearch",
		"filter"
	];
	values = [];
	/**
	* Creates a proxy handler for a `SupabaseFilter` object. The handler
	* intercepts get operations and applies specific logic based on the
	* property being accessed.
	* @returns A proxy handler for a `SupabaseFilter` object.
	*/
	buildProxyHandler() {
		const proxyHandler = { get: (target, prop, receiver) => {
			if (typeof target[prop] === "function") return (...args) => {
				if (this.duplicationAllowedOps.includes(String(prop))) {
					switch (String(prop)) {
						case "or":
							this.addOrClause(args[0], args[1]);
							break;
						case "filter":
							this.addFilterClause(args[0], args[1], args[2]);
							break;
						case "in":
							this.addInClause(args[0], args[1]);
							break;
						case "contains":
							this.addContainsClause(args[0], args[1]);
							break;
						case "textSearch":
							this.addTextSearchClause(args[0], args[1], args[2]);
							break;
						case "match":
							this.addMatchClause(args[0]);
							break;
						case "not":
							this.addNotClause(args[0], args[1], args[2]);
							break;
						default: this.addDefaultOpClause(prop, args[0], args[1]);
					}
					return new Proxy(target, proxyHandler);
				} else throw new Error("Filter operation not supported for 'or' mergeFiltersOperator");
			};
			else return Reflect.get(target, prop, receiver);
		} };
		return proxyHandler;
	}
	/**
	* Removes type annotations from a value string.
	* @param value The value string to clean.
	* @returns The cleaned value string.
	*/
	removeType(value) {
		let cleanedValue = value;
		if (cleanedValue.includes("::float")) cleanedValue = cleanedValue.replace("::float", "");
		if (cleanedValue.includes("::int")) cleanedValue = cleanedValue.replace("::int", "");
		return cleanedValue;
	}
	/**
	* Adds a default operation clause to the values array.
	* @param prop The operation property.
	* @param column The column to apply the operation to.
	* @param value The value for the operation.
	*/
	addDefaultOpClause(prop, column, value) {
		this.values.push([this.removeType(column), `${String(prop)}.${value}`]);
	}
	/**
	* Adds an 'or' clause to the values array.
	* @param filters The filters for the 'or' clause.
	* @param foreignTable Optional foreign table for the 'or' clause.
	*/
	addOrClause(filters, { foreignTable } = {}) {
		const key = foreignTable ? `${foreignTable}.or` : "or";
		this.values.push([this.removeType(key), `(${filters})`]);
	}
	/**
	* Adds a 'filter' clause to the values array.
	* @param column The column to apply the filter to.
	* @param operator The operator for the filter.
	* @param value The value for the filter.
	*/
	addFilterClause(column, operator, value) {
		this.values.push([this.removeType(column), `${operator}.${value}`]);
	}
	/**
	* Adds an 'in' clause to the values array.
	* @param column The column to apply the 'in' clause to.
	* @param values The values for the 'in' clause.
	*/
	addInClause(column, values) {
		const cleanedValues = values.map((s) => {
			if (typeof s === "string" && /[,()]/.test(s)) return `"${s}"`;
			else return `${s}`;
		}).join(",");
		this.values.push([this.removeType(column), `in.(${cleanedValues})`]);
	}
	/**
	* Adds a 'contains' clause to the values array.
	* @param column The column to apply the 'contains' clause to.
	* @param value The value for the 'contains' clause.
	*/
	addContainsClause(column, value) {
		if (typeof value === "string") this.values.push([this.removeType(column), `cs.${value}`]);
		else if (Array.isArray(value)) this.values.push([this.removeType(column), `cs.{${value.join(",")}}`]);
		else this.values.push([this.removeType(column), `cs.${JSON.stringify(value)}`]);
	}
	/**
	* Adds a 'textSearch' clause to the values array.
	* @param column The column to apply the 'textSearch' clause to.
	* @param query The query for the 'textSearch' clause.
	* @param config Optional configuration for the 'textSearch' clause.
	* @param type Optional type for the 'textSearch' clause.
	*/
	addTextSearchClause(column, query, { config, type } = {}) {
		let typePart = "";
		if (type === "plain") typePart = "pl";
		else if (type === "phrase") typePart = "ph";
		else if (type === "websearch") typePart = "w";
		const configPart = config === void 0 ? "" : `(${config})`;
		this.values.push([this.removeType(column), `${typePart}fts${configPart}.${query}`]);
	}
	/**
	* Adds a 'not' clause to the values array.
	* @param column The column to apply the 'not' clause to.
	* @param operator The operator for the 'not' clause.
	* @param value The value for the 'not' clause.
	*/
	addNotClause(column, operator, value) {
		this.values.push([column, `not.${operator}.${value}`]);
	}
	/**
	* Adds a 'match' clause to the values array.
	* @param query The query for the 'match' clause.
	*/
	addMatchClause(query) {
		Object.entries(query).forEach(([column, value]) => {
			this.values.push([column, `eq.${value}`]);
		});
	}
	/**
	* Returns the flattened parameters as a string.
	* @returns The flattened parameters as a string.
	*/
	flattenedParams() {
		const mapped = this.values.map(([k, v]) => `${k}.${v}`);
		if (mapped.length === 1) return mapped[0];
		return `and(${mapped.join(",")})`;
	}
	/**
	* Gets flattened parameters from a `SupabaseFilter` and a
	* `SupabaseFilterRPCCall`.
	* @param rpc The `SupabaseFilter` object.
	* @param filter The `SupabaseFilterRPCCall` object.
	* @returns The flattened parameters as a string.
	*/
	static getFlattenedParams(rpc, filter) {
		const proxiedDuplicator = new ProxyParamsDuplicator();
		const proxiedRpc = new Proxy(rpc, proxiedDuplicator.buildProxyHandler());
		filter(proxiedRpc);
		return proxiedDuplicator.flattenedParams();
	}
};
/**
* Converts a `SupabaseMetadata` object into a `StructuredQuery` object.
* The function creates a new `StructuredQuery` object and uses the
* `Operation` and `Comparison` classes to build the query.
*/
function convertObjectFilterToStructuredQuery(objFilter) {
	return new __langchain_core_structured_query.StructuredQuery("", new __langchain_core_structured_query.Operation(__langchain_core_structured_query.Operators.and, Object.entries(objFilter).map(([column, value]) => new __langchain_core_structured_query.Comparison(__langchain_core_structured_query.Comparators.eq, column, value))));
}

//#endregion
exports.ProxyParamsDuplicator = ProxyParamsDuplicator;
exports.convertObjectFilterToStructuredQuery = convertObjectFilterToStructuredQuery;
//# sourceMappingURL=supabase_utils.cjs.map