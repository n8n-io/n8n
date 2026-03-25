
//#region src/utils/sqlite_where_builder.ts
var SqliteWhereBuilder = class {
	conditions;
	constructor(conditions) {
		this.conditions = conditions;
	}
	buildWhereClause() {
		const sqlParts = [];
		const args = {};
		for (const [column, condition] of Object.entries(this.conditions)) {
			const { operator, value } = condition;
			if (operator === "IN") {
				const placeholders = value.map((_, index) => `:${column}${index}`).join(", ");
				sqlParts.push(`json_extract(metadata, '$.${column}') IN (${placeholders})`);
				const values = value.reduce((previousValue, currentValue, index) => {
					return {
						...previousValue,
						[`${column}${index}`]: currentValue
					};
				}, {});
				Object.assign(args, values);
			} else {
				sqlParts.push(`json_extract(metadata, '$.${column}') ${operator} :${column}`);
				args[column] = value;
			}
		}
		const sql = sqlParts.length ? `${sqlParts.join(" AND ")}` : "";
		return {
			sql,
			args
		};
	}
};

//#endregion
exports.SqliteWhereBuilder = SqliteWhereBuilder;
//# sourceMappingURL=sqlite_where_builder.cjs.map