import { BaseClient } from './BaseClient';
import { CreateDatabaseRequest, ListDatabasesRequest, ListDatabasesResponse, DropDatabasesRequest, DescribeDatabaseRequest, DescribeDatabaseResponse, AlterDatabaseRequest, DropDatabasePropertiesRequest, ResStatus } from '../';
export declare class Database extends BaseClient {
    /**
     * Creates a new database.
     *
     * @param {CreateDatabaseRequest} data - The data for the new database.
     * @param {string} data.db_name - The name of the new database.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.createDatabase({ db_name: 'new_db' });
     * ```
     */
    createDatabase(data: CreateDatabaseRequest): Promise<ResStatus>;
    /**
     * Lists all databases.
     *
     * @param {ListDatabasesRequest} data - The request parameters.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListDatabasesResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.listDatabases();
     * ```
     */
    listDatabases(data?: ListDatabasesRequest): Promise<ListDatabasesResponse>;
    /**
     * Describes a database.
     *
     * @param {DescribeDatabaseRequest} data - The request parameters.
     * @param {string} data.db_name - The name of the database to describe.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<DescribeDatabaseResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} db_name - The name of the database.
     * @returns {number} dbID - The ID of the database.
     * @returns {number} created_timestamp - The timestamp of when the database was created.
     * @returns {KeyValuePair[]} properties - The properties of the database.
     *
     * @example
     * ```
     * const milvusClient = new milvusClient(MILUVS_ADDRESS);
     * const res = await milvusClient.describeDatabase({ db_name: 'db_to_describe' });
     * ```
     */
    describeDatabase(data: DescribeDatabaseRequest): Promise<DescribeDatabaseResponse>;
    /**
     * Drops a database.
     *
     * @param {DropDatabasesRequest} data - The request parameters.
     * @param {string} data.db_name - The name of the database to drop.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.dropDatabase({ db_name: 'db_to_drop' });
     * ```
     */
    dropDatabase(data: DropDatabasesRequest): Promise<ResStatus>;
    /**
     * Modifies database properties.
     *
     * @param {AlterDatabaseRequest} data - The request parameters.
     * @param {string} data.db_name - The name of the database to modify.
     * @param {Object} data.properties - The properties to modify. For example, to change the TTL, use {"database.replica.number": 18000}.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.alterDatabase({
     *    database: 'my-db',
     *    properties: {"database.replica.number": 18000}
     *  });
     * ```
     */
    alterDatabase(data: AlterDatabaseRequest): Promise<ResStatus>;
    alterDatabaseProperties: (data: AlterDatabaseRequest) => Promise<ResStatus>;
    /**
     * Drops database properties.
     *
     * @param {DropDatabasePropertiesRequest}
     * @param {string} data.db_name - The name of the database to modify.
     * @param {string[]} data.delete_properties - The properties to delete. For example, to delete the TTL, use ["database.replica.number"].
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     *
     * ```
     * const milvusClient = new milvusClient(MILUVS_ADDRESS);
     * const resStatus = await milvusClient.dropDatabaseProperties({
     *   db_name: 'my-db',
     *  delete_properties: ["database.replica.number"]
     * });
     * ```
     */
    dropDatabaseProperties(data: DropDatabasePropertiesRequest): Promise<ResStatus>;
}
