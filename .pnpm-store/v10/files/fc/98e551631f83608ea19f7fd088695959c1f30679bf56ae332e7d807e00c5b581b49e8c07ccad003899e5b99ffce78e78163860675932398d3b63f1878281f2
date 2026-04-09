import { APIResource } from "../../resource.js";
import * as Core from "../../core.js";
import * as FilesAPI from "./files/files.js";
import { FileCreateParams, FileCreateResponse, FileListParams, FileListResponse, FileListResponsesPage, FileRetrieveResponse, Files } from "./files/files.js";
import { CursorPage, type CursorPageParams } from "../../pagination.js";
export declare class Containers extends APIResource {
    files: FilesAPI.Files;
    /**
     * Create Container
     */
    create(body: ContainerCreateParams, options?: Core.RequestOptions): Core.APIPromise<ContainerCreateResponse>;
    /**
     * Retrieve Container
     */
    retrieve(containerId: string, options?: Core.RequestOptions): Core.APIPromise<ContainerRetrieveResponse>;
    /**
     * List Containers
     */
    list(query?: ContainerListParams, options?: Core.RequestOptions): Core.PagePromise<ContainerListResponsesPage, ContainerListResponse>;
    list(options?: Core.RequestOptions): Core.PagePromise<ContainerListResponsesPage, ContainerListResponse>;
    /**
     * Delete Container
     */
    del(containerId: string, options?: Core.RequestOptions): Core.APIPromise<void>;
}
export declare class ContainerListResponsesPage extends CursorPage<ContainerListResponse> {
}
export interface ContainerCreateResponse {
    /**
     * Unique identifier for the container.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the container was created.
     */
    created_at: number;
    /**
     * Name of the container.
     */
    name: string;
    /**
     * The type of this object.
     */
    object: string;
    /**
     * Status of the container (e.g., active, deleted).
     */
    status: string;
    /**
     * The container will expire after this time period. The anchor is the reference
     * point for the expiration. The minutes is the number of minutes after the anchor
     * before the container expires.
     */
    expires_after?: ContainerCreateResponse.ExpiresAfter;
}
export declare namespace ContainerCreateResponse {
    /**
     * The container will expire after this time period. The anchor is the reference
     * point for the expiration. The minutes is the number of minutes after the anchor
     * before the container expires.
     */
    interface ExpiresAfter {
        /**
         * The reference point for the expiration.
         */
        anchor?: 'last_active_at';
        /**
         * The number of minutes after the anchor before the container expires.
         */
        minutes?: number;
    }
}
export interface ContainerRetrieveResponse {
    /**
     * Unique identifier for the container.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the container was created.
     */
    created_at: number;
    /**
     * Name of the container.
     */
    name: string;
    /**
     * The type of this object.
     */
    object: string;
    /**
     * Status of the container (e.g., active, deleted).
     */
    status: string;
    /**
     * The container will expire after this time period. The anchor is the reference
     * point for the expiration. The minutes is the number of minutes after the anchor
     * before the container expires.
     */
    expires_after?: ContainerRetrieveResponse.ExpiresAfter;
}
export declare namespace ContainerRetrieveResponse {
    /**
     * The container will expire after this time period. The anchor is the reference
     * point for the expiration. The minutes is the number of minutes after the anchor
     * before the container expires.
     */
    interface ExpiresAfter {
        /**
         * The reference point for the expiration.
         */
        anchor?: 'last_active_at';
        /**
         * The number of minutes after the anchor before the container expires.
         */
        minutes?: number;
    }
}
export interface ContainerListResponse {
    /**
     * Unique identifier for the container.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the container was created.
     */
    created_at: number;
    /**
     * Name of the container.
     */
    name: string;
    /**
     * The type of this object.
     */
    object: string;
    /**
     * Status of the container (e.g., active, deleted).
     */
    status: string;
    /**
     * The container will expire after this time period. The anchor is the reference
     * point for the expiration. The minutes is the number of minutes after the anchor
     * before the container expires.
     */
    expires_after?: ContainerListResponse.ExpiresAfter;
}
export declare namespace ContainerListResponse {
    /**
     * The container will expire after this time period. The anchor is the reference
     * point for the expiration. The minutes is the number of minutes after the anchor
     * before the container expires.
     */
    interface ExpiresAfter {
        /**
         * The reference point for the expiration.
         */
        anchor?: 'last_active_at';
        /**
         * The number of minutes after the anchor before the container expires.
         */
        minutes?: number;
    }
}
export interface ContainerCreateParams {
    /**
     * Name of the container to create.
     */
    name: string;
    /**
     * Container expiration time in seconds relative to the 'anchor' time.
     */
    expires_after?: ContainerCreateParams.ExpiresAfter;
    /**
     * IDs of files to copy to the container.
     */
    file_ids?: Array<string>;
}
export declare namespace ContainerCreateParams {
    /**
     * Container expiration time in seconds relative to the 'anchor' time.
     */
    interface ExpiresAfter {
        /**
         * Time anchor for the expiration time. Currently only 'last_active_at' is
         * supported.
         */
        anchor: 'last_active_at';
        minutes: number;
    }
}
export interface ContainerListParams extends CursorPageParams {
    /**
     * Sort order by the `created_at` timestamp of the objects. `asc` for ascending
     * order and `desc` for descending order.
     */
    order?: 'asc' | 'desc';
}
export declare namespace Containers {
    export { type ContainerCreateResponse as ContainerCreateResponse, type ContainerRetrieveResponse as ContainerRetrieveResponse, type ContainerListResponse as ContainerListResponse, ContainerListResponsesPage as ContainerListResponsesPage, type ContainerCreateParams as ContainerCreateParams, type ContainerListParams as ContainerListParams, };
    export { Files as Files, type FileCreateResponse as FileCreateResponse, type FileRetrieveResponse as FileRetrieveResponse, type FileListResponse as FileListResponse, FileListResponsesPage as FileListResponsesPage, type FileCreateParams as FileCreateParams, type FileListParams as FileListParams, };
}
//# sourceMappingURL=containers.d.ts.map