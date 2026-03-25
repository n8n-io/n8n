import { GrpcTimeOut, resStatusResponse, collectionNameReq, KeyValuePair } from './Common';
type ResourceGroupConfig = {
    requests?: {
        node_num: number;
    };
    limits?: {
        node_num: number;
    };
    transfer_from?: {
        resource_group: string;
    }[];
    transfer_to?: {
        resource_group: string;
    }[];
    node_filters?: {
        node_labels: KeyValuePair;
    };
};
type ResourceGroup = {
    name: string;
    capacity: number;
    num_available_node: number;
    num_loaded_replica: {
        [key: string]: number;
    };
    num_outgoing_node: {
        [key: string]: number;
    };
    num_incoming_node: {
        [key: string]: number;
    };
    config?: ResourceGroupConfig;
};
interface BaseResourceGroupReq extends GrpcTimeOut {
    resource_group: string;
}
export interface CreateResourceGroupReq extends BaseResourceGroupReq {
    config?: ResourceGroupConfig;
}
export interface DescribeResourceGroupsReq extends BaseResourceGroupReq {
}
export interface UpdateRresourceGroupReq extends GrpcTimeOut {
    resource_groups: {
        [key: string]: ResourceGroupConfig;
    };
}
export interface DropResourceGroupsReq extends BaseResourceGroupReq {
}
export interface TransferNodeReq extends GrpcTimeOut {
    source_resource_group: string;
    target_resource_group: string;
    num_node: number;
}
export interface TransferReplicaReq extends collectionNameReq {
    source_resource_group: string;
    target_resource_group: string;
    num_replica: number;
}
export interface ListResourceGroupsResponse extends resStatusResponse {
    resource_groups: string[];
}
export interface DescribeResourceGroupResponse extends resStatusResponse {
    resource_group: ResourceGroup;
}
export {};
