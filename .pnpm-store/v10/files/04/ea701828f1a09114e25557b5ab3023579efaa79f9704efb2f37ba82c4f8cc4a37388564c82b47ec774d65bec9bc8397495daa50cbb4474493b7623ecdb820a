import { Client as IClient, Command, FetchHttpHandlerOptions, MetadataBearer, MiddlewareStack, NodeHttpHandlerOptions, RequestHandler } from "@smithy/types";
/**
 * @public
 */
export interface SmithyConfiguration<HandlerOptions> {
    requestHandler: RequestHandler<any, any, HandlerOptions> | NodeHttpHandlerOptions | FetchHttpHandlerOptions | Record<string, unknown>;
    /**
     * The API version set internally by the SDK, and is
     * not planned to be used by customer code.
     * @internal
     */
    readonly apiVersion: string;
    /**
     * @public
     *
     * Default false.
     *
     * When true, the client will only resolve the middleware stack once per
     * Command class. This means modifying the middlewareStack of the
     * command or client after requests have been made will not be
     * recognized.
     *
     * Calling client.destroy() also clears this cache.
     *
     * Enable this only if needing the additional time saved (0-1ms per request)
     * and not needing middleware modifications between requests.
     */
    cacheMiddleware?: boolean;
}
/**
 * @internal
 */
export type SmithyResolvedConfiguration<HandlerOptions> = {
    requestHandler: RequestHandler<any, any, HandlerOptions>;
    readonly apiVersion: string;
    cacheMiddleware?: boolean;
};
/**
 * @public
 */
export declare class Client<HandlerOptions, ClientInput extends object, ClientOutput extends MetadataBearer, ResolvedClientConfiguration extends SmithyResolvedConfiguration<HandlerOptions>> implements IClient<ClientInput, ClientOutput, ResolvedClientConfiguration> {
    readonly config: ResolvedClientConfiguration;
    middlewareStack: MiddlewareStack<ClientInput, ClientOutput>;
    /**
     * Holds an object reference to the initial configuration object.
     * Used to check that the config resolver stack does not create
     * dangling instances of an intermediate form of the configuration object.
     *
     * @internal
     */
    initConfig?: object;
    /**
     * May be used to cache the resolved handler function for a Command class.
     */
    private handlers?;
    constructor(config: ResolvedClientConfiguration);
    send<InputType extends ClientInput, OutputType extends ClientOutput>(command: Command<ClientInput, InputType, ClientOutput, OutputType, SmithyResolvedConfiguration<HandlerOptions>>, options?: HandlerOptions): Promise<OutputType>;
    send<InputType extends ClientInput, OutputType extends ClientOutput>(command: Command<ClientInput, InputType, ClientOutput, OutputType, SmithyResolvedConfiguration<HandlerOptions>>, cb: (err: any, data?: OutputType) => void): void;
    send<InputType extends ClientInput, OutputType extends ClientOutput>(command: Command<ClientInput, InputType, ClientOutput, OutputType, SmithyResolvedConfiguration<HandlerOptions>>, options: HandlerOptions, cb: (err: any, data?: OutputType) => void): void;
    destroy(): void;
}
