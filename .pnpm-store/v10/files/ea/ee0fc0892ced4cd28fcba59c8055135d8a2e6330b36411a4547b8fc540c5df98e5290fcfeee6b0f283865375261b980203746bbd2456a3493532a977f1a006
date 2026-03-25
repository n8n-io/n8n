/*
 * mockserver
 * http://mock-server.com
 *
 * Original definitions by: David Tanner <https://github.com/DavidTanner>
 *
 * Copyright (c) 2014 James Bloom
 * Licensed under the Apache License, Version 2.0
 */

import {Expectation, ExpectationId, HttpRequest, HttpRequestAndHttpResponse, HttpResponse, KeyToMultiValue, OpenAPIExpectation, RequestDefinition, Times, TimeToLive,} from './mockServer';

export type Host = string;
export type Port = number;
export type ContextPath = string;
export type TLS = boolean;
export type CaCertPemFilePath = string;
// Retains backwards compatability.
export type KeysToMultiValues = KeyToMultiValue;

export type ClearType = 'EXPECTATIONS' | 'LOG' | 'ALL';

export interface SuccessFullRequest {
    statusCode: number;
    body: string;
}

export type RequestResponse = SuccessFullRequest | string;

export type PathOrRequestDefinition = string | Expectation | RequestDefinition | undefined | null;

export interface MockServerClient {
    openAPIExpectation(expectation: OpenAPIExpectation): Promise<RequestResponse>;

    mockAnyResponse(expectation: Expectation | Expectation[]): Promise<RequestResponse>;

    mockWithCallback(requestMatcher: RequestDefinition, requestHandler: (request: HttpRequest) => HttpResponse, times?: Times | number, priority?: number, timeToLive?: TimeToLive, id?: string): Promise<RequestResponse>;

    mockSimpleResponse<T = any>(path: string, responseBody: T, statusCode?: number): Promise<RequestResponse>;

    setDefaultHeaders(responseHeaders: KeysToMultiValues, requestHeaders: KeysToMultiValues): MockServerClient;

    verify(matcher: RequestDefinition, atLeast?: number, atMost?: number): Promise<void | string>;

    verifyById(expectationId: ExpectationId, atLeast?: number, atMost?: number): Promise<void | string>;

    verifySequence(...matchers: RequestDefinition[]): Promise<void | string>;

    verifySequenceById(...expectationIds: ExpectationId[]): Promise<void | string>;

    reset(): Promise<RequestResponse>;

    clear(pathOrRequestDefinition: PathOrRequestDefinition, type: ClearType): Promise<RequestResponse>;

    clearById(expectationId: ExpectationId, type: ClearType): Promise<RequestResponse>;

    bind(ports: Port[]): Promise<RequestResponse>;

    retrieveRecordedRequests(pathOrRequestDefinition: PathOrRequestDefinition): Promise<HttpResponse[]>;

    retrieveRecordedRequestsAndResponses(pathOrRequestDefinition: PathOrRequestDefinition): Promise<HttpRequestAndHttpResponse[]>;

    retrieveActiveExpectations(pathOrRequestDefinition: PathOrRequestDefinition): Promise<Expectation[]>;

    retrieveRecordedExpectations(pathOrRequestDefinition: PathOrRequestDefinition): Promise<Expectation[]>;

    retrieveLogMessages(pathOrRequestDefinition: PathOrRequestDefinition): Promise<string[]>;
}

/**
 * Start the client communicating at the specified host and port
 * for example:
 *
 *   var client = mockServerClient("localhost", 1080);
 *
 * @param host {string} the host for the server to communicate with
 * @param port {number} the port for the server to communicate with
 * @param contextPath {string} the context path if server was deployed as a war
 * @param tls {boolean} enable TLS (i.e. HTTPS) for communication to server
 * @param caCertPemFilePath {string} provide custom CA Certificate (defaults to MockServer CA Certificate)
 */
export declare function mockServerClient(
    host: Host,
    port: Port,
    contextPath?: ContextPath,
    tls?: TLS,
    caCertPemFilePath?: CaCertPemFilePath
): MockServerClient;

