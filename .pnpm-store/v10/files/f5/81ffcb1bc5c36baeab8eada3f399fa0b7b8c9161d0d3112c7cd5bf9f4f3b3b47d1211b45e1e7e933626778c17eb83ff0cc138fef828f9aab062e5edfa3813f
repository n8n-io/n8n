export interface ARN {
  partition: string;
  service: string;
  region: string;
  accountId: string;
  resource: string;
}
export declare const validate: (str: any) => boolean;
export declare const parse: (arn: string) => ARN;
type buildOptions = Pick<ARN, Exclude<keyof ARN, "partition">> & {
  partition?: string;
};
export declare const build: (arnObject: buildOptions) => string;
export {};
