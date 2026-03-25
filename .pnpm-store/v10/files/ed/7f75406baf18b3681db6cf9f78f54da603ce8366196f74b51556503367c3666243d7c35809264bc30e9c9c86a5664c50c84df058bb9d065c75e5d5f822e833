import { WaiterConfiguration, WaiterResult } from "@smithy/util-waiter";
import { HeadBucketCommandInput } from "../commands/HeadBucketCommand";
import { S3Client } from "../S3Client";
/**
 *
 *  @deprecated Use waitUntilBucketExists instead. waitForBucketExists does not throw error in non-success cases.
 */
export declare const waitForBucketExists: (params: WaiterConfiguration<S3Client>, input: HeadBucketCommandInput) => Promise<WaiterResult>;
/**
 *
 *  @param params - Waiter configuration options.
 *  @param input - The input to HeadBucketCommand for polling.
 */
export declare const waitUntilBucketExists: (params: WaiterConfiguration<S3Client>, input: HeadBucketCommandInput) => Promise<WaiterResult>;
