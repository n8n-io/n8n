import { WaiterConfiguration, WaiterResult } from "@smithy/util-waiter";
import { DescribeProcessingJobCommandInput } from "../commands/DescribeProcessingJobCommand";
import { SageMakerClient } from "../SageMakerClient";
/**
 *
 *  @deprecated Use waitUntilProcessingJobCompletedOrStopped instead. waitForProcessingJobCompletedOrStopped does not throw error in non-success cases.
 */
export declare const waitForProcessingJobCompletedOrStopped: (params: WaiterConfiguration<SageMakerClient>, input: DescribeProcessingJobCommandInput) => Promise<WaiterResult>;
/**
 *
 *  @param params - Waiter configuration options.
 *  @param input - The input to DescribeProcessingJobCommand for polling.
 */
export declare const waitUntilProcessingJobCompletedOrStopped: (params: WaiterConfiguration<SageMakerClient>, input: DescribeProcessingJobCommandInput) => Promise<WaiterResult>;
