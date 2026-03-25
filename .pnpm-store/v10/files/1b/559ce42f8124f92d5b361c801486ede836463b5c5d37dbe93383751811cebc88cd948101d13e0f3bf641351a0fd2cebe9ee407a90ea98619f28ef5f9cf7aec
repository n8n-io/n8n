import { Provider, RegionInfoProvider } from "@smithy/types";
export interface BucketEndpointInputConfig {
  bucketEndpoint?: boolean;
  forcePathStyle?: boolean;
  useAccelerateEndpoint?: boolean;
  useArnRegion?: boolean | Provider<boolean>;
  disableMultiregionAccessPoints?: boolean | Provider<boolean>;
}
interface PreviouslyResolved {
  isCustomEndpoint?: boolean;
  region: Provider<string>;
  regionInfoProvider: RegionInfoProvider;
  useFipsEndpoint: Provider<boolean>;
  useDualstackEndpoint: Provider<boolean>;
}
export interface BucketEndpointResolvedConfig {
  isCustomEndpoint?: boolean;
  bucketEndpoint: boolean;
  forcePathStyle: boolean;
  useAccelerateEndpoint: boolean;
  useFipsEndpoint: Provider<boolean>;
  useDualstackEndpoint: Provider<boolean>;
  useArnRegion: Provider<boolean>;
  region: Provider<string>;
  regionInfoProvider: RegionInfoProvider;
  disableMultiregionAccessPoints: Provider<boolean>;
}
export declare function resolveBucketEndpointConfig<T>(
  input: T & PreviouslyResolved & BucketEndpointInputConfig
): T & BucketEndpointResolvedConfig;
export {};
