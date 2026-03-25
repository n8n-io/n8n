import { WaiterConfiguration, WaiterResult } from "@smithy/util-waiter";
import { HeadObjectCommandInput } from "../commands/HeadObjectCommand";
import { S3Client } from "../S3Client";
/**
 *
 *  @deprecated Use waitUntilObjectExists instead. waitForObjectExists does not throw error in non-success cases.
 */
export declare const waitForObjectExists: (params: WaiterConfiguration<S3Client>, input: HeadObjectCommandInput) => Promise<WaiterResult>;
/**
 *
 *  @param params - Waiter configuration options.
 *  @param input - The input to HeadObjectCommand for polling.
 */
export declare const waitUntilObjectExists: (params: WaiterConfiguration<S3Client>, input: HeadObjectCommandInput) => Promise<WaiterResult>;
