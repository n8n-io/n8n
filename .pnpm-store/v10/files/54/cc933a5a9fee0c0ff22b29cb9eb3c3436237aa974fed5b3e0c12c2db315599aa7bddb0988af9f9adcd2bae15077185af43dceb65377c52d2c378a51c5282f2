/// <reference types="node" />
import * as http from 'http';
import * as ifm from './interfaces';
import { HttpClientResponse } from './index';
export declare class BasicCredentialHandler implements ifm.RequestHandler {
    username: string;
    password: string;
    constructor(username: string, password: string);
    prepareRequest(options: http.RequestOptions): void;
    canHandleAuthentication(): boolean;
    handleAuthentication(): Promise<HttpClientResponse>;
}
export declare class BearerCredentialHandler implements ifm.RequestHandler {
    token: string;
    constructor(token: string);
    prepareRequest(options: http.RequestOptions): void;
    canHandleAuthentication(): boolean;
    handleAuthentication(): Promise<HttpClientResponse>;
}
export declare class PersonalAccessTokenCredentialHandler implements ifm.RequestHandler {
    token: string;
    constructor(token: string);
    prepareRequest(options: http.RequestOptions): void;
    canHandleAuthentication(): boolean;
    handleAuthentication(): Promise<HttpClientResponse>;
}
