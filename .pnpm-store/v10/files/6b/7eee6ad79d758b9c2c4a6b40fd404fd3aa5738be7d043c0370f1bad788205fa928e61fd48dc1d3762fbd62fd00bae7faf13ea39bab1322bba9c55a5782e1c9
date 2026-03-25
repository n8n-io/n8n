const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_sql_db_prompt = require('./sql_db_prompt.cjs');
const require_sql_utils = require('../../util/sql_utils.cjs');
const require_base = require('../base.cjs');
const require_llm_chain = require('../llm_chain.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_language_models_base = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/base"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/chains/sql_db/sql_db_chain.ts
/**
* Class that represents a SQL database chain in the LangChain framework.
* It extends the BaseChain class and implements the functionality
* specific to a SQL database chain.
*
* @security **Security Notice**
* This chain generates SQL queries for the given database.
* The SQLDatabase class provides a getTableInfo method that can be used
* to get column information as well as sample data from the table.
* To mitigate risk of leaking sensitive data, limit permissions
* to read and scope to the tables that are needed.
* Optionally, use the includesTables or ignoreTables class parameters
* to limit which tables can/cannot be accessed.
*
* @link See https://js.langchain.com/docs/security for more information.
* @example
* ```typescript
* const chain = new SqlDatabaseChain({
*   llm: new OpenAI({ temperature: 0 }),
*   database: new SqlDatabase({ ...config }),
* });
*
* const result = await chain.run("How many tracks are there?");
* ```
*/
var SqlDatabaseChain = class extends require_base.BaseChain {
	static lc_name() {
		return "SqlDatabaseChain";
	}
	llm;
	database;
	prompt = require_sql_db_prompt.DEFAULT_SQL_DATABASE_PROMPT;
	topK = 5;
	inputKey = "query";
	outputKey = "result";
	sqlOutputKey = void 0;
	returnDirect = false;
	constructor(fields) {
		super(fields);
		this.llm = fields.llm;
		this.database = fields.database;
		this.topK = fields.topK ?? this.topK;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.outputKey = fields.outputKey ?? this.outputKey;
		this.sqlOutputKey = fields.sqlOutputKey ?? this.sqlOutputKey;
		this.prompt = fields.prompt ?? require_sql_utils.getPromptTemplateFromDataSource(this.database.appDataSource);
	}
	/** @ignore */
	async _call(values, runManager) {
		const llmChain = new require_llm_chain.LLMChain({
			prompt: this.prompt,
			llm: this.llm,
			outputKey: this.outputKey,
			memory: this.memory
		});
		if (!(this.inputKey in values)) throw new Error(`Question key ${this.inputKey} not found.`);
		const question = values[this.inputKey];
		let inputText = `${question}\nSQLQuery:`;
		const tablesToUse = values.table_names_to_use;
		const tableInfo = await this.database.getTableInfo(tablesToUse);
		const llmInputs = {
			input: inputText,
			top_k: this.topK,
			dialect: this.database.appDataSourceOptions.type,
			table_info: tableInfo,
			stop: ["\nSQLResult:"]
		};
		await this.verifyNumberOfTokens(inputText, tableInfo);
		const sqlCommand = await llmChain.predict(llmInputs, runManager?.getChild("sql_generation"));
		let queryResult = "";
		try {
			queryResult = await this.database.appDataSource.query(sqlCommand);
		} catch (error) {
			console.error(error);
		}
		let finalResult;
		if (this.returnDirect) finalResult = { [this.outputKey]: queryResult };
		else {
			inputText += `${sqlCommand}\nSQLResult: ${JSON.stringify(queryResult)}\nAnswer:`;
			llmInputs.input = inputText;
			finalResult = { [this.outputKey]: await llmChain.predict(llmInputs, runManager?.getChild("result_generation")) };
		}
		if (this.sqlOutputKey != null) finalResult[this.sqlOutputKey] = sqlCommand;
		return finalResult;
	}
	_chainType() {
		return "sql_database_chain";
	}
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		if (this.sqlOutputKey != null) return [this.outputKey, this.sqlOutputKey];
		return [this.outputKey];
	}
	/**
	* Private method that verifies the number of tokens in the input text and
	* table information. It throws an error if the number of tokens exceeds
	* the maximum allowed by the language model.
	* @param inputText The input text.
	* @param tableinfo The table information.
	* @returns A promise that resolves when the verification is complete.
	*/
	async verifyNumberOfTokens(inputText, tableinfo) {
		if (this.llm._llmType() !== "openai") return;
		const llm = this.llm;
		const promptTemplate = this.prompt.template;
		const stringWeSend = `${inputText}${promptTemplate}${tableinfo}`;
		const maxToken = await (0, __langchain_core_language_models_base.calculateMaxTokens)({
			prompt: stringWeSend,
			modelName: llm.model
		});
		if (maxToken < (llm.maxTokens ?? -1)) throw new Error(`The combination of the database structure and your question is too big for the model ${llm.model} which can compute only a max tokens of ${(0, __langchain_core_language_models_base.getModelContextSize)(llm.model)}.
      We suggest you to use the includeTables parameters when creating the SqlDatabase object to select only a subset of the tables. You can also use a model which can handle more tokens.`);
	}
};
const strip = (text) => {
	let newText = text.replace(/\\"/g, "\"").trim();
	if (newText.startsWith("\"") && newText.endsWith("\"")) newText = newText.substring(1, newText.length - 1);
	return newText;
};
const difference = (setA, setB) => new Set([...setA].filter((x) => !setB.has(x)));
/**
* Create a SQL query chain that can create SQL queries for the given database.
* Returns a Runnable.
*
* @param {BaseLanguageModel} llm The language model to use in the chain.
* @param {SqlDatabase} db The database to use in the chain.
* @param {BasePromptTemplate | undefined} prompt The prompt to use in the chain.
* @param {BaseLanguageModel | undefined} k The amount of docs/results to return. Passed through the prompt input value `top_k`.
* @param {SqlDialect} dialect The SQL dialect to use in the chain.
* @returns {Promise<RunnableSequence<Record<string, unknown>, string>>} A runnable sequence representing the chain.
* @example ```typescript
* const datasource = new DataSource({
*   type: "sqlite",
*   database: "../../../../Chinook.db",
* });
* const db = await SqlDatabase.fromDataSourceParams({
*   appDataSource: datasource,
* });
* const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
* const chain = await createSqlQueryChain({
*   llm,
*   db,
*   dialect: "sqlite",
* });
* ```
*/
async function createSqlQueryChain({ llm, db, prompt, k = 5, dialect }) {
	let promptToUse;
	if (prompt) promptToUse = prompt;
	else if (require_sql_db_prompt.SQL_PROMPTS_MAP[dialect]) promptToUse = require_sql_db_prompt.SQL_PROMPTS_MAP[dialect];
	else promptToUse = require_sql_db_prompt.DEFAULT_SQL_DATABASE_PROMPT;
	if (difference(new Set([
		"input",
		"top_k",
		"table_info"
	]), new Set(promptToUse.inputVariables)).size > 0) throw new Error(`Prompt must have input variables: 'input', 'top_k', 'table_info'. Received prompt with input variables: ${promptToUse.inputVariables}. Full prompt:\n\n${promptToUse}`);
	if (promptToUse.inputVariables.includes("dialect")) promptToUse = await promptToUse.partial({ dialect });
	promptToUse = await promptToUse.partial({ top_k: k.toString() });
	const inputs = {
		input: (x) => {
			if ("question" in x) return `${x.question}\nSQLQuery: `;
			throw new Error("Input must include a question property.");
		},
		table_info: async (x) => db.getTableInfo(x.tableNamesToUse)
	};
	return __langchain_core_runnables.RunnableSequence.from([
		__langchain_core_runnables.RunnablePassthrough.assign(inputs),
		(x) => {
			const newInputs = { ...x };
			delete newInputs.question;
			delete newInputs.tableNamesToUse;
			return newInputs;
		},
		promptToUse,
		llm.withConfig({ stop: ["\nSQLResult:"] }),
		new __langchain_core_output_parsers.StringOutputParser(),
		strip
	]);
}

//#endregion
exports.SqlDatabaseChain = SqlDatabaseChain;
exports.createSqlQueryChain = createSqlQueryChain;
//# sourceMappingURL=sql_db_chain.cjs.map