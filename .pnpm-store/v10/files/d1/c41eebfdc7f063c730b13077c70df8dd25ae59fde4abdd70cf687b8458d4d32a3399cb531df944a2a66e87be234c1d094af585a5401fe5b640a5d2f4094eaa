import type { EndpointParameters, SerializeMiddleware } from "@smithy/types";
import type { EndpointResolvedConfig } from "./resolveEndpointConfig";
import type { EndpointParameterInstructions } from "./types";
/**
 * @internal
 */
export declare const endpointMiddleware: <T extends EndpointParameters>({ config, instructions, }: {
    config: EndpointResolvedConfig<T>;
    instructions: EndpointParameterInstructions;
}) => SerializeMiddleware<any, any>;
