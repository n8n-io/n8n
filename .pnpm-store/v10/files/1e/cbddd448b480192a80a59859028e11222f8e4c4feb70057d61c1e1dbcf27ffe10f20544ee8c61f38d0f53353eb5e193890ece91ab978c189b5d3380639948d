import { DEFAULT_SQL_DATABASE_PROMPT, SQL_MSSQL_PROMPT, SQL_MYSQL_PROMPT, SQL_ORACLE_PROMPT, SQL_POSTGRES_PROMPT, SQL_SAP_HANA_PROMPT, SQL_SQLITE_PROMPT } from "../chains/sql_db/sql_db_prompt.js";

//#region src/util/sql_utils.ts
const verifyListTablesExistInDatabase = (tablesFromDatabase, listTables, errorPrefixMsg) => {
	const onlyTableNames = tablesFromDatabase.map((table) => table.tableName);
	if (listTables.length > 0) {
		for (const tableName of listTables) if (!onlyTableNames.includes(tableName)) throw new Error(`${errorPrefixMsg} the table ${tableName} was not found in the database`);
	}
};
const verifyIncludeTablesExistInDatabase = (tablesFromDatabase, includeTables) => {
	verifyListTablesExistInDatabase(tablesFromDatabase, includeTables, "Include tables not found in database:");
};
const verifyIgnoreTablesExistInDatabase = (tablesFromDatabase, ignoreTables) => {
	verifyListTablesExistInDatabase(tablesFromDatabase, ignoreTables, "Ignore tables not found in database:");
};
const formatToSqlTable = (rawResultsTableAndColumn) => {
	const sqlTable = [];
	for (const oneResult of rawResultsTableAndColumn) {
		const sqlColumn = {
			columnName: oneResult.column_name,
			dataType: oneResult.data_type,
			isNullable: oneResult.is_nullable === "YES"
		};
		const currentTable = sqlTable.find((oneTable) => oneTable.tableName === oneResult.table_name);
		if (currentTable) currentTable.columns.push(sqlColumn);
		else {
			const newTable = {
				tableName: oneResult.table_name,
				columns: [sqlColumn]
			};
			sqlTable.push(newTable);
		}
	}
	return sqlTable;
};
const getTableAndColumnsName = async (appDataSource) => {
	let sql;
	if (appDataSource.options.type === "postgres") {
		const schema = appDataSource.options?.schema ?? "public";
		sql = `SELECT 
            t.table_name, 
            c.* 
          FROM 
            information_schema.tables t 
              JOIN information_schema.columns c 
                ON t.table_name = c.table_name 
          WHERE 
            t.table_schema = '${schema}' 
              AND c.table_schema = '${schema}' 
          ORDER BY 
            t.table_name,
            c.ordinal_position;`;
		const rep = await appDataSource.query(sql);
		return formatToSqlTable(rep);
	}
	if (appDataSource.options.type === "sqlite" || appDataSource.options.type === "better-sqlite3" || appDataSource.options.type === "sqljs") {
		sql = "SELECT \n   m.name AS table_name,\n   p.name AS column_name,\n   p.type AS data_type,\n   CASE \n      WHEN p.\"notnull\" = 0 THEN 'YES' \n      ELSE 'NO' \n   END AS is_nullable \nFROM \n   sqlite_master m \nJOIN \n   pragma_table_info(m.name) p \nWHERE \n   m.type = 'table' AND \n   m.name NOT LIKE 'sqlite_%';\n";
		const rep = await appDataSource.query(sql);
		return formatToSqlTable(rep);
	}
	if (appDataSource.options.type === "mysql" || appDataSource.options.type === "aurora-mysql") {
		sql = `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${appDataSource.options.database}';`;
		const rep = await appDataSource.query(sql);
		return formatToSqlTable(rep);
	}
	if (appDataSource.options.type === "mssql") {
		const schema = appDataSource.options?.schema;
		const sql$1 = `SELECT
    TABLE_NAME AS table_name,
    COLUMN_NAME AS column_name,
    DATA_TYPE AS data_type,
    IS_NULLABLE AS is_nullable
    FROM INFORMATION_SCHEMA.COLUMNS
    ${schema && `WHERE TABLE_SCHEMA = '${schema}'`} 
ORDER BY TABLE_NAME, ORDINAL_POSITION;`;
		const rep = await appDataSource.query(sql$1);
		return formatToSqlTable(rep);
	}
	if (appDataSource.options.type === "sap") {
		const schema = appDataSource.options?.schema ?? "public";
		sql = `SELECT
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE_NAME AS data_type,
        CASE WHEN IS_NULLABLE='TRUE' THEN 'YES' ELSE 'NO' END AS is_nullable
      FROM TABLE_COLUMNS
      WHERE SCHEMA_NAME='${schema}'`;
		const rep = await appDataSource.query(sql);
		const repLowerCase = [];
		rep.forEach((_rep) => repLowerCase.push({
			table_name: _rep.TABLE_NAME,
			column_name: _rep.COLUMN_NAME,
			data_type: _rep.DATA_TYPE,
			is_nullable: _rep.IS_NULLABLE
		}));
		return formatToSqlTable(repLowerCase);
	}
	if (appDataSource.options.type === "oracle") {
		const schemaName = appDataSource.options.schema;
		const sql$1 = `  
      SELECT
          TABLE_NAME AS "table_name",
          COLUMN_NAME AS "column_name",
          DATA_TYPE AS "data_type",
          NULLABLE AS "is_nullable"
      FROM ALL_TAB_COLS
      WHERE
          OWNER = UPPER('${schemaName}')`;
		const rep = await appDataSource.query(sql$1);
		return formatToSqlTable(rep);
	}
	throw new Error("Database type not implemented yet");
};
const formatSqlResponseToSimpleTableString = (rawResult) => {
	if (!rawResult || !Array.isArray(rawResult) || rawResult.length === 0) return "";
	let globalString = "";
	for (const oneRow of rawResult) globalString += `${Object.values(oneRow).reduce((completeString, columnValue) => `${completeString} ${columnValue}`, "")}\n`;
	return globalString;
};
const generateTableInfoFromTables = async (tables, appDataSource, nbSampleRow, customDescription) => {
	if (!tables) return "";
	let globalString = "";
	for (const currentTable of tables) {
		const tableCustomDescription = customDescription && Object.keys(customDescription).includes(currentTable.tableName) ? `${customDescription[currentTable.tableName]}\n` : "";
		let schema = null;
		if (appDataSource.options.type === "postgres") schema = appDataSource.options?.schema ?? "public";
		else if (appDataSource.options.type === "mssql") schema = appDataSource.options?.schema;
		else if (appDataSource.options.type === "sap") schema = appDataSource.options?.schema ?? appDataSource.options?.username ?? "public";
		else if (appDataSource.options.type === "oracle") schema = appDataSource.options.schema;
		let sqlCreateTableQuery = schema ? `CREATE TABLE "${schema}"."${currentTable.tableName}" (\n` : `CREATE TABLE ${currentTable.tableName} (\n`;
		for (const [key, currentColumn] of currentTable.columns.entries()) {
			if (key > 0) sqlCreateTableQuery += ", ";
			sqlCreateTableQuery += `${currentColumn.columnName} ${currentColumn.dataType} ${currentColumn.isNullable ? "" : "NOT NULL"}`;
		}
		sqlCreateTableQuery += ") \n";
		let sqlSelectInfoQuery;
		if (appDataSource.options.type === "mysql") sqlSelectInfoQuery = `SELECT * FROM \`${currentTable.tableName}\` LIMIT ${nbSampleRow};\n`;
		else if (appDataSource.options.type === "postgres") {
			const schema$1 = appDataSource.options?.schema ?? "public";
			sqlSelectInfoQuery = `SELECT * FROM "${schema$1}"."${currentTable.tableName}" LIMIT ${nbSampleRow};\n`;
		} else if (appDataSource.options.type === "mssql") {
			const schema$1 = appDataSource.options?.schema;
			sqlSelectInfoQuery = schema$1 ? `SELECT TOP ${nbSampleRow} * FROM ${schema$1}.[${currentTable.tableName}];\n` : `SELECT TOP ${nbSampleRow} * FROM [${currentTable.tableName}];\n`;
		} else if (appDataSource.options.type === "sap") {
			const schema$1 = appDataSource.options?.schema ?? appDataSource.options?.username ?? "public";
			sqlSelectInfoQuery = `SELECT * FROM "${schema$1}"."${currentTable.tableName}" LIMIT ${nbSampleRow};\n`;
		} else if (appDataSource.options.type === "oracle") sqlSelectInfoQuery = `SELECT * FROM "${schema}"."${currentTable.tableName}" WHERE ROWNUM <= '${nbSampleRow}'`;
		else sqlSelectInfoQuery = `SELECT * FROM "${currentTable.tableName}" LIMIT ${nbSampleRow};\n`;
		const columnNamesConcatString = `${currentTable.columns.reduce((completeString, column) => `${completeString} ${column.columnName}`, "")}\n`;
		let sample = "";
		try {
			const infoObjectResult = nbSampleRow ? await appDataSource.query(sqlSelectInfoQuery) : null;
			sample = formatSqlResponseToSimpleTableString(infoObjectResult);
		} catch (error) {
			console.log(error);
		}
		globalString = globalString.concat(tableCustomDescription + sqlCreateTableQuery + sqlSelectInfoQuery + columnNamesConcatString + sample);
	}
	return globalString;
};
const getPromptTemplateFromDataSource = (appDataSource) => {
	if (appDataSource.options.type === "postgres") return SQL_POSTGRES_PROMPT;
	if (appDataSource.options.type === "sqlite") return SQL_SQLITE_PROMPT;
	if (appDataSource.options.type === "mysql") return SQL_MYSQL_PROMPT;
	if (appDataSource.options.type === "mssql") return SQL_MSSQL_PROMPT;
	if (appDataSource.options.type === "sap") return SQL_SAP_HANA_PROMPT;
	if (appDataSource.options.type === "oracle") return SQL_ORACLE_PROMPT;
	return DEFAULT_SQL_DATABASE_PROMPT;
};

//#endregion
export { generateTableInfoFromTables, getPromptTemplateFromDataSource, getTableAndColumnsName, verifyIgnoreTablesExistInDatabase, verifyIncludeTablesExistInDatabase, verifyListTablesExistInDatabase };
//# sourceMappingURL=sql_utils.js.map