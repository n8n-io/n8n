"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = void 0;
const Partition_1 = require("./Partition");
const __1 = require("../");
class Resource extends Partition_1.Partition {
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
    createResourceGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'CreateResourceGroup', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    listResourceGroups(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'ListResourceGroups', {}, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
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
    describeResourceGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'DescribeResourceGroup', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Updates a resource group.
     * @param {Object} data - The data for the resource group.
     * @param {{ [key: string]: ResourceGroupConfig }} data.resource_groups - A map from resource group name to the configuration for the resource group.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     */
    /* istanbul ignore next */
    updateResourceGroups(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'UpdateResourceGroups', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    dropResourceGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'DropResourceGroup', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    /* istanbul ignore next */
    transferReplica(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'TransferReplica', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    /* istanbul ignore next */
    transferNode(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'TransferNode', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    dropAllResourceGroups() {
        return __awaiter(this, void 0, void 0, function* () {
            // get all resource groups
            const { resource_groups } = yield this.listResourceGroups();
            const res = [];
            // iterate over all resource groups
            // find the query nodes in it that need to be transferred
            // transfer those query nodes to the default group
            for (let i = 0; i < resource_groups.length; i++) {
                const sourceRg = resource_groups[i];
                if (sourceRg !== __1.DEFAULT_RESOURCE_GROUP) {
                    // get detail
                    const detail = yield this.describeResourceGroup({
                        resource_group: sourceRg,
                    });
                    // if capacity is not 0, transfer node back
                    if (detail.resource_group.capacity > 0) {
                        // istanbul ignore next
                        yield this.transferNode({
                            source_resource_group: sourceRg,
                            target_resource_group: __1.DEFAULT_RESOURCE_GROUP,
                            num_node: detail.resource_group.capacity,
                        });
                    }
                    // drop rg
                    res.push(yield this.dropResourceGroup({
                        resource_group: sourceRg,
                    }));
                }
            }
            return Promise.all(res);
        });
    }
}
exports.Resource = Resource;
//# sourceMappingURL=Resource.js.map