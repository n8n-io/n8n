import type { CDPSession, Page as PlaywrightPage } from "@playwright/test";
import { z } from "zod";
import { Page, defaultExtractSchema } from "../types/page";
import { ExtractOptions, ExtractResult, ObserveOptions, ObserveResult } from "../types/stagehand";
import { StagehandAPI } from "./api";
import { ActOptions, ActResult, Stagehand } from "./index";
import { LLMClient } from "./llm/LLMClient";
import { StagehandContext } from "./StagehandContext";
import { EnhancedContext } from "../types/context";
export declare class StagehandPage {
    private stagehand;
    private intPage;
    private intContext;
    private actHandler;
    private extractHandler;
    private observeHandler;
    private llmClient;
    private cdpClient;
    private api;
    private userProvidedInstructions?;
    private waitForCaptchaSolves;
    private initialized;
    constructor(page: PlaywrightPage, stagehand: Stagehand, context: StagehandContext, llmClient: LLMClient, userProvidedInstructions?: string, api?: StagehandAPI, waitForCaptchaSolves?: boolean);
    private _refreshPageFromAPI;
    /**
     * Waits for a captcha to be solved when using Browserbase environment.
     *
     * @param timeoutMs - Optional timeout in milliseconds. If provided, the promise will reject if the captcha solving hasn't started within the given time.
     * @throws Error if called in a LOCAL environment
     * @throws Error if the timeout is reached before captcha solving starts
     * @returns Promise that resolves when the captcha is solved
     */
    waitForCaptchaSolve(timeoutMs?: number): Promise<void>;
    init(): Promise<StagehandPage>;
    get page(): Page;
    get context(): EnhancedContext;
    _waitForSettledDom(timeoutMs?: number): Promise<void>;
    startDomDebug(): Promise<void>;
    cleanupDomDebug(): Promise<void>;
    act(actionOrOptions: string | ActOptions | ObserveResult): Promise<ActResult>;
    extract<T extends z.AnyZodObject = typeof defaultExtractSchema>(instructionOrOptions?: string | ExtractOptions<T>): Promise<ExtractResult<T>>;
    observe(instructionOrOptions?: string | ObserveOptions): Promise<ObserveResult[]>;
    getCDPClient(): Promise<CDPSession>;
    sendCDP<T>(command: string, args?: Record<string, unknown>): Promise<T>;
    enableCDP(domain: string): Promise<void>;
    disableCDP(domain: string): Promise<void>;
}
