/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * A class that implements the HeaderPropagationCollection interface.
 * It filters the incoming request headers based on the definition provided and loads them into the outgoing headers collection.
 */
export declare class HeaderPropagation implements HeaderPropagationCollection {
    private _incomingRequests;
    private _outgoingHeaders;
    private _headersToPropagate;
    get incoming(): Record<string, string>;
    get outgoing(): Record<string, string>;
    constructor(headers: Record<string, string | string[] | undefined>);
    propagate(headers: string[]): void;
    add(headers: Record<string, string>): void;
    concat(headers: Record<string, string>): void;
    override(headers: Record<string, string>): void;
    /**
     * Normalizes the headers by lowercasing the keys and ensuring the values are strings.
     * @param headers The headers to normalize.
     * @returns A new object with normalized headers.
     */
    private normalizeHeaders;
}
/**
 * A function type that defines how headers should be propagated.
 */
export interface HeaderPropagationDefinition {
    (headers: HeaderPropagationCollection): void;
}
/**
 * Defines the interface for managing header propagation.
 */
export interface HeaderPropagationCollection {
    /**
     * The collection of incoming headers from the incoming request.
     *
     * @remarks
     * This collection is built based on the headers received in the request.
     */
    incoming: Record<string, string>;
    /**
     * The collection of headers that will be propagated to outgoing requests.
     *
     * @remarks
     * This collection is built based on the incoming headers and the definition provided.
     */
    outgoing: Record<string, string>;
    /**
     * Propagates the incoming header value to the outgoing collection based on the header definition key.
     * @param headers List of header keys to propagate.
     *
     * @remarks
     * If the header does not exist in the incoming headers, it will be ignored.
     */
    propagate(headers: string[]): void;
    /**
     * Adds a header definition to the outgoing collection.
     * @param headers Headers to add to the outgoing collection.
     *
     * @remarks
     * If the header already exists, it will not be added.
     */
    add(headers: Record<string, string>): void;
    /**
     * Concatenates a header definition to the outgoing collection.
     * @param headers Headers to concatenate to the outgoing collection.
     *
     * @remarks
     * If the header does not exist in the incoming headers, it will be ignored. Unless the header is already present in the outgoing collection.
     */
    concat(headers: Record<string, string>): void;
    /**
     * Overrides a header definition in the outgoing collection.
     * @param headers Headers to override in the outgoing collection.
     *
     * @remarks
     * If the header does not exist in the incoming headers, it will be added to the outgoing collection.
     */
    override(headers: Record<string, string>): void;
}
