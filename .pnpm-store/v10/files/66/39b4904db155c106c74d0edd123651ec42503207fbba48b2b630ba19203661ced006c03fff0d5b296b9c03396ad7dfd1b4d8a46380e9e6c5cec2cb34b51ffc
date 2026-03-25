import { KeepAliveOptions } from "./policies/keepAliveOptions.js";
import { RedirectOptions } from "./policies/redirectOptions.js";
import { CommonClientOptions, OperationArguments, OperationSpec, ServiceClient, ServiceClientOptions } from "@azure/core-client";
/**
 * Options specific to Shim Clients.
 */
export interface ExtendedClientOptions {
    /**
     * Options to disable keep alive.
     */
    keepAliveOptions?: KeepAliveOptions;
    /**
     * Options to redirect requests.
     */
    redirectOptions?: RedirectOptions;
}
/**
 * Options that shim clients are expected to expose.
 */
export type ExtendedServiceClientOptions = ServiceClientOptions & ExtendedClientOptions;
/**
 * The common set of options that custom shim clients are expected to expose.
 */
export type ExtendedCommonClientOptions = CommonClientOptions & ExtendedClientOptions;
/**
 * Client to provide compatability between core V1 & V2.
 */
export declare class ExtendedServiceClient extends ServiceClient {
    constructor(options: ExtendedServiceClientOptions);
    /**
     * Compatible send operation request function.
     *
     * @param operationArguments - Operation arguments
     * @param operationSpec - Operation Spec
     * @returns
     */
    sendOperationRequest<T>(operationArguments: OperationArguments, operationSpec: OperationSpec): Promise<T>;
}
//# sourceMappingURL=extendedClient.d.ts.map