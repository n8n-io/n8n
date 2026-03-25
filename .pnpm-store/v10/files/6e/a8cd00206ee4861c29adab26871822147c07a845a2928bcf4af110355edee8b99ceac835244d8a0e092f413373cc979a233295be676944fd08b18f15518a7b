import { AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Client, DseClientOptions, types } from "cassandra-driver";

//#region src/utils/cassandra.d.ts

/**
 * Defines the configuration options for connecting to Astra DB, DataStax's cloud-native Cassandra-as-a-Service.
 * This interface specifies the necessary parameters required to establish a connection with an Astra DB instance,
 * including authentication and targeting specific data centers or regions.
 *
 * Properties:
 * - `token`: The authentication token required for accessing the Astra DB instance. Essential for establishing a secure connection.
 * - `endpoint`: Optional. The URL or network address of the Astra DB instance. Can be used to directly specify the connection endpoint.
 * - `datacenterID`: Optional. The unique identifier of the data center to connect to. Used to compute the endpoint.
 * - `regionName`: Optional. The region name of the Astra DB instance. Used to compute the endpoint. Default to the primary region.
 * - `bundleUrlTemplate`: Optional. The URL template for downloading the secure connect bundle. Used to customize the bundle URL. "database_id" variable will be resolved at runtime.
 *
 * Either `endpoint` or `datacenterID` must be provided to establish a connection to Astra DB.
 */
interface AstraServiceProviderArgs {
  token: string;
  endpoint?: string | URL;
  datacenterID?: string;
  regionName?: string;
  bundleUrlTemplate?: string;
}
/**
 * Encapsulates the service provider-specific arguments required for creating a Cassandra client.
 * This interface acts as a wrapper for configurations pertaining to various Cassandra service providers,
 * allowing for extensible and flexible client configuration.
 *
 * Currently, it supports:
 * - `astra`: Optional. Configuration parameters specific to Astra DB, DataStax's cloud-native Cassandra service.
 *            Utilizing this property enables tailored connections to Astra DB instances with custom configurations.
 *
 * This structure is designed to be extended with additional service providers in the future, ensuring adaptability
 * and extensibility for connecting to various Cassandra services with distinct configuration requirements.
 */
interface CassandraServiceProviderArgs {
  astra?: AstraServiceProviderArgs;
}
/**
 * Extends the DataStax driver's client options with additional configurations for service providers,
 * enabling the customization of Cassandra client instances based on specific service requirements.
 * This interface integrates native driver configurations with custom extensions, facilitating the
 * connection to Cassandra databases, including managed services like Astra DB.
 *
 * - `serviceProviderArgs`: Optional. Contains the connection arguments for specific Cassandra service providers,
 *                           such as Astra DB. This allows for detailed and service-specific client configurations,
 *                           enhancing connectivity and functionality across different Cassandra environments.
 *
 * Incorporating this interface into client creation processes ensures a comprehensive setup, encompassing both
 * standard and extended options for robust and versatile Cassandra database interactions.
 */
interface CassandraClientArgs extends DseClientOptions {
  serviceProviderArgs?: CassandraServiceProviderArgs;
}
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
declare class CassandraClientFactory {
  /**
   * Asynchronously obtains a configured Cassandra client based on the provided arguments.
   * This method processes the given CassandraClientArgs to produce a configured Client instance
   * from the cassandra-driver, suitable for interacting with Cassandra databases.
   *
   * @param args The configuration arguments for the Cassandra client, including any service provider-specific options.
   * @returns A Promise resolving to a Client object configured according to the specified arguments.
   */
  static getClient(args: CassandraClientArgs): Promise<Client>;
  /**
   * Processes the provided CassandraClientArgs for creating a Cassandra client.
   *
   * @param args The arguments for creating the Cassandra client, including service provider configurations.
   * @returns A Promise resolving to the processed CassandraClientArgs, ready for client initialization.
   * @throws Error if the configuration is unsupported, specifically if serviceProviderArgs are provided
   * but do not include valid configurations for Astra.
   */
  private static processArgs;
  private static processAstraArgs;
  private static getAstraDefaultBundleLocation;
  private static setAstraBundle;
  private static downloadAstraSecureConnectBundle;
}
/**
 * Represents the definition of a column within a Cassandra table schema.
 * This interface is used to specify the properties of table columns during table creation
 * and to define how columns are utilized in select queries.
 *
 * Properties:
 * - `name`: The name of the column.
 * - `type`: The data type of the column, used during table creation to define the schema.
 * - `partition`: Optional. Specifies whether the column is part of the partition key. Important for table creation.
 * - `alias`: Optional. An alias for the column that can be used in select queries for readability or to avoid naming conflicts.
 * - `binds`: Optional. Specifies values to be bound to the column in queries, supporting parameterized query construction.
 *
 */
interface Column {
  name: string;
  type: string;
  partition?: boolean;
  alias?: string;
  binds?: unknown | [unknown, ...unknown[]];
}
/**
 * Defines an index on a Cassandra table column, facilitating efficient querying by column values.
 * This interface specifies the necessary configuration for creating secondary indexes on table columns,
 * enhancing query performance and flexibility.
 *
 * Properties:
 * - `name`: The name of the index. Typically related to the column it indexes for clarity.
 * - `value`: The name of the column on which the index is created.
 * - `options`: Optional. Custom options for the index, specified as a string. This can include various index
 *               configurations supported by Cassandra, such as using specific indexing classes or options.
 *
 */
interface Index {
  name: string;
  value: string;
  options?: string;
}
/**
 * Represents a filter condition used in constructing WHERE clauses for querying Cassandra tables.
 * Filters specify the criteria used to select rows from a table, based on column values.
 *
 * Properties:
 * - `name`: The name of the column to filter on.
 * - `value`: The value(s) to match against the column. Can be a single value or an array of values for operations like IN.
 * - `operator`: Optional. The comparison operator to use (e.g., '=', '<', '>', 'IN'). Defaults to '=' if not specified.
 *
 */
interface Filter {
  name: string;
  value: unknown | [unknown, ...unknown[]];
  operator?: string;
}
/**
 * Defines a type for specifying WHERE clause conditions in Cassandra queries.
 * This can be a single `Filter` object, an array of `Filter` objects for multiple conditions,
 * or a `Record<string, unknown>` for simple equality conditions keyed by column name.
 */
type WhereClause = Filter[] | Filter | Record<string, unknown>;
/**
 * Defines the configuration arguments for initializing a Cassandra table within an application.
 * This interface extends `AsyncCallerParams`, incorporating asynchronous operation configurations,
 * and adds specific properties for table creation, query execution, and data manipulation in a
 * Cassandra database context.
 *
 * Properties:
 * - `table`: The name of the table to be used or created.
 * - `keyspace`: The keyspace within which the table exists or will be created.
 * - `primaryKey`: Specifies the column(s) that constitute the primary key of the table. This can be a single
 *                 `Column` object for a simple primary key or an array of `Column` objects for composite keys.
 * - `nonKeyColumns`: Defines columns that are not part of the primary key. Similar to `primaryKey`, this can be a
 *                    single `Column` object or an array of `Column` objects, supporting flexible table schema definitions.
 * - `withClause`: Optional. A string containing additional CQL table options to be included in the CREATE TABLE statement.
 *                 This enables the specification of various table behaviors and properties, such as compaction strategies
 *                 and TTL settings.
 * - `indices`: Optional. An array of `Index` objects defining secondary indices on the table for improved query performance
 *               on non-primary key columns.
 * - `batchSize`: Optional. Specifies the default size of batches for batched write operations to the table, affecting
 *                performance and consistency trade-offs.
 *
 */
interface CassandraTableArgs extends AsyncCallerParams {
  table: string;
  keyspace: string;
  primaryKey: Column | Column[];
  nonKeyColumns: Column | Column[];
  withClause?: string;
  indices?: Index[];
  batchSize?: number;
}
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
declare class CassandraTable {
  private client;
  private readonly keyspace;
  private readonly table;
  private primaryKey;
  private nonKeyColumns;
  private indices;
  private withClause;
  private batchSize;
  private initializationPromise;
  private asyncCaller;
  private constructorArgs;
  /**
   * Initializes a new instance of the CassandraTable class with specified configuration.
   * This includes setting up the table schema (primary key, columns, and indices) and
   * preparing the environment for executing queries against a Cassandra database.
   *
   * @param args Configuration arguments defining the table schema and operational settings.
   * @param client Optional. A Cassandra Client instance. If not provided, one will be created
   *               using the configuration specified in `args`.
   */
  constructor(args: CassandraTableArgs, client?: Client);
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
  select(columns?: Column[], filter?: WhereClause, orderBy?: Filter[], limit?: number, allowFiltering?: boolean, fetchSize?: number, pagingState?: string): Promise<types.ResultSet>;
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
  private _columnCheck;
  /**
   * Inserts or updates records in the Cassandra table in batches, managing concurrency and batching size.
   * This method organizes the provided values into batches and uses `_upsert` to perform the database operations.
   *
   * @param values An array of arrays, where each inner array contains values for a single record.
   * @param columns Optional. Columns to be included in the insert/update operations. Defaults to all table columns.
   * @param batchSize Optional. The size of each batch for the operation. Defaults to the class's batchSize property.
   * @returns A Promise that resolves once all records have been upserted.
   */
  upsert(values: unknown[][], columns?: Column[], batchSize?: number): Promise<void>;
  /**
   * Deletes rows from the Cassandra table that match the specified WHERE clause conditions.
   *
   * @param whereClause Defines the conditions that must be met for rows to be deleted. Can be a single filter,
   * an array of filters, or a key-value map translating to filter conditions.
   * @returns A Promise that resolves when the DELETE operation has completed.
   */
  delete(whereClause: WhereClause): Promise<types.ResultSet>;
  /**
   * Retrieves the Node.js Cassandra client instance associated with this table.
   * This method ensures that the client is initialized and ready for use, returning the
   * Cassandra client object that can be used for database operations directly.
   * It initializes the client if it has not already been initialized.
   *
   * @returns A Promise that resolves to the Cassandra Client instance used by this table for database interactions.
   */
  getClient(): Promise<Client>;
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
  private buildPrimaryKey;
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
  private isFilter;
  /**
   * Helper to convert Record<string,unknown> to a Filter[]
   * @param record: a key-value Record collection
   * @returns Record as a Filter[]
   */
  private convertToFilters;
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
  private asFilters;
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
  private buildWhereClause;
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
  private buildOrderByClause;
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
  private buildSearchQuery;
  private initialize;
  private performInitialization;
  private _upsert;
}
//#endregion
export { AstraServiceProviderArgs, CassandraClientArgs, CassandraClientFactory, CassandraServiceProviderArgs, CassandraTable, CassandraTableArgs, Column, Filter, Index, WhereClause };
//# sourceMappingURL=cassandra.d.ts.map