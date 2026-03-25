/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */
/// <reference types="node" />
import { OutgoingHttpHeaders } from 'http';
export declare const BASE_PATH = "/computeMetadata/v1";
export declare const HOST_ADDRESS = "http://169.254.169.254";
export declare const SECONDARY_HOST_ADDRESS = "http://metadata.google.internal.";
export declare const HEADER_NAME = "Metadata-Flavor";
export declare const HEADER_VALUE = "Google";
export declare const HEADERS: Readonly<{
    "Metadata-Flavor": "Google";
}>;
/**
 * Metadata server detection override options.
 *
 * Available via `process.env.METADATA_SERVER_DETECTION`.
 */
export declare const METADATA_SERVER_DETECTION: Readonly<{
    'assume-present': "don't try to ping the metadata server, but assume it's present";
    none: "don't try to ping the metadata server, but don't try to use it either";
    'bios-only': "treat the result of a BIOS probe as canonical (don't fall back to pinging)";
    'ping-only': "skip the BIOS probe, and go straight to pinging";
}>;
export interface Options {
    params?: {
        [index: string]: string;
    };
    property?: string;
    headers?: OutgoingHttpHeaders;
}
export interface MetadataAccessor {
    /**
     *
     * @example
     *
     * // equivalent to `project('project-id')`;
     * const metadataKey = 'project/project-id';
     */
    metadataKey: string;
    params?: Options['params'];
    headers?: Options['headers'];
    noResponseRetries?: number;
    fastFail?: boolean;
}
export type BulkResults<T extends readonly MetadataAccessor[]> = {
    [key in T[number]['metadataKey']]: ReturnType<JSON['parse']>;
};
/**
 * Obtain metadata for the current GCE instance.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const serviceAccount: {} = await instance('service-accounts/');
 * const serviceAccountEmail: string = await instance('service-accounts/default/email');
 * ```
 */
export declare function instance<T = any>(options?: string | Options): Promise<T>;
/**
 * Obtain metadata for the current GCP project.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const projectId: string = await project('project-id');
 * const numericProjectId: number = await project('numeric-project-id');
 * ```
 */
export declare function project<T = any>(options?: string | Options): Promise<T>;
/**
 * Obtain metadata for the current universe.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const universeDomain: string = await universe('universe_domain');
 * ```
 */
export declare function universe<T>(options?: string | Options): Promise<T>;
/**
 * Retrieve metadata items in parallel.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const data = await bulk([
 *   {
 *     metadataKey: 'instance',
 *   },
 *   {
 *     metadataKey: 'project/project-id',
 *   },
 * ] as const);
 *
 * // data.instance;
 * // data['project/project-id'];
 * ```
 *
 * @param properties The metadata properties to retrieve
 * @returns The metadata in `metadatakey:value` format
 */
export declare function bulk<T extends readonly Readonly<MetadataAccessor>[], R extends BulkResults<T> = BulkResults<T>>(properties: T): Promise<R>;
/**
 * Determine if the metadata server is currently available.
 */
export declare function isAvailable(): Promise<boolean>;
/**
 * reset the memoized isAvailable() lookup.
 */
export declare function resetIsAvailableCache(): void;
/**
 * A cache for the detected GCP Residency.
 */
export declare let gcpResidencyCache: boolean | null;
/**
 * Detects GCP Residency.
 * Caches results to reduce costs for subsequent calls.
 *
 * @see setGCPResidency for setting
 */
export declare function getGCPResidency(): boolean;
/**
 * Sets the detected GCP Residency.
 * Useful for forcing metadata server detection behavior.
 *
 * Set `null` to autodetect the environment (default behavior).
 * @see getGCPResidency for getting
 */
export declare function setGCPResidency(value?: boolean | null): void;
/**
 * Obtain the timeout for requests to the metadata server.
 *
 * In certain environments and conditions requests can take longer than
 * the default timeout to complete. This function will determine the
 * appropriate timeout based on the environment.
 *
 * @returns {number} a request timeout duration in milliseconds.
 */
export declare function requestTimeout(): number;
export * from './gcp-residency';
