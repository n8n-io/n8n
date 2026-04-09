import type { Endpoint, EndpointParameters as __EndpointParameters, EndpointV2, Provider } from "@smithy/types";
/**
 * @public
 */
export interface ClientInputEndpointParameters {
    region?: string | undefined | Provider<string | undefined>;
    useDualstackEndpoint?: boolean | undefined | Provider<boolean | undefined>;
    useFipsEndpoint?: boolean | undefined | Provider<boolean | undefined>;
    endpoint?: string | Provider<string> | Endpoint | Provider<Endpoint> | EndpointV2 | Provider<EndpointV2>;
}
/**
 * @public
 */
export type ClientResolvedEndpointParameters = Omit<ClientInputEndpointParameters, "endpoint"> & {
    defaultSigningName: string;
};
/**
 * @internal
 */
export declare const resolveClientEndpointParameters: <T>(options: T & ClientInputEndpointParameters) => T & ClientResolvedEndpointParameters;
/**
 * @internal
 */
export declare const commonParams: {
    readonly UseFIPS: {
        readonly type: "builtInParams";
        readonly name: "useFipsEndpoint";
    };
    readonly Endpoint: {
        readonly type: "builtInParams";
        readonly name: "endpoint";
    };
    readonly Region: {
        readonly type: "builtInParams";
        readonly name: "region";
    };
    readonly UseDualStack: {
        readonly type: "builtInParams";
        readonly name: "useDualstackEndpoint";
    };
};
/**
 * @internal
 */
export interface EndpointParameters extends __EndpointParameters {
    Region?: string | undefined;
    UseDualStack?: boolean | undefined;
    UseFIPS?: boolean | undefined;
    Endpoint?: string | undefined;
}
