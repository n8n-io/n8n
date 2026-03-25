import { WaiterConfiguration, WaiterResult } from "@smithy/util-waiter";
import { DescribeTrainingJobCommandInput } from "../commands/DescribeTrainingJobCommand";
import { SageMakerClient } from "../SageMakerClient";
/**
 *
 *  @deprecated Use waitUntilTrainingJobCompletedOrStopped instead. waitForTrainingJobCompletedOrStopped does not throw error in non-success cases.
 */
export declare const waitForTrainingJobCompletedOrStopped: (params: WaiterConfiguration<SageMakerClient>, input: DescribeTrainingJobCommandInput) => Promise<WaiterResult>;
/**
 *
 *  @param params - Waiter configuration options.
 *  @param input - The input to DescribeTrainingJobCommand for polling.
 */
export declare const waitUntilTrainingJobCompletedOrStopped: (params: WaiterConfiguration<SageMakerClient>, input: DescribeTrainingJobCommandInput) => Promise<WaiterResult>;
