const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const node_path = require_rolldown_runtime.__toESM(require("node:path"));
const node_os = require_rolldown_runtime.__toESM(require("node:os"));
const cassandra_driver = require_rolldown_runtime.__toESM(require("cassandra-driver"));
const node_fs_promises = require_rolldown_runtime.__toESM(require("node:fs/promises"));

//#region src/utils/cassandra.ts
var cassandra_exports = {};
require_rolldown_runtime.__export(cassandra_exports, {
	CassandraClientFactory: () => CassandraClientFactory,
	CassandraTable: () => CassandraTable
});
/**
* Provides a centralized and streamlined factory for creating and configuring instances of the Cassandra client.
* This class abstracts the complexities involved in instantiating and configuring Cassandra client instances,
* enabling straightforward integration with Cassandra databases. It supports customization through various
* configuration options, allowing for the creation of clients tailored to specific needs, such as connecting
* to different clusters or utilizing specialized authentication and connection options.
*
* Key Features:
* - Simplifies the Cassandra client creation process with method-based configurations.
* - Supports customization for connecting to various Cassandra environments, including cloud-based services like Astra.
* - Ensures consistent and optimal client configuration, incorporating best practices.
*
* Example Usage (Apache Cassandra®):
* ```
* const cassandraArgs = {
*   contactPoints: ['h1', 'h2'],
*   localDataCenter: 'datacenter1',
*   credentials: {
*     username: <...> as string,
*     password: <...> as string,
*   },
* };
* const cassandraClient = CassandraClientFactory.getClient(cassandraArgs);
* ```
*
* Example Usage (DataStax AstraDB):
* ```
* const astraArgs = {
*   serviceProviderArgs: {
*     astra: {
*       token: <...> as string,
*       endpoint: <...> as string,
*     },
*   },
* };
* const cassandraClient = CassandraClientFactory.getClient(astraArgs);
* ``` *
*/
var CassandraClientFactory = class CassandraClientFactory {
	/**
	* Asynchronously obtains a configured Cassandra client based on the provided arguments.
	* This method processes the given CassandraClientArgs to produce a configured Client instance
	* from the cassandra-driver, suitable for interacting with Cassandra databases.
	*
	* @param args The configuration arguments for the Cassandra client, including any service provider-specific options.
	* @returns A Promise resolving to a Client object configured according to the specified arguments.
	*/
	static async getClient(args) {
		const modifiedArgs = await this.processArgs(args);
		return new cassandra_driver.Client(modifiedArgs);
	}
	/**
	* Processes the provided CassandraClientArgs for creating a Cassandra client.
	*
	* @param args The arguments for creating the Cassandra client, including service provider configurations.
	* @returns A Promise resolving to the processed CassandraClientArgs, ready for client initialization.
	* @throws Error if the configuration is unsupported, specifically if serviceProviderArgs are provided
	* but do not include valid configurations for Astra.
	*/
	static processArgs(args) {
		if (!args.serviceProviderArgs) return Promise.resolve(args);
		if (args.serviceProviderArgs && args.serviceProviderArgs.astra) return CassandraClientFactory.processAstraArgs(args);
		throw new Error("Unsupported configuration for Cassandra client.");
	}
	/**
	* Asynchronously processes and validates the Astra service provider arguments within the
	* Cassandra client configuration. This includes ensuring the presence of necessary Astra
	* configurations like endpoint or datacenterID, setting up default secure connect bundle paths,
	* and initializing default credentials if not provided.
	*
	* @param args The arguments for creating the Cassandra client with Astra configurations.
	* @returns A Promise resolving to the modified CassandraClientArgs with Astra configurations processed.
	* @throws Error if Astra configuration is incomplete or if both endpoint and datacenterID are missing.
	*/
	static async processAstraArgs(args) {
		const astraArgs = args.serviceProviderArgs?.astra;
		if (!astraArgs) throw new Error("Astra configuration is not provided in args.");
		if (!astraArgs.endpoint && !astraArgs.datacenterID) throw new Error("Astra endpoint or datacenterID must be provided in args.");
		if (astraArgs.endpoint) {
			const endpoint = new URL(astraArgs.endpoint.toString());
			const hostnameParts = endpoint.hostname.split("-");
			const domainSuffix = ".apps.astra.datastax.com";
			if (hostnameParts[hostnameParts.length - 1].endsWith(domainSuffix)) {
				astraArgs.datacenterID = astraArgs.datacenterID || hostnameParts.slice(0, 5).join("-");
				const fullRegionName = hostnameParts.slice(5).join("-");
				astraArgs.regionName = astraArgs.regionName || fullRegionName.replace(domainSuffix, "");
			}
		}
		const modifiedArgs = {
			...args,
			cloud: args.cloud || { secureConnectBundle: "" }
		};
		if (!modifiedArgs.cloud.secureConnectBundle) modifiedArgs.cloud.secureConnectBundle = await CassandraClientFactory.getAstraDefaultBundleLocation(astraArgs);
		await CassandraClientFactory.setAstraBundle(astraArgs, modifiedArgs.cloud.secureConnectBundle);
		modifiedArgs.credentials = modifiedArgs.credentials || {
			username: "token",
			password: astraArgs.token
		};
		return modifiedArgs;
	}
	/**
	* Get the default bundle filesystem location for the Astra Secure Connect Bundle.
	*
	* @param astraArgs The Astra service provider arguments.
	* @returns The default bundle file path.
	*/
	static async getAstraDefaultBundleLocation(astraArgs) {
		const dir = node_path.default.join(node_os.default.tmpdir(), "cassandra-astra");
		await node_fs_promises.default.mkdir(dir, { recursive: true });
		let scbFileName = `astra-secure-connect-${astraArgs.datacenterID}`;
		if (astraArgs.regionName) scbFileName += `-${astraArgs.regionName}`;
		scbFileName += ".zip";
		const scbPath = node_path.default.join(dir, scbFileName);
		return scbPath;
	}
	/**
	* Ensures the Astra secure connect bundle specified by the path exists and is up to date.
	* If the file does not exist or is deemed outdated (more than 360 days old), a new secure
	* connect bundle is downloaded and saved to the specified path.
	*
	* @param astraArgs The Astra service provider arguments, including the datacenterID and optional regionName.
	* @param scbPath The path (or URL) where the secure connect bundle is expected to be located.
	* @returns A Promise that resolves when the secure connect bundle is verified or updated successfully.
	* @throws Error if the bundle cannot be retrieved or saved to the specified path.
	*/
	static async setAstraBundle(astraArgs, scbPath) {
		if (typeof scbPath === "string") try {
			const stats = await node_fs_promises.default.stat(scbPath);
			const fileAgeInDays = (Date.now() - stats.mtime.getTime()) / (1e3 * 60 * 60 * 24);
			if (fileAgeInDays > 360) await CassandraClientFactory.downloadAstraSecureConnectBundle(astraArgs, scbPath);
		} catch (error) {
			if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") await CassandraClientFactory.downloadAstraSecureConnectBundle(astraArgs, scbPath);
			else throw error;
		}
	}
	/**
	* Downloads the Astra secure connect bundle based on the provided Astra service provider arguments
	* and saves it to the specified file path. If a regionName is specified and matches one of the
	* available bundles, the regional bundle is preferred. Otherwise, the first available bundle URL is used.
	*
	* @param astraArgs - The Astra service provider arguments, including datacenterID and optional regionName.
	* @param scbPath - The file path where the secure connect bundle should be saved.
	* @returns A promise that resolves once the secure connect bundle is successfully downloaded and saved.
	* @throws Error if there's an issue retrieving the bundle URLs or saving the bundle to the file path.
	*/
	static async downloadAstraSecureConnectBundle(astraArgs, scbPath) {
		if (!astraArgs.datacenterID) throw new Error("Astra datacenterID is not provided in args.");
		const bundleURLTemplate = astraArgs.bundleUrlTemplate ? astraArgs.bundleUrlTemplate : "https://api.astra.datastax.com/v2/databases/{database_id}/secureBundleURL?all=true";
		const url = bundleURLTemplate.replace("{database_id}", astraArgs.datacenterID);
		const postResponse = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${astraArgs.token}`,
				"Content-Type": "application/json"
			}
		});
		if (!postResponse.ok) throw new Error(`HTTP error! Status: ${postResponse.status}`);
		const postData = await postResponse.json();
		if (!postData || !Array.isArray(postData) || postData.length === 0) throw new Error("Failed to get secure bundle URLs.");
		let { downloadURL } = postData[0];
		if (astraArgs.regionName) {
			const regionalBundle = postData.find((bundle) => bundle.region === astraArgs.regionName);
			if (regionalBundle) downloadURL = regionalBundle.downloadURL;
		}
		const getResponse = await fetch(downloadURL);
		if (!getResponse.ok) throw new Error(`HTTP error! Status: ${getResponse.status}`);
		const bundleData = await getResponse.arrayBuffer();
		await node_fs_promises.default.writeFile(scbPath, Buffer.from(bundleData));
	}
};
/**
* Represents a Cassandra table, encapsulating functionality for schema definition, data manipulation, and querying.
* This class provides a high-level abstraction over Cassandra's table operations, including creating tables,
* inserting, updating, selecting, and deleting records. It leverages the CassandraClient for executing
* operations and supports asynchronous interactions with the database.
*
* Key features include:
* - Table and keyspace management: Allows for specifying table schema, including primary keys, columns,
*   and indices, and handles the creation of these elements within the specified keyspace.
* - Data manipulation: Offers methods for inserting (upserting) and deleting data in batches or individually,
*   with support for asynchronous operation and concurrency control.
* - Querying: Enables selecting data with flexible filtering, sorting, and pagination options.
*
* The class is designed to be instantiated with a set of configuration arguments (`CassandraTableArgs`)
* that define the table's structure and operational parameters, providing a streamlined interface for
* interacting with Cassandra tables in a structured and efficient manner.
*
* Usage Example:
* ```typescript
* const tableArgs: CassandraTableArgs = {
*   table: 'my_table',
*   keyspace: 'my_keyspace',
*   primaryKey: [{ name: 'id', type: 'uuid', partition: true }],
*   nonKeyColumns: [{ name: 'data', type: 'text' }],
* };
* const cassandraClient = new CassandraClient(clientConfig);
* const myTable = new CassandraTable(tableArgs, cassandraClient);
* ```
*
* This class simplifies Cassandra database interactions, making it easier to perform robust data operations
* while maintaining clear separation of concerns and promoting code reusability.
*/
var CassandraTable = class {
	client;
	keyspace;
	table;
	primaryKey;
	nonKeyColumns;
	indices;
	withClause;
	batchSize;
	initializationPromise = null;
	asyncCaller;
	constructorArgs;
	/**
	* Initializes a new instance of the CassandraTable class with specified configuration.
	* This includes setting up the table schema (primary key, columns, and indices) and
	* preparing the environment for executing queries against a Cassandra database.
	*
	* @param args Configuration arguments defining the table schema and operational settings.
	* @param client Optional. A Cassandra Client instance. If not provided, one will be created
	*               using the configuration specified in `args`.
	*/
	constructor(args, client) {
		const { keyspace, table, primaryKey, nonKeyColumns, withClause = "", indices = [], batchSize = 1, maxConcurrency = 25 } = args;
		this.constructorArgs = {
			withClause,
			indices,
			batchSize,
			maxConcurrency,
			...args
		};
		this.asyncCaller = new __langchain_core_utils_async_caller.AsyncCaller(this.constructorArgs);
		this.keyspace = keyspace;
		this.table = table;
		this.primaryKey = Array.isArray(primaryKey) ? primaryKey : [primaryKey];
		this.nonKeyColumns = Array.isArray(nonKeyColumns) ? nonKeyColumns : [nonKeyColumns];
		this.withClause = withClause.trim().replace(/^with\s*/i, "");
		this.indices = indices;
		this.batchSize = batchSize;
		this.initialize(client).catch((error) => {
			console.error("Error during CassandraStore initialization:", error);
		});
	}
	/**
	* Executes a SELECT query on the Cassandra table with optional filtering, ordering, and pagination.
	* Allows for specifying columns to return, filter conditions, sort order, and limits on the number of results.
	*
	* @param columns Optional. Columns to include in the result set. If omitted, all columns are selected.
	* @param filter Optional. Conditions to apply to the query for filtering results.
	* @param orderBy Optional. Criteria to sort the result set.
	* @param limit Optional. Maximum number of records to return.
	* @param allowFiltering Optional. Enables ALLOW FILTERING option for queries that cannot be executed directly due to Cassandra's query restrictions.
	* @param fetchSize Optional. The number of rows to fetch per page (for pagination).
	* @param pagingState Optional. The paging state from a previous query execution, used for pagination.
	* @returns A Promise resolving to the query result set.
	*/
	async select(columns, filter, orderBy, limit, allowFiltering, fetchSize, pagingState) {
		await this.initialize();
		const filters = this.asFilters(filter);
		const queryColumns = columns || [...this.primaryKey, ...this.nonKeyColumns];
		const queryStr = this.buildSearchQuery(queryColumns, filters, orderBy, limit, allowFiltering);
		const queryParams = [];
		queryColumns.forEach(({ binds }) => {
			if (binds !== void 0 && binds !== null) if (Array.isArray(binds)) queryParams.push(...binds);
			else queryParams.push(binds);
		});
		if (filters) filters.forEach(({ value }) => {
			if (Array.isArray(value)) queryParams.push(...value);
			else queryParams.push(value);
		});
		if (orderBy) orderBy.forEach(({ value }) => {
			if (value !== void 0 && value !== null) if (Array.isArray(value)) queryParams.push(...value);
			else queryParams.push(value);
		});
		if (limit) queryParams.push(limit);
		const execOptions = {
			prepare: true,
			fetchSize: fetchSize || void 0,
			pageState: pagingState || void 0
		};
		return this.client.execute(queryStr, queryParams, execOptions);
	}
	/**
	* Validates the correspondence between provided values and specified columns for database operations.
	* This method checks if the number of values matches the number of specified columns, ensuring
	* data integrity before executing insert or update operations. It also defaults to using all table columns
	* if specific columns are not provided. Throws an error if the validation fails.
	*
	* @param values An array of values or an array of arrays of values to be inserted or updated. Each
	*               inner array represents a set of values corresponding to one row in the table.
	* @param columns Optional. An array of `Column` objects specifying the columns to be used for the operation.
	*                If not provided, the method defaults to using both primary key and non-key columns of the table.
	* @returns An array of `Column` objects that have been validated for the operation.
	* @throws Error if the number of provided values does not match the number of specified columns.
	* @private
	*/
	_columnCheck(values, columns) {
		const cols = columns || [...this.primaryKey, ...this.nonKeyColumns];
		if (!cols || cols.length === 0) throw new Error("Columns must be specified.");
		const firstValueSet = Array.isArray(values[0]) ? values[0] : values;
		if (firstValueSet && firstValueSet.length !== cols.length) throw new Error("The number of values must match the number of columns.");
		return cols;
	}
	/**
	* Inserts or updates records in the Cassandra table in batches, managing concurrency and batching size.
	* This method organizes the provided values into batches and uses `_upsert` to perform the database operations.
	*
	* @param values An array of arrays, where each inner array contains values for a single record.
	* @param columns Optional. Columns to be included in the insert/update operations. Defaults to all table columns.
	* @param batchSize Optional. The size of each batch for the operation. Defaults to the class's batchSize property.
	* @returns A Promise that resolves once all records have been upserted.
	*/
	async upsert(values, columns, batchSize = this.batchSize) {
		if (values.length === 0) return;
		await this.initialize();
		const upsertColumns = this._columnCheck(values, columns);
		const upsertPromises = [];
		let currentBatch = [];
		for (let i = 0; i <= values.length; i += 1) {
			if (i < values.length) currentBatch.push(values[i]);
			if (currentBatch.length >= batchSize || i === values.length) {
				if (currentBatch.length > 0) {
					const batch = [...currentBatch];
					upsertPromises.push(this.asyncCaller.call(() => this._upsert(batch, upsertColumns)));
					currentBatch = [];
				}
			}
		}
		await Promise.all(upsertPromises);
	}
	/**
	* Deletes rows from the Cassandra table that match the specified WHERE clause conditions.
	*
	* @param whereClause Defines the conditions that must be met for rows to be deleted. Can be a single filter,
	* an array of filters, or a key-value map translating to filter conditions.
	* @returns A Promise that resolves when the DELETE operation has completed.
	*/
	async delete(whereClause) {
		await this.initialize();
		const filters = this.asFilters(whereClause);
		const queryStr = `DELETE FROM ${this.keyspace}.${this.table} ${this.buildWhereClause(filters)}`;
		const queryParams = filters.flatMap(({ value }) => {
			if (Array.isArray(value)) return value;
			else return [value];
		});
		return this.client.execute(queryStr, queryParams, { prepare: true });
	}
	/**
	* Retrieves the Node.js Cassandra client instance associated with this table.
	* This method ensures that the client is initialized and ready for use, returning the
	* Cassandra client object that can be used for database operations directly.
	* It initializes the client if it has not already been initialized.
	*
	* @returns A Promise that resolves to the Cassandra Client instance used by this table for database interactions.
	*/
	async getClient() {
		await this.initialize();
		return this.client;
	}
	/**
	* Constructs the PRIMARY KEY clause for a Cassandra CREATE TABLE statement based on the specified columns.
	* This method organizes the provided columns into partition and clustering keys, forming the necessary syntax
	* for the PRIMARY KEY clause in a Cassandra table schema definition. It supports complex primary key structures,
	* including composite partition keys and clustering columns.
	*
	* - Partition columns are those marked with the `partition` property. If multiple partition columns are provided,
	*   they are grouped together in parentheses as a composite partition key.
	* - Clustering columns are those not marked as partition keys and are listed after the partition key(s).
	*   They determine the sort order of rows within a partition.
	*
	* The method ensures the correct syntax for primary keys, handling both simple and composite key structures,
	* and throws an error if no partition or clustering columns are provided.
	*
	* @param columns An array of `Column` objects representing the columns to be included in the primary key.
	*                Each column must have a `name` and may have a `partition` boolean indicating if it is part
	*                of the partition key.
	* @returns The PRIMARY KEY clause as a string, ready to be included in a CREATE TABLE statement.
	* @throws Error if no columns are marked as partition keys or if no columns are provided.
	* @private
	*/
	buildPrimaryKey(columns) {
		const partitionColumns = columns.filter((col) => col.partition).map((col) => col.name).join(", ");
		const clusteringColumns = columns.filter((col) => !col.partition).map((col) => col.name).join(", ");
		let primaryKey = "";
		if (partitionColumns && clusteringColumns) primaryKey = `PRIMARY KEY ((${partitionColumns}), ${clusteringColumns})`;
		else if (partitionColumns) primaryKey = `PRIMARY KEY (${partitionColumns})`;
		else if (clusteringColumns) primaryKey = `PRIMARY KEY (${clusteringColumns})`;
		else throw new Error("No partition or clustering columns provided for PRIMARY KEY definition.");
		return primaryKey;
	}
	/**
	* Type guard that checks if a given object conforms to the `Filter` interface.
	* This method is used to determine if an object can be treated as a filter for Cassandra
	* query conditions. It evaluates the object's structure, specifically looking for `name`
	* and `value` properties, which are essential for defining a filter in Cassandra queries.
	*
	* @param obj The object to be evaluated.
	* @returns A boolean value indicating whether the object is a `Filter`. Returns `true`
	*          if the object has both `name` and `value` properties, signifying it meets the
	*          criteria for being used as a filter in database operations; otherwise, returns `false`.
	* @private
	*/
	isFilter(obj) {
		return typeof obj === "object" && obj !== null && "name" in obj && "value" in obj;
	}
	/**
	* Helper to convert Record<string,unknown> to a Filter[]
	* @param record: a key-value Record collection
	* @returns Record as a Filter[]
	*/
	convertToFilters(record) {
		return Object.entries(record).map(([name, value]) => ({
			name,
			value,
			operator: "="
		}));
	}
	/**
	* Converts a key-value pair record into an array of `Filter` objects suitable for Cassandra query conditions.
	* This utility method allows for a more flexible specification of filter conditions by transforming
	* a simple object notation into the structured format expected by Cassandra query builders. Each key-value
	* pair in the record is interpreted as a filter condition, where the key represents the column name and
	* the value represents the filtering criterion.
	*
	* The method assumes a default equality operator for each filter. It is particularly useful for
	* converting concise filter specifications into the detailed format required for constructing CQL queries.
	*
	* @param record A key-value pair object where each entry represents a filter condition, with the key
	*               as the column name and the value as the filter value. The value can be a single value
	*               or an array to support IN queries with multiple criteria.
	* @returns An array of `Filter` objects, each representing a condition extracted from the input record.
	*          The array can be directly used in constructing query WHERE clauses.
	* @private
	*/
	asFilters(record) {
		if (!record) return [];
		if (Array.isArray(record)) return record.flatMap((item) => {
			if (this.isFilter(item)) return [item];
			else return this.convertToFilters(item);
		});
		if (this.isFilter(record)) return [record];
		return this.convertToFilters(record);
	}
	/**
	* Constructs the WHERE clause of a CQL query from an array of `Filter` objects.
	* This method generates the conditional part of a Cassandra Query Language (CQL) statement,
	* allowing for complex query constructions based on provided filters. Each filter in the array
	* translates into a condition within the WHERE clause, with support for various comparison operators.
	*
	* The method handles the assembly of these conditions into a syntactically correct CQL WHERE clause,
	* including the appropriate use of placeholders (?) for parameter binding in prepared statements.
	* It supports a range of operators, defaulting to "=" (equality) if an operator is not explicitly specified
	* in a filter. Filters with multiple values (e.g., for IN conditions) are also correctly formatted.
	*
	* @param filters Optional. An array of `Filter` objects representing the conditions to apply in the WHERE clause.
	*                Each `Filter` includes a column name (`name`), a value or array of values (`value`), and optionally,
	*                an operator (`operator`). If no filters are provided, an empty string is returned.
	* @returns The constructed WHERE clause as a string, ready to be appended to a CQL query. If no filters
	*          are provided, returns an empty string, indicating no WHERE clause should be applied.
	* @private
	*/
	buildWhereClause(filters) {
		if (!filters || filters.length === 0) return "";
		const whereConditions = filters.map(({ name, operator = "=", value }) => {
			const normalizedOperator = operator.toUpperCase();
			const valueArray = Array.isArray(value) ? value : [value];
			if (valueArray.length === 1 && normalizedOperator !== "IN") return `${name} ${operator} ?`;
			else {
				const quotesPattern = /'[^']*'|"[^"]*"/g;
				const modifiedName = name.replace(quotesPattern, "");
				const nameQuestionMarkCount = (modifiedName.match(/\?/g) || []).length;
				if (valueArray.length < nameQuestionMarkCount + 1) throw new Error("Insufficient bind variables for the filter condition.");
				const effectiveLength = Math.max(valueArray.length - nameQuestionMarkCount, 1);
				const placeholders = new Array(effectiveLength).fill("?").join(", ");
				if (normalizedOperator === "IN") return `${name} ${operator} (${placeholders})`;
				else return `${name} ${operator} ${placeholders}`;
			}
		});
		return `WHERE ${whereConditions.join(" AND ")}`;
	}
	/**
	* Generates the ORDER BY clause for a CQL query from an array of `Filter` objects.
	* This method forms the sorting part of a Cassandra Query Language (CQL) statement,
	* allowing for detailed control over the order of results based on specified column names
	* and directions. Each filter in the array represents a column and direction to sort by.
	*
	* It is important to note that unlike the traditional use of `Filter` objects for filtering,
	* in this context, they are repurposed to specify sorting criteria. The `name` field indicates
	* the column to sort by, and the `operator` field is used to specify the sort direction (`ASC` or `DESC`).
	* The `value` field is not utilized for constructing the ORDER BY clause and can be omitted.
	*
	* @param filters Optional. An array of `Filter` objects where each object specifies a column and
	*                direction for sorting. The `name` field of each filter represents the column name,
	*                and the `operator` field should contain the sorting direction (`ASC` or `DESC`).
	*                If no filters are provided, the method returns an empty string.
	* @returns The constructed ORDER BY clause as a string, suitable for appending to a CQL query.
	*          If no sorting criteria are provided, returns an empty string, indicating no ORDER BY
	*          clause should be applied to the query.
	* @private
	*/
	buildOrderByClause(filters) {
		if (!filters || filters.length === 0) return "";
		const orderBy = filters.map(({ name, operator, value }) => {
			if (value) return `${name} ${operator} ?`;
			else if (operator) return `${name} ${operator}`;
			else return name;
		});
		return `ORDER BY ${orderBy.join(" , ")}`;
	}
	/**
	* Constructs a CQL search query string for retrieving records from a Cassandra table.
	* This method combines various query components, including selected columns, filters, sorting criteria,
	* and pagination options, to form a complete and executable CQL query. It allows for fine-grained control
	* over the query construction process, enabling the inclusion of conditional filtering, ordering of results,
	* and limiting the number of returned records, with an optional allowance for filtering.
	*
	* The method meticulously constructs the SELECT part of the query using the provided columns, applies
	* the WHERE clause based on given filters, sorts the result set according to the orderBy criteria, and
	* restricts the number of results with the limit parameter. Additionally, it can enable the ALLOW FILTERING
	* option for queries that require server-side filtering beyond the capabilities of primary and secondary indexes.
	*
	* @param queryColumns An array of `Column` objects specifying which columns to include in the result set.
	*                     Each column can also have an alias defined for use in the query's result set.
	* @param filters Optional. An array of `Filter` objects to apply as conditions in the WHERE clause of the query.
	* @param orderBy Optional. An array of `Filter` objects specifying the ordering of the returned records.
	*                Although repurposed as `Filter` objects, here they define the column names and the sort direction (ASC/DESC).
	* @param limit Optional. A numeric value specifying the maximum number of records the query should return.
	* @param allowFiltering Optional. A boolean flag that, when true, includes the ALLOW FILTERING clause in the query,
	*                        permitting Cassandra to execute queries that might not be efficiently indexable.
	* @returns A string representing the fully constructed CQL search query, ready for execution against a Cassandra table.
	* @private
	*/
	buildSearchQuery(queryColumns, filters, orderBy, limit, allowFiltering) {
		const selectColumns = queryColumns.map((col) => col.alias ? `${col.name} AS ${col.alias}` : col.name).join(", ");
		const whereClause = filters ? this.buildWhereClause(filters) : "";
		const orderByClause = orderBy ? this.buildOrderByClause(orderBy) : "";
		const limitClause = limit ? "LIMIT ?" : "";
		const allowFilteringClause = allowFiltering ? "ALLOW FILTERING" : "";
		const cqlQuery = `SELECT ${selectColumns} FROM ${this.keyspace}.${this.table} ${whereClause} ${orderByClause} ${limitClause} ${allowFilteringClause}`;
		return cqlQuery;
	}
	/**
	* Initializes the CassandraTable instance, ensuring it is ready for database operations.
	* This method is responsible for setting up the internal Cassandra client, creating the table
	* if it does not already exist, and preparing any indices as specified in the table configuration.
	* The initialization process is performed only once; subsequent calls return the result of the
	* initial setup. If a Cassandra `Client` instance is provided, it is used directly; otherwise,
	* a new client is created based on the table's configuration.
	*
	* The initialization includes:
	* - Assigning the provided or newly created Cassandra client to the internal client property.
	* - Executing a CQL statement to create the table with the specified columns, primary key, and
	*   any additional options provided in the `withClause`.
	* - Creating any custom indices as defined in the table's indices array.
	*
	* This method leverages the asynchronous nature of JavaScript to perform potentially time-consuming
	* tasks, such as network requests to the Cassandra cluster, without blocking the execution thread.
	*
	* @param client Optional. A `Client` instance from the cassandra-driver package. If provided, this client
	*               is used for all database operations performed by the instance. Otherwise, a new client
	*               is instantiated based on the configuration provided at the CassandraTable instance creation.
	* @returns A Promise that resolves once the initialization process has completed, indicating the instance
	*          is ready for database operations. If initialization has already occurred, the method returns
	*          immediately without repeating the setup process.
	* @private
	*/
	async initialize(client) {
		if (this.initializationPromise) return this.initializationPromise;
		this.initializationPromise = this.performInitialization(client).then(() => {}).catch((error) => {
			this.initializationPromise = null;
			throw error;
		});
		return this.initializationPromise;
	}
	/**
	* Performs the actual initialization tasks for the CassandraTable instance.
	* This method is invoked by the `initialize` method to carry out the concrete steps necessary for preparing
	* the CassandraTable instance for operation. It includes establishing the Cassandra client (either by utilizing
	* an existing client passed as a parameter or by creating a new one based on the instance's configuration),
	* and executing the required CQL statements to create the table and its indices according to the specifications
	* provided during the instance's creation.
	*
	* The process encapsulates:
	* 1. Assigning the provided Cassandra `Client` to the instance, or creating a new one if none is provided.
	* 2. Creating the table with the specified schema if it does not exist. This involves constructing a CQL
	*    `CREATE TABLE` statement that includes columns, primary key configuration, and any specified table options.
	* 3. Creating any indices specified in the instance's configuration using CQL `CREATE INDEX` statements, allowing
	*    for custom index options if provided.
	*
	* This method ensures that the table and its environment are correctly set up for subsequent database operations,
	* encapsulating initialization logic to maintain separation of concerns and improve code readability and maintainability.
	*
	* @param client Optional. An instance of the Cassandra `Client` from the cassandra-driver package. If provided,
	*               this client is used for all interactions with the Cassandra database. If not provided, a new client
	*               is instantiated based on the provided configuration during the CassandraTable instance creation.
	* @returns A Promise that resolves when all initialization steps have been successfully completed, indicating
	*          that the CassandraTable instance is fully prepared for database operations.
	* @private
	*/
	async performInitialization(client) {
		if (client) this.client = client;
		else this.client = await CassandraClientFactory.getClient(this.constructorArgs);
		const allColumns = [...this.primaryKey, ...this.nonKeyColumns];
		let cql = "";
		cql = `CREATE TABLE IF NOT EXISTS ${this.keyspace}.${this.table} (
      ${allColumns.length > 0 ? `${allColumns.map((col) => `${col.name} ${col.type}`).join(", ")}` : ""}
      , ${this.buildPrimaryKey(this.primaryKey)}
  ) ${this.withClause ? `WITH ${this.withClause}` : ""};`;
		await this.client.execute(cql);
		const _formatOptions = (options) => {
			if (!options) return "";
			let formattedOptions = options.trim();
			if (!formattedOptions.toLowerCase().startsWith("with options =")) formattedOptions = `WITH OPTIONS =  ${formattedOptions}`;
			return formattedOptions;
		};
		for await (const { name, value, options } of this.indices) {
			const optionsClause = _formatOptions(options);
			cql = `CREATE CUSTOM INDEX IF NOT EXISTS idx_${this.table}_${name}
               ON ${this.keyspace}.${this.table} ${value} USING 'StorageAttachedIndex' ${optionsClause};`;
			await this.client.execute(cql);
		}
	}
	/**
	* Performs the actual insert or update operation (upsert) on the Cassandra table for a batch of values.
	* This method constructs and executes a CQL INSERT statement for each value in the batch.
	*
	* @param values An array of arrays, where each inner array contains values corresponding to the specified columns.
	* @param columns Optional. Specifies the columns into which the values should be inserted. Defaults to all columns.
	* @returns A Promise that resolves when the operation has completed.
	* @private
	*/
	async _upsert(values, columns) {
		if (values.length === 0) return;
		await this.initialize();
		const upsertColumns = this._columnCheck(values, columns);
		const upsertColumnNames = upsertColumns.map((col) => col.name);
		const columnCount = upsertColumnNames.length;
		const bindPlaceholders = Array(columnCount).fill("?").join(", ");
		const upsertString = `INSERT INTO ${this.keyspace}.${this.table} (${upsertColumnNames.join(", ")}) VALUES (${bindPlaceholders})`;
		const queries = [];
		for (let i = 0; i < values.length; i += 1) {
			const query = {
				query: upsertString,
				params: values[i]
			};
			queries.push(query);
		}
		if (queries.length === 1) await this.client.execute(queries[0].query, queries[0].params, { prepare: true });
		else await this.client.batch(queries, {
			prepare: true,
			logged: false
		});
	}
};

//#endregion
exports.CassandraClientFactory = CassandraClientFactory;
exports.CassandraTable = CassandraTable;
Object.defineProperty(exports, 'cassandra_exports', {
  enumerable: true,
  get: function () {
    return cassandra_exports;
  }
});
//# sourceMappingURL=cassandra.cjs.map