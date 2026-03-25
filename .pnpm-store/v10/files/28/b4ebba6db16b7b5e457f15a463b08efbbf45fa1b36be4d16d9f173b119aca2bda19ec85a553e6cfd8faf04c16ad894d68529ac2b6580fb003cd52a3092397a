import { ARN } from "@aws-sdk/util-arn-parser";
export declare const DOT_PATTERN: RegExp;
export declare const S3_HOSTNAME_PATTERN: RegExp;
export interface AccessPointArn extends ARN {
  accessPointName: string;
}
export interface BucketHostnameParams {
  isCustomEndpoint?: boolean;
  baseHostname: string;
  bucketName: string;
  clientRegion: string;
  accelerateEndpoint?: boolean;
  dualstackEndpoint?: boolean;
  fipsEndpoint?: boolean;
  pathStyleEndpoint?: boolean;
  tlsCompatible?: boolean;
}
export interface ArnHostnameParams
  extends Pick<
    BucketHostnameParams,
    Exclude<keyof BucketHostnameParams, "bucketName">
  > {
  bucketName: ARN;
  clientSigningRegion?: string;
  clientPartition?: string;
  useArnRegion?: boolean;
  disableMultiregionAccessPoints?: boolean;
}
export declare const isBucketNameOptions: (
  options: BucketHostnameParams | ArnHostnameParams
) => options is BucketHostnameParams;
export declare const isDnsCompatibleBucketName: (bucketName: string) => boolean;
export declare const getSuffix: (hostname: string) => [string, string];
export declare const getSuffixForArnEndpoint: (
  hostname: string
) => [string, string];
export declare const validateArnEndpointOptions: (options: {
  accelerateEndpoint?: boolean;
  tlsCompatible?: boolean;
  pathStyleEndpoint?: boolean;
}) => void;
export declare const validateService: (service: string) => void;
export declare const validateS3Service: (service: string) => void;
export declare const validateOutpostService: (service: string) => void;
export declare const validatePartition: (
  partition: string,
  options: {
    clientPartition: string;
  }
) => void;
export declare const validateRegion: (
  region: string,
  options: {
    useArnRegion?: boolean;
    allowFipsRegion?: boolean;
    clientRegion: string;
    clientSigningRegion: string;
    useFipsEndpoint: boolean;
  }
) => void;
export declare const validateRegionalClient: (region: string) => void;
export declare const validateAccountId: (accountId: string) => void;
export declare const validateDNSHostLabel: (
  label: string,
  options?: {
    tlsCompatible?: boolean;
  }
) => void;
export declare const validateCustomEndpoint: (options: {
  isCustomEndpoint?: boolean;
  dualstackEndpoint?: boolean;
  accelerateEndpoint?: boolean;
}) => void;
export declare const getArnResources: (resource: string) => {
  accesspointName: string;
  outpostId?: string;
};
export declare const validateNoDualstack: (dualstackEndpoint?: boolean) => void;
export declare const validateNoFIPS: (useFipsEndpoint?: boolean) => void;
export declare const validateMrapAlias: (name: string) => void;
