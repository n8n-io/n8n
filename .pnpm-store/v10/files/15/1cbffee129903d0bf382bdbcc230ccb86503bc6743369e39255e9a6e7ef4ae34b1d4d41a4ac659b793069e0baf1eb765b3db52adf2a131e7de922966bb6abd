import * as gax from './gax';
import type { GrpcClient } from './grpc';
import type { GrpcClient as FallbackGrpcClient } from './fallback';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { ProjectIdCallback } from 'google-auth-library/build/src/auth/googleauth';
import * as protos from '../protos/iam_service';
import type { Descriptors, ClientOptions, Callback } from './clientInterface';
/**
 *  Google Cloud IAM Client.
 *  This is manually written for providing methods [setIamPolicy, getIamPolicy, testIamPerssion] to the generated client.
 */
export declare class IamClient {
    private _terminated;
    private _opts;
    private _defaults;
    private _protos;
    auth?: GoogleAuth | OAuth2Client;
    descriptors: Descriptors;
    innerApiCalls: {
        [name: string]: Function;
    };
    iamPolicyStub?: Promise<{
        [name: string]: Function;
    }>;
    gaxGrpc: GrpcClient | FallbackGrpcClient;
    constructor(gaxGrpc: GrpcClient | FallbackGrpcClient, options: ClientOptions);
    /**
     * Initialize the client.
     * Performs asynchronous operations (such as authentication) and prepares the client.
     * This function will be called automatically when any class method is called for the
     * first time, but if you need to initialize it before calling an actual method,
     * feel free to call initialize() directly.
     *
     * You can await on this method if you want to make sure the client is initialized.
     *
     * @returns {Promise} A promise that resolves to an authenticated service stub.
     */
    initialize(): Promise<{
        [name: string]: Function;
    }>;
    /**
     * The DNS address for this API service.
     */
    static get servicePath(): string;
    /**
     * The DNS address for this API service - same as servicePath(),
     * exists for compatibility reasons.
     */
    static get apiEndpoint(): string;
    /**
     * The port for this API service.
     */
    static get port(): number;
    /**
     * The scopes needed to make gRPC calls for every method defined
     * in this service.
     */
    static get scopes(): string[];
    /**
     * Get the project ID used by this class.
     * @param {function(Error, string)} callback - the callback to be called with
     *   the current project Id.
     */
    getProjectId(): Promise<string>;
    getProjectId(callback: ProjectIdCallback): void;
    getIamPolicy(request: protos.google.iam.v1.GetIamPolicyRequest, options?: gax.CallOptions): Promise<[protos.google.iam.v1.Policy]>;
    getIamPolicy(request: protos.google.iam.v1.GetIamPolicyRequest, options: gax.CallOptions, callback: Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.GetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.GetIamPolicyRequest, callback: Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.GetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.SetIamPolicyRequest, options?: gax.CallOptions): Promise<[protos.google.iam.v1.Policy]>;
    setIamPolicy(request: protos.google.iam.v1.SetIamPolicyRequest, options: gax.CallOptions, callback: Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.SetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.SetIamPolicyRequest, callback: Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.SetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.TestIamPermissionsRequest, options?: gax.CallOptions): Promise<[protos.google.iam.v1.TestIamPermissionsResponse]>;
    testIamPermissions(request: protos.google.iam.v1.TestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.TestIamPermissionsResponse, protos.google.iam.v1.TestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.TestIamPermissionsRequest, options: gax.CallOptions, callback: Callback<protos.google.iam.v1.TestIamPermissionsResponse, protos.google.iam.v1.TestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Terminate the GRPC channel and close the client.
     *
     * The client will no longer be usable and all future behavior is undefined.
     */
    close(): Promise<void>;
}
export interface IamClient {
    getIamPolicy(request: protos.google.iam.v1.GetIamPolicyRequest): void;
    getIamPolicy(request: protos.google.iam.v1.GetIamPolicyRequest, options?: gax.CallOptions | Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.GetIamPolicyRequest | null | undefined, {} | null | undefined>, callback?: Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.GetIamPolicyRequest | null | undefined, {} | null | undefined>): Promise<[protos.google.iam.v1.Policy]>;
    setIamPolicy(request: protos.google.iam.v1.SetIamPolicyRequest): void;
    setIamPolicy(request: protos.google.iam.v1.SetIamPolicyRequest, options?: gax.CallOptions | Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.SetIamPolicyRequest | null | undefined, {} | null | undefined>, callback?: Callback<protos.google.iam.v1.Policy, protos.google.iam.v1.SetIamPolicyRequest | null | undefined, {} | null | undefined>): Promise<[protos.google.iam.v1.Policy]>;
    testIamPermissions(request: protos.google.iam.v1.TestIamPermissionsRequest): void;
    testIamPermissions(request: protos.google.iam.v1.TestIamPermissionsRequest, options?: gax.CallOptions | Callback<protos.google.iam.v1.TestIamPermissionsResponse, protos.google.iam.v1.TestIamPermissionsRequest | null | undefined, {} | null | undefined>, callback?: Callback<protos.google.iam.v1.TestIamPermissionsResponse, protos.google.iam.v1.TestIamPermissionsRequest | null | undefined, {} | null | undefined>): Promise<[protos.google.iam.v1.TestIamPermissionsResponse]>;
}
