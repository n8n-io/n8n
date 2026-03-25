import { Client, Command } from "@smithy/types";
import { S3ExpressIdentityProvider } from "./s3-express";
export interface S3InputConfig {
  forcePathStyle?: boolean;
  useAccelerateEndpoint?: boolean;
  disableMultiregionAccessPoints?: boolean;
  followRegionRedirects?: boolean;
  s3ExpressIdentityProvider?: S3ExpressIdentityProvider;
  bucketEndpoint?: boolean;
  expectContinueHeader?: boolean | number;
}
type PlaceholderS3Client = Client<any, any, any> & any;
type PlaceholderCreateSessionCommandCtor = {
  new (args: any): Command<any, any, any, any, any>;
};
export interface S3ResolvedConfig {
  forcePathStyle: boolean;
  useAccelerateEndpoint: boolean;
  disableMultiregionAccessPoints: boolean;
  followRegionRedirects: boolean;
  s3ExpressIdentityProvider: S3ExpressIdentityProvider;
  bucketEndpoint: boolean;
  expectContinueHeader: boolean | number;
}
export declare const resolveS3Config: <T>(
  input: T & S3InputConfig,
  {
    session,
  }: {
    session: [() => PlaceholderS3Client, PlaceholderCreateSessionCommandCtor];
  }
) => T & S3ResolvedConfig;
export {};
