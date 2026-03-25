export interface ARN {
    partition: string;
    service: string;
    region: string;
    accountId: string;
    resource: string;
}
/**
 * Validate whether a string is an ARN.
 */
export declare const validate: (str: any) => boolean;
/**
 * Parse an ARN string into structure with partition, service, region, accountId and resource values
 */
export declare const parse: (arn: string) => ARN;
type buildOptions = Omit<ARN, "partition"> & {
    partition?: string;
};
/**
 * Build an ARN with service, partition, region, accountId, and resources strings
 */
export declare const build: (arnObject: buildOptions) => string;
export {};
