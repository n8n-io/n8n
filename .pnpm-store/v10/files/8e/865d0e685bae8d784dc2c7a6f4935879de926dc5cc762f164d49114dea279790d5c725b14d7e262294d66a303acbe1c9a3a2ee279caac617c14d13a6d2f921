import { Endpoint, EndpointParameters as __EndpointParameters, EndpointV2, Provider } from "@smithy/types";
/**
 * @public
 */
export interface ClientInputEndpointParameters {
    region?: string | Provider<string>;
    useFipsEndpoint?: boolean | Provider<boolean>;
    useDualstackEndpoint?: boolean | Provider<boolean>;
    endpoint?: string | Provider<string> | Endpoint | Provider<Endpoint> | EndpointV2 | Provider<EndpointV2>;
    forcePathStyle?: boolean | Provider<boolean>;
    useAccelerateEndpoint?: boolean | Provider<boolean>;
    useGlobalEndpoint?: boolean | Provider<boolean>;
    disableMultiregionAccessPoints?: boolean | Provider<boolean>;
    useArnRegion?: boolean | Provider<boolean>;
    disableS3ExpressSessionAuth?: boolean | Provider<boolean>;
}
export type ClientResolvedEndpointParameters = ClientInputEndpointParameters & {
    defaultSigningName: string;
};
export declare const resolveClientEndpointParameters: <T>(options: T & ClientInputEndpointParameters) => T & ClientResolvedEndpointParameters;
export declare const commonParams: {
    readonly ForcePathStyle: {
        readonly type: "clientContextParams";
        readonly name: "forcePathStyle";
    };
    readonly UseArnRegion: {
        readonly type: "clientContextParams";
        readonly name: "useArnRegion";
    };
    readonly DisableMultiRegionAccessPoints: {
        readonly type: "clientContextParams";
        readonly name: "disableMultiregionAccessPoints";
    };
    readonly Accelerate: {
        readonly type: "clientContextParams";
        readonly name: "useAccelerateEndpoint";
    };
    readonly DisableS3ExpressSessionAuth: {
        readonly type: "clientContextParams";
        readonly name: "disableS3ExpressSessionAuth";
    };
    readonly UseGlobalEndpoint: {
        readonly type: "builtInParams";
        readonly name: "useGlobalEndpoint";
    };
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
export interface EndpointParameters extends __EndpointParameters {
    Bucket?: string;
    Region?: string;
    UseFIPS?: boolean;
    UseDualStack?: boolean;
    Endpoint?: string;
    ForcePathStyle?: boolean;
    Accelerate?: boolean;
    UseGlobalEndpoint?: boolean;
    UseObjectLambdaEndpoint?: boolean;
    Key?: string;
    Prefix?: string;
    CopySource?: string;
    DisableAccessPoints?: boolean;
    DisableMultiRegionAccessPoints?: boolean;
    UseArnRegion?: boolean;
    UseS3ExpressControlEndpoint?: boolean;
    DisableS3ExpressSessionAuth?: boolean;
}
