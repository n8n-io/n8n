const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/chains/sql_db/sql_db_prompt.ts
const DEFAULT_SQL_DATABASE_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `Given an input question, first create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer. Unless the user specifies in his question a specific number of examples he wishes to obtain, always limit your query to at most {top_k} results. You can order the results by a relevant column to return the most interesting examples in the database.

Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.

Pay attention to use only the column names that you can see in the schema description. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the tables listed below.

{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_POSTGRES_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `You are a PostgreSQL expert. Given an input question, first create a syntactically correct PostgreSQL query to run, then look at the results of the query and return the answer to the input question.
Unless the user specifies in the question a specific number of examples to obtain, query for at most {top_k} results using the LIMIT clause as per PostgreSQL. You can order the results to return the most informative data in the database.
Never query for all columns from a table. You must query only the columns that are needed to answer the question. Wrap each column name in double quotes (") to denote them as delimited identifiers.
Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the following tables:
{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_SQLITE_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `You are a SQLite expert. Given an input question, first create a syntactically correct SQLite query to run, then look at the results of the query and return the answer to the input question.
Unless the user specifies in the question a specific number of examples to obtain, query for at most {top_k} results using the LIMIT clause as per SQLite. You can order the results to return the most informative data in the database.
Never query for all columns from a table. You must query only the columns that are needed to answer the question. Wrap each column name in double quotes (") to denote them as delimited identifiers.
Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the following tables:
{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_MYSQL_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `You are a MySQL expert. Given an input question, first create a syntactically correct MySQL query to run, then look at the results of the query and return the answer to the input question.
Unless the user specifies in the question a specific number of examples to obtain, query for at most {top_k} results using the LIMIT clause as per MySQL. You can order the results to return the most informative data in the database.
Never query for all columns from a table. You must query only the columns that are needed to answer the question. Wrap each column name in backticks (\`) to denote them as delimited identifiers.
Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the following tables:
{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_MSSQL_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `You are an MS SQL expert. Given an input question, first create a syntactically correct MS SQL query to run, then look at the results of the query and return the answer to the input question.
Unless the user specifies in the question a specific number of examples to obtain, query for at most {top_k} results using the TOP clause as per MS SQL. You can order the results to return the most informative data in the database.
Never query for all columns from a table. You must query only the columns that are needed to answer the question. Wrap each column name in square brackets ([]) to denote them as delimited identifiers.
Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the following tables:
{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_SAP_HANA_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `You are a SAP HANA expert. Given an input question, first create a syntactically correct SAP HANA query to run, then look at the results of the query and return the answer to the input question.
Unless the user specifies in the question a specific number of examples to obtain, query for at most {top_k} results using the LIMIT clause as per SAP HANA. You can order the results to return the most informative data in the database.
Never query for all columns from a table. You must query only the columns that are needed to answer the question. Wrap each column name in double quotes (") to denote them as delimited identifiers.
Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.
Always use a schema name when executing a query.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the following tables:
{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_ORACLE_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: `You are a ORACLE expert. Given an input question, first create a syntactically correct ORACLE query to run, then look at the results of the query and return the answer to the input question.
Unless the user specifies in the question a specific number of examples to obtain, query for at most {top_k} results using the ROWNUM clause as per ORACLE. You can order the results to return the most informative data in the database.
Never query for all columns from a table. You must query only the columns that are needed to answer the question.
Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the following tables:
{table_info}

Question: {input}`,
	inputVariables: [
		"dialect",
		"table_info",
		"input",
		"top_k"
	]
});
const SQL_PROMPTS_MAP = {
	oracle: SQL_ORACLE_PROMPT,
	postgres: SQL_POSTGRES_PROMPT,
	sqlite: SQL_SQLITE_PROMPT,
	mysql: SQL_MYSQL_PROMPT,
	mssql: SQL_MSSQL_PROMPT,
	"sap hana": SQL_SAP_HANA_PROMPT
};

//#endregion
exports.DEFAULT_SQL_DATABASE_PROMPT = DEFAULT_SQL_DATABASE_PROMPT;
exports.SQL_MSSQL_PROMPT = SQL_MSSQL_PROMPT;
exports.SQL_MYSQL_PROMPT = SQL_MYSQL_PROMPT;
exports.SQL_ORACLE_PROMPT = SQL_ORACLE_PROMPT;
exports.SQL_POSTGRES_PROMPT = SQL_POSTGRES_PROMPT;
exports.SQL_PROMPTS_MAP = SQL_PROMPTS_MAP;
exports.SQL_SAP_HANA_PROMPT = SQL_SAP_HANA_PROMPT;
exports.SQL_SQLITE_PROMPT = SQL_SQLITE_PROMPT;
//# sourceMappingURL=sql_db_prompt.cjs.map