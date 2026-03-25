/**
 * This file provides a function to initialize a Stagehand instance for use in evaluations.
 * It configures the Stagehand environment and sets default options based on the current environment
 * (e.g., local or BROWSERBASE), caching preferences, and verbosity. It also establishes a logger for
 * capturing logs emitted by Stagehand.
 *
 * We create a central config object (`StagehandConfig`) that defines all parameters for Stagehand.
 *
 * The `initStagehand` function takes the model name, an optional DOM settling timeout, and an EvalLogger,
 * then uses these to override some default values before creating and initializing the Stagehand instance.
 */
import { AvailableModel, ConstructorParams, Stagehand } from "@/dist";
import { EvalLogger } from "./logger";
/**
 * Initializes a Stagehand instance for a given model:
 * - modelName: The model to use (overrides default in StagehandConfig)
 * - domSettleTimeoutMs: Optional timeout for DOM settling operations
 * - logger: An EvalLogger instance for capturing logs
 *
 * Returns:
 * - stagehand: The initialized Stagehand instance
 * - logger: The provided logger, associated with the Stagehand instance
 * - initResponse: Any response data returned by Stagehand initialization
 */
export declare const initStagehand: ({ modelName, domSettleTimeoutMs, logger, configOverrides, actTimeoutMs, }: {
    modelName: AvailableModel;
    domSettleTimeoutMs?: number;
    logger: EvalLogger;
    configOverrides?: Partial<ConstructorParams>;
    actTimeoutMs?: number;
}) => Promise<{
    stagehand: Stagehand;
    logger: EvalLogger;
    initResponse: import("@/dist").InitResult;
}>;
