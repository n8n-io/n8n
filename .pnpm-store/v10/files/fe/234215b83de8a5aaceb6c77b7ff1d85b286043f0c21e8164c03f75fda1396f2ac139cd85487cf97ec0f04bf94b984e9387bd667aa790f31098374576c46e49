import { Partition } from './Partition';
import { ResStatus, GrpcTimeOut, CreateResourceGroupReq, DropResourceGroupsReq, ListResourceGroupsResponse, DescribeResourceGroupsReq, DescribeResourceGroupResponse, UpdateRresourceGroupReq, TransferNodeReq, TransferReplicaReq } from '../';
export declare class Resource extends Partition {
    /**
     * Creates a resource group.
     *
     * @param {Object} data - The data for the resource group.
     * @param {string} data.resource_group - The name of the resource group.
     * @param {ResourceGroupConfig} data.config - The configuration for the resource group.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {string} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).createResourceGroup({
     *     resource_group: "vector_01",
     *  });
     * ```
     */
    createResourceGroup(data: CreateResourceGroupReq): Promise<ResStatus>;
    /**
     * Lists all resource groups.
     *
     * @param {GrpcTimeOut} data - An optional object containing a timeout duration in milliseconds for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ListResourceGroupsResponse>} A promise that resolves to the response status.
     * @returns {string} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     * @returns {string[]} resource_groups - An array of resource group names.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).listResourceGroups();
     * ```
     */
    listResourceGroups(data?: GrpcTimeOut): Promise<ListResourceGroupsResponse>;
    /**
     * Describe a resource group.
     *
     * @param {Object} data - The data for the resource group.
     * @param {string} data.resource_group - The name of the resource group.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<DescribeResourceGroupResponse>} A promise that resolves to the response status.
     * @returns {string} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     * @returns {number} resource_group.capacity - The number of nodes which have been transferred to this resource group.
     * @returns {number} resource_group.num_available_node - The number of available nodes, some nodes may be shutdown.
     * @returns {{ [key: string]: number }} resource_group.num_loaded_replica - A map from collection name to the number of loaded replicas of each collection in this resource group.
     * @returns {{ [key: string]: number }} resource_group.num_outgoing_node - A map from collection name to the number of outgoing accessed nodes by replicas loaded in this resource group.
     * @returns {{ [key: string]: number }} resource_group.num_incoming_node - A map from collection name to the number of incoming accessed nodes by replicas loaded in other resource groups.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).describeResourceGroup({
     *    resource_group: 'my-resource-group'
     * });
     * ```
     */
    describeResourceGroup(data: DescribeResourceGroupsReq): Promise<DescribeResourceGroupResponse>;
    /**
     * Updates a resource group.
     * @param {Object} data - The data for the resource group.
     * @param {{ [key: string]: ResourceGroupConfig }} data.resource_groups - A map from resource group name to the configuration for the resource group.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     */
    updateResourceGroups(data: UpdateRresourceGroupReq): Promise<ResStatus>;
    /**
     * Drops a resource group.
     *
     * @param {Object} data - The data for the resource group.
     * @param {string} data.resource_group - The name of the resource group.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {string} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).dropResourceGroup({
     *    resource_group: 'my-resource-group'
     * });
     * ```
     */
    dropResourceGroup(data: DropResourceGroupsReq): Promise<ResStatus>;
    /**
     * Transfers nodes from one resource group to another.
     *
     * @param {Object} data - The data for the resource group.
     * @param {string} data.source_resource_group - The name of the source resource group.
     * @param {string} data.target_resource_group - The name of the target resource group.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} data.num_replica - The number of replicas to transfer.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {string} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).transferNode({
     *    source_resource_group: 'source-resource-group',
     *    target_resource_group: 'target-resource-group',
     *    collection_name: 'my-collection',
     *    num_replica: 2
     * });
     * ```
     */
    transferReplica(data: TransferReplicaReq): Promise<ResStatus>;
    /**
     * Transfers nodes from one resource group to another.
     *
     * @param {Object} data - The data for the resource group.
     * @param {string} data.source_resource_group - The name of the source resource group.
     * @param {string} data.target_resource_group - The name of the target resource group.
     * @param {number} data.num_node - The number of nodes to transfer.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {string} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).transferNode({
     *    source_resource_group: 'source-resource-group',
     *    target_resource_group: 'target-resource-group',
     *    num_node: 4
     * });
     * ```
     */
    transferNode(data: TransferNodeReq): Promise<ResStatus>;
    /**
     * Drops all resource groups, transfers all nodes to the default group.
     *
     * @returns {Promise<ResStatus[]>} A promise that resolves to an array of response statuses, each containing:
     * @returns {string} status.error_code - The error code.
     * @returns {string[]} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).dropResourceGroups();
     * ```
     */
    dropAllResourceGroups(): Promise<ResStatus[]>;
}
