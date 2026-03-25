import {
  Endpoint,
  EndpointParameters,
  EndpointV2,
  Logger,
  Provider,
} from "@smithy/types";
export type DefaultAwsRegionalEndpointsInputConfig = {
  endpoint?: unknown;
};
type PreviouslyResolved = {
  logger?: Logger;
  region?: undefined | string | Provider<string | undefined>;
  useFipsEndpoint?: undefined | boolean | Provider<string | boolean>;
  useDualstackEndpoint?: undefined | boolean | Provider<string | boolean>;
  endpointProvider: (
    endpointParams: EndpointParameters | DefaultRegionalEndpointParameters,
    context?: {
      logger?: Logger;
    }
  ) => EndpointV2;
};
type DefaultRegionalEndpointParameters = {
  Region?: string | undefined;
  UseDualStack?: boolean | undefined;
  UseFIPS?: boolean | undefined;
};
export interface DefaultAwsRegionalEndpointsResolvedConfig {
  endpoint: Provider<Endpoint>;
}
export declare const resolveDefaultAwsRegionalEndpointsConfig: <T>(
  input: T & DefaultAwsRegionalEndpointsInputConfig & PreviouslyResolved
) => T & DefaultAwsRegionalEndpointsResolvedConfig;
export declare const toEndpointV1: (endpoint: EndpointV2) => Endpoint;
export {};
