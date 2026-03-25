import type { HttpHandler, HttpRequest } from "@smithy/protocol-http";
import { HttpResponse } from "@smithy/protocol-http";
import type { FetchHttpHandlerOptions } from "@smithy/types";
import type { HttpHandlerOptions, Provider } from "@smithy/types";
/**
 * @public
 */
export { FetchHttpHandlerOptions };
/**
 * @internal
 * Detection of keepalive support. Can be overridden for testing.
 */
export declare const keepAliveSupport: {
    supported: undefined | boolean;
};
/**
 * @internal
 */
export type AdditionalRequestParameters = {
    duplex?: "half";
};
/**
 * @public
 *
 * HttpHandler implementation using browsers' `fetch` global function.
 */
export declare class FetchHttpHandler implements HttpHandler<FetchHttpHandlerOptions> {
    private config?;
    private configProvider;
    /**
     * @returns the input if it is an HttpHandler of any class,
     * or instantiates a new instance of this handler.
     */
    static create(instanceOrOptions?: HttpHandler<any> | FetchHttpHandlerOptions | Provider<FetchHttpHandlerOptions | void>): FetchHttpHandler | HttpHandler<any>;
    constructor(options?: FetchHttpHandlerOptions | Provider<FetchHttpHandlerOptions | void>);
    destroy(): void;
    handle(request: HttpRequest, { abortSignal, requestTimeout }?: HttpHandlerOptions): Promise<{
        response: HttpResponse;
    }>;
    updateHttpClientConfig(key: keyof FetchHttpHandlerOptions, value: FetchHttpHandlerOptions[typeof key]): void;
    httpHandlerConfigs(): FetchHttpHandlerOptions;
}
