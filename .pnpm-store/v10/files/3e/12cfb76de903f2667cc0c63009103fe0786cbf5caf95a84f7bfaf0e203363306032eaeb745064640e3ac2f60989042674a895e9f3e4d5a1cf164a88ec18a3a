import { BuildHandlerOptions, BuildMiddleware } from "@smithy/types";
import { PreviouslyResolved } from "./configuration";
export interface FlexibleChecksumsRequestMiddlewareConfig {
  requestChecksumRequired: boolean;
  requestAlgorithmMember?: {
    name: string;
    httpHeader?: string;
  };
}
export declare const flexibleChecksumsMiddlewareOptions: BuildHandlerOptions;
export declare const flexibleChecksumsMiddleware: (
  config: PreviouslyResolved,
  middlewareConfig: FlexibleChecksumsRequestMiddlewareConfig
) => BuildMiddleware<any, any>;
