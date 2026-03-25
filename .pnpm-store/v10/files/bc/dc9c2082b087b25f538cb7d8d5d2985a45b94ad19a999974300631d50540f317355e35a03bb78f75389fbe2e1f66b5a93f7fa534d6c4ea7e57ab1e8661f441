import { WaiterConfiguration, WaiterResult } from "@smithy/util-waiter";
import { HeadBucketCommandInput } from "../commands/HeadBucketCommand";
import { S3Client } from "../S3Client";
/**
 *
 *  @deprecated Use waitUntilBucketNotExists instead. waitForBucketNotExists does not throw error in non-success cases.
 */
export declare const waitForBucketNotExists: (params: WaiterConfiguration<S3Client>, input: HeadBucketCommandInput) => Promise<WaiterResult>;
/**
 *
 *  @param params - Waiter configuration options.
 *  @param input - The input to HeadBucketCommand for polling.
 */
export declare const waitUntilBucketNotExists: (params: WaiterConfiguration<S3Client>, input: HeadBucketCommandInput) => Promise<WaiterResult>;
