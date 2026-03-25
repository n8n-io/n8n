import type { BrowserContext as PlaywrightContext, Page as PlaywrightPage } from "@playwright/test";
import { Stagehand } from "./index";
import { StagehandPage } from "./StagehandPage";
import { EnhancedContext } from "../types/context";
export declare class StagehandContext {
    private readonly stagehand;
    private readonly intContext;
    private pageMap;
    private activeStagehandPage;
    private constructor();
    private createStagehandPage;
    static init(context: PlaywrightContext, stagehand: Stagehand): Promise<StagehandContext>;
    get context(): EnhancedContext;
    getStagehandPage(page: PlaywrightPage): Promise<StagehandPage>;
    getStagehandPages(): Promise<StagehandPage[]>;
    setActivePage(page: StagehandPage): void;
    getActivePage(): StagehandPage | null;
}
