import { WaiterConfiguration, WaiterResult } from "@smithy/util-waiter";
import { DescribeImageCommandInput } from "../commands/DescribeImageCommand";
import { SageMakerClient } from "../SageMakerClient";
/**
 *
 *  @deprecated Use waitUntilImageCreated instead. waitForImageCreated does not throw error in non-success cases.
 */
export declare const waitForImageCreated: (params: WaiterConfiguration<SageMakerClient>, input: DescribeImageCommandInput) => Promise<WaiterResult>;
/**
 *
 *  @param params - Waiter configuration options.
 *  @param input - The input to DescribeImageCommand for polling.
 */
export declare const waitUntilImageCreated: (params: WaiterConfiguration<SageMakerClient>, input: DescribeImageCommandInput) => Promise<WaiterResult>;
