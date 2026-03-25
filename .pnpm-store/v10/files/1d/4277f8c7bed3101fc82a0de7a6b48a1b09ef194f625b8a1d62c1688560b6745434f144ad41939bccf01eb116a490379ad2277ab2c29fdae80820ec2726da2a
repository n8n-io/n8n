import type { Browser as PlaywrightBrowser, BrowserContext as PlaywrightContext, Page as PlaywrightPage } from "@playwright/test";
import { z } from "zod";
import type { ActOptions, ActResult, ExtractOptions, ExtractResult, ObserveOptions, ObserveResult } from "./stagehand";
export declare const defaultExtractSchema: z.ZodObject<{
    extraction: z.ZodString;
}, "strip", z.ZodTypeAny, {
    extraction?: string;
}, {
    extraction?: string;
}>;
export declare const pageTextSchema: z.ZodObject<{
    page_text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    page_text?: string;
}, {
    page_text?: string;
}>;
export interface Page extends Omit<PlaywrightPage, "on"> {
    act(action: string): Promise<ActResult>;
    act(options: ActOptions): Promise<ActResult>;
    act(observation: ObserveResult): Promise<ActResult>;
    extract(instruction: string): Promise<ExtractResult<typeof defaultExtractSchema>>;
    extract<T extends z.AnyZodObject>(options: ExtractOptions<T>): Promise<ExtractResult<T>>;
    extract(): Promise<ExtractResult<typeof pageTextSchema>>;
    observe(): Promise<ObserveResult[]>;
    observe(instruction: string): Promise<ObserveResult[]>;
    observe(options?: ObserveOptions): Promise<ObserveResult[]>;
    on: {
        (event: "popup", listener: (page: Page) => unknown): Page;
    } & PlaywrightPage["on"];
}
export type BrowserContext = PlaywrightContext;
export type Browser = PlaywrightBrowser;
