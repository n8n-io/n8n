//#region src/structured_query/ir.ts
const Operators = {
	and: "and",
	or: "or",
	not: "not"
};
const Comparators = {
	eq: "eq",
	ne: "ne",
	lt: "lt",
	gt: "gt",
	lte: "lte",
	gte: "gte"
};
/**
* Abstract class for visiting expressions. Subclasses must implement
* visitOperation, visitComparison, and visitStructuredQuery methods.
*/
var Visitor = class {};
/**
* Abstract class representing an expression. Subclasses must implement
* the exprName property and the accept method.
*/
var Expression = class {
	accept(visitor) {
		if (this.exprName === "Operation") return visitor.visitOperation(this);
		else if (this.exprName === "Comparison") return visitor.visitComparison(this);
		else if (this.exprName === "StructuredQuery") return visitor.visitStructuredQuery(this);
		else throw new Error("Unknown Expression type");
	}
};
/**
* Abstract class representing a filter directive. It extends the
* Expression class.
*/
var FilterDirective = class extends Expression {};
/**
* Class representing a comparison filter directive. It extends the
* FilterDirective class.
*/
var Comparison = class extends FilterDirective {
	exprName = "Comparison";
	constructor(comparator, attribute, value) {
		super();
		this.comparator = comparator;
		this.attribute = attribute;
		this.value = value;
	}
};
/**
* Class representing an operation filter directive. It extends the
* FilterDirective class.
*/
var Operation = class extends FilterDirective {
	exprName = "Operation";
	constructor(operator, args) {
		super();
		this.operator = operator;
		this.args = args;
	}
};
/**
* Class representing a structured query expression. It extends the
* Expression class.
*/
var StructuredQuery = class extends Expression {
	exprName = "StructuredQuery";
	constructor(query, filter) {
		super();
		this.query = query;
		this.filter = filter;
	}
};
//#endregion
export { Comparators, Comparison, Expression, FilterDirective, Operation, Operators, StructuredQuery, Visitor };

//# sourceMappingURL=ir.js.map