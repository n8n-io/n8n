const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_prompt = require('./prompt.cjs');
const require_sql = require('./sql.cjs');

//#region src/agents/toolkits/sql/index.ts
var sql_exports = {};
require_rolldown_runtime.__export(sql_exports, {
	SQL_PREFIX: () => require_prompt.SQL_PREFIX,
	SQL_SUFFIX: () => require_prompt.SQL_SUFFIX,
	SqlToolkit: () => require_sql.SqlToolkit,
	createSqlAgent: () => require_sql.createSqlAgent
});

//#endregion
exports.SQL_PREFIX = require_prompt.SQL_PREFIX;
exports.SQL_SUFFIX = require_prompt.SQL_SUFFIX;
exports.SqlToolkit = require_sql.SqlToolkit;
exports.createSqlAgent = require_sql.createSqlAgent;
Object.defineProperty(exports, 'sql_exports', {
  enumerable: true,
  get: function () {
    return sql_exports;
  }
});
//# sourceMappingURL=index.cjs.map