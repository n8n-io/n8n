/// <reference types="node" />
/// <reference types="node" />
import { HttpHandler, HttpRequest, HttpResponse } from "@smithy/protocol-http";
import type { Logger, NodeHttpHandlerOptions } from "@smithy/types";
import { HttpHandlerOptions, Provider } from "@smithy/types";
import { Agent as hAgent } from "http";
import { Agent as hsAgent } from "https";
export { NodeHttpHandlerOptions };
/**
 * @public
 * A default of 0 means no timeout.
 */
export declare const DEFAULT_REQUEST_TIMEOUT = 0;
/**
 * @public
 * A request handler that uses the Node.js http and https modules.
 */
export declare class NodeHttpHandler implements HttpHandler<NodeHttpHandlerOptions> {
    private config?;
    private configProvider;
    private socketWarningTimestamp;
    readonly metadata: {
        handlerProtocol: string;
    };
    /**
     * @returns the input if it is an HttpHandler of any class,
     * or instantiates a new instance of this handler.
     */
    static create(instanceOrOptions?: HttpHandler<any> | NodeHttpHandlerOptions | Provider<NodeHttpHandlerOptions | void>): NodeHttpHandler | HttpHandler<any>;
    /**
     * @internal
     *
     * @param agent - http(s) agent in use by the NodeHttpHandler instance.
     * @param socketWarningTimestamp - last socket usage check timestamp.
     * @param logger - channel for the warning.
     * @returns timestamp of last emitted warning.
     */
    static checkSocketUsage(agent: hAgent | hsAgent, socketWarningTimestamp: number, logger?: Logger): number;
    constructor(options?: NodeHttpHandlerOptions | Provider<NodeHttpHandlerOptions | void>);
    private resolveDefaultConfig;
    destroy(): void;
    handle(request: HttpRequest, { abortSignal }?: HttpHandlerOptions): Promise<{
        response: HttpResponse;
    }>;
    updateHttpClientConfig(key: keyof NodeHttpHandlerOptions, value: NodeHttpHandlerOptions[typeof key]): void;
    httpHandlerConfigs(): NodeHttpHandlerOptions;
}
