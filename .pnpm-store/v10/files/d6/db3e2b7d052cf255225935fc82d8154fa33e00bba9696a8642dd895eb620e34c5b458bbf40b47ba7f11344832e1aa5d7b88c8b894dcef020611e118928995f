import type * as proto from "./shared/proto.js";
export interface DescribeResult {
    paramNames: Array<string | undefined>;
    columns: Array<DescribeColumn>;
    isExplain: boolean;
    isReadonly: boolean;
}
export interface DescribeColumn {
    name: string;
    decltype: string | undefined;
}
export declare function describeResultFromProto(result: proto.DescribeResult): DescribeResult;
