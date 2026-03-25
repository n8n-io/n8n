import { LogLine } from "../../types/log";
import { LLMClient } from "../llm/LLMClient";
import { LLMProvider } from "../llm/LLMProvider";
import { StagehandContext } from "../StagehandContext";
import { StagehandPage } from "../StagehandPage";
import { ActResult, ObserveResult, ActOptions } from "@/types/stagehand";
/**
 * NOTE: Vision support has been removed from this version of Stagehand.
 * If useVision or verifierUseVision is set to true, a warning is logged and
 * the flow continues as if vision = false.
 */
export declare class StagehandActHandler {
    private readonly stagehandPage;
    private readonly verbose;
    private readonly llmProvider;
    private readonly enableCaching;
    private readonly logger;
    private readonly actionCache;
    private readonly actions;
    private readonly userProvidedInstructions?;
    private readonly selfHeal;
    private readonly waitForCaptchaSolves;
    constructor({ verbose, llmProvider, enableCaching, logger, stagehandPage, userProvidedInstructions, selfHeal, waitForCaptchaSolves, }: {
        verbose: 0 | 1 | 2;
        llmProvider: LLMProvider;
        enableCaching: boolean;
        logger: (logLine: LogLine) => void;
        llmClient: LLMClient;
        stagehandPage: StagehandPage;
        stagehandContext: StagehandContext;
        userProvidedInstructions?: string;
        selfHeal: boolean;
        waitForCaptchaSolves: boolean;
    });
    /**
     * Perform an immediate Playwright action based on an ObserveResult object
     * that was returned from `page.observe(...)`.
     */
    actFromObserveResult(observe: ObserveResult, domSettleTimeoutMs?: number): Promise<ActResult>;
    /**
     * Perform an act based on an instruction.
     * This method will observe the page and then perform the act on the first element returned.
     */
    observeAct(actionOrOptions: ActOptions): Promise<ActResult>;
    private _recordAction;
    private _verifyActionCompletion;
    private _performPlaywrightMethod;
    private _getComponentString;
    act({ action, steps, chunksSeen, llmClient, retries, requestId, variables, previousSelectors, skipActionCacheForThisStep, domSettleTimeoutMs, timeoutMs, startTime, }: {
        action: string;
        steps?: string;
        chunksSeen: number[];
        llmClient: LLMClient;
        retries?: number;
        requestId?: string;
        variables: Record<string, string>;
        previousSelectors: string[];
        skipActionCacheForThisStep: boolean;
        domSettleTimeoutMs?: number;
        timeoutMs?: number;
        startTime?: number;
    }): Promise<{
        success: boolean;
        message: string;
        action: string;
    }>;
}
