import { z, ZodType } from 'zod';
import { Cookie, Page as Page$1, BrowserContext as BrowserContext$1, Browser as Browser$1, CDPSession } from '@playwright/test';
import Browserbase from '@browserbasehq/sdk';
import { ClientOptions as ClientOptions$2 } from '@anthropic-ai/sdk';
import { ClientOptions as ClientOptions$1 } from 'openai';

type LogLine = {
    id?: string;
    category?: string;
    message: string;
    level?: 0 | 1 | 2;
    timestamp?: string;
    auxiliary?: {
        [key: string]: {
            value: string;
            type: "object" | "string" | "html" | "integer" | "float" | "boolean";
        };
    };
};

declare const AvailableModelSchema: z.ZodEnum<["gpt-4o", "gpt-4o-mini", "gpt-4o-2024-08-06", "gpt-4.5-preview", "claude-3-5-sonnet-latest", "claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620", "claude-3-7-sonnet-latest", "claude-3-7-sonnet-20250219", "o1-mini", "o1-preview", "o3-mini", "cerebras-llama-3.3-70b", "cerebras-llama-3.1-8b", "groq-llama-3.3-70b-versatile", "groq-llama-3.3-70b-specdec"]>;
type AvailableModel = z.infer<typeof AvailableModelSchema>;
type ModelProvider = "openai" | "anthropic" | "cerebras" | "groq";
type ClientOptions = ClientOptions$1 | ClientOptions$2;
interface AnthropicJsonSchemaObject {
    definitions?: {
        MySchema?: {
            properties?: Record<string, unknown>;
            required?: string[];
        };
    };
    properties?: Record<string, unknown>;
    required?: string[];
}

interface LLMTool {
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: ChatMessageContent;
}
type ChatMessageContent = string | (ChatMessageImageContent | ChatMessageTextContent)[];
interface ChatMessageImageContent {
    type: "image_url";
    image_url: {
        url: string;
    };
    text?: string;
}
interface ChatMessageTextContent {
    type: string;
    text: string;
}
declare const AnnotatedScreenshotText = "This is a screenshot of the current page state with the elements annotated on it. Each element id is annotated with a number to the top left of it. Duplicate annotations at the same location are under each other vertically.";
interface ChatCompletionOptions {
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    image?: {
        buffer: Buffer;
        description?: string;
    };
    response_model?: {
        name: string;
        schema: ZodType;
    };
    tools?: LLMTool[];
    tool_choice?: "auto" | "none" | "required";
    maxTokens?: number;
    requestId: string;
}
type LLMResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string | null;
            tool_calls: {
                id: string;
                type: string;
                function: {
                    name: string;
                    arguments: string;
                };
            }[];
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};
interface CreateChatCompletionOptions {
    options: ChatCompletionOptions;
    logger: (message: LogLine) => void;
    retries?: number;
}
declare abstract class LLMClient {
    type: "openai" | "anthropic" | "cerebras" | "groq" | string;
    modelName: AvailableModel;
    hasVision: boolean;
    clientOptions: ClientOptions;
    userProvidedInstructions?: string;
    constructor(modelName: AvailableModel, userProvidedInstructions?: string);
    abstract createChatCompletion<T = LLMResponse>(options: CreateChatCompletionOptions): Promise<T>;
}

declare class LLMProvider {
    private logger;
    private enableCaching;
    private cache;
    constructor(logger: (message: LogLine) => void, enableCaching: boolean);
    cleanRequestCache(requestId: string): void;
    getClient(modelName: AvailableModel, clientOptions?: ClientOptions): LLMClient;
    static getModelProvider(modelName: AvailableModel): ModelProvider;
}

interface ConstructorParams {
    env: "LOCAL" | "BROWSERBASE";
    apiKey?: string;
    projectId?: string;
    verbose?: 0 | 1 | 2;
    debugDom?: boolean;
    llmProvider?: LLMProvider;
    /** @deprecated Please use `localBrowserLaunchOptions` instead. That will override this. */
    headless?: boolean;
    logger?: (message: LogLine) => void | Promise<void>;
    domSettleTimeoutMs?: number;
    browserbaseSessionCreateParams?: Browserbase.Sessions.SessionCreateParams;
    enableCaching?: boolean;
    browserbaseSessionID?: string;
    modelName?: AvailableModel;
    llmClient?: LLMClient;
    modelClientOptions?: ClientOptions;
    /**
     * Instructions for stagehand.
     */
    systemPrompt?: string;
    /**
     * Offload Stagehand method calls to the Stagehand API.
     */
    useAPI?: boolean;
    selfHeal?: boolean;
    /**
     * Wait for captchas to be solved after navigation when using Browserbase environment.
     *
     * @default false
     */
    waitForCaptchaSolves?: boolean;
    localBrowserLaunchOptions?: LocalBrowserLaunchOptions;
    actTimeoutMs?: number;
}
interface InitOptions {
    /** @deprecated Pass this into the Stagehand constructor instead. This will be removed in the next major version. */
    modelName?: AvailableModel;
    /** @deprecated Pass this into the Stagehand constructor instead. This will be removed in the next major version. */
    modelClientOptions?: ClientOptions;
    /** @deprecated Pass this into the Stagehand constructor instead. This will be removed in the next major version. */
    domSettleTimeoutMs?: number;
}
interface InitResult {
    debugUrl: string;
    sessionUrl: string;
    sessionId: string;
}
interface InitFromPageOptions {
    page: Page;
    /** @deprecated Pass this into the Stagehand constructor instead. This will be removed in the next major version. */
    modelName?: AvailableModel;
    /** @deprecated Pass this into the Stagehand constructor instead. This will be removed in the next major version. */
    modelClientOptions?: ClientOptions;
}
interface InitFromPageResult {
    context: BrowserContext;
}
interface ActOptions {
    action: string;
    modelName?: AvailableModel;
    modelClientOptions?: ClientOptions;
    /** @deprecated Vision is not supported in this version of Stagehand. */
    useVision?: boolean;
    variables?: Record<string, string>;
    domSettleTimeoutMs?: number;
    /**
     * If true, the action will be performed in a slow manner that allows the DOM to settle.
     * This is useful for debugging.
     *
     * @default true
     */
    slowDomBasedAct?: boolean;
    timeoutMs?: number;
}
interface ActResult {
    success: boolean;
    message: string;
    action: string;
}
interface ExtractOptions<T extends z.AnyZodObject> {
    instruction: string;
    schema: T;
    modelName?: AvailableModel;
    modelClientOptions?: ClientOptions;
    domSettleTimeoutMs?: number;
    useTextExtract?: boolean;
    selector?: string;
}
type ExtractResult<T extends z.AnyZodObject> = z.infer<T>;
interface ObserveOptions {
    instruction?: string;
    modelName?: AvailableModel;
    modelClientOptions?: ClientOptions;
    /** @deprecated Vision is not supported in this version of Stagehand. */
    useVision?: boolean;
    domSettleTimeoutMs?: number;
    returnAction?: boolean;
    onlyVisible?: boolean;
    /** @deprecated `useAccessibilityTree` is now deprecated. Use `onlyVisible` instead. */
    useAccessibilityTree?: boolean;
    drawOverlay?: boolean;
}
interface ObserveResult {
    selector: string;
    description: string;
    backendNodeId?: number;
    method?: string;
    arguments?: string[];
}
interface LocalBrowserLaunchOptions {
    args?: string[];
    chromiumSandbox?: boolean;
    devtools?: boolean;
    env?: Record<string, string | number | boolean>;
    executablePath?: string;
    handleSIGHUP?: boolean;
    handleSIGINT?: boolean;
    handleSIGTERM?: boolean;
    headless?: boolean;
    ignoreDefaultArgs?: boolean | Array<string>;
    proxy?: {
        server: string;
        bypass?: string;
        username?: string;
        password?: string;
    };
    tracesDir?: string;
    userDataDir?: string;
    acceptDownloads?: boolean;
    downloadsPath?: string;
    extraHTTPHeaders?: Record<string, string>;
    geolocation?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    hasTouch?: boolean;
    ignoreHTTPSErrors?: boolean;
    locale?: string;
    permissions?: Array<string>;
    recordHar?: {
        omitContent?: boolean;
        content?: "omit" | "embed" | "attach";
        path: string;
        mode?: "full" | "minimal";
        urlFilter?: string | RegExp;
    };
    recordVideo?: {
        dir: string;
        size?: {
            width: number;
            height: number;
        };
    };
    viewport?: {
        width: number;
        height: number;
    };
    deviceScaleFactor?: number;
    timezoneId?: string;
    bypassCSP?: boolean;
    cookies?: Cookie[];
}

declare const defaultExtractSchema: z.ZodObject<{
    extraction: z.ZodString;
}, "strip", z.ZodTypeAny, {
    extraction?: string;
}, {
    extraction?: string;
}>;
declare const pageTextSchema: z.ZodObject<{
    page_text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    page_text?: string;
}, {
    page_text?: string;
}>;
interface Page extends Omit<Page$1, "on"> {
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
    } & Page$1["on"];
}
type BrowserContext = BrowserContext$1;
type Browser = Browser$1;

interface EnhancedContext extends Omit<BrowserContext$1, "newPage" | "pages"> {
    newPage(): Promise<Page>;
    pages(): Page[];
}

interface StagehandAPIConstructorParams {
    apiKey: string;
    projectId: string;
    logger: (message: LogLine) => void;
}
interface StartSessionParams {
    modelName: string;
    modelApiKey: string;
    domSettleTimeoutMs: number;
    verbose: number;
    debugDom: boolean;
    systemPrompt?: string;
    browserbaseSessionCreateParams?: Browserbase.Sessions.SessionCreateParams;
}
interface StartSessionResult {
    sessionId: string;
}

declare class PlaywrightCommandException extends Error {
    constructor(message: string);
}
declare class PlaywrightCommandMethodNotSupportedException extends Error {
    constructor(message: string);
}
interface GotoOptions {
    timeout?: number;
    waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
    referer?: string;
}

declare class StagehandAPI {
    private apiKey;
    private projectId;
    private sessionId?;
    private logger;
    constructor({ apiKey, projectId, logger }: StagehandAPIConstructorParams);
    init({ modelName, modelApiKey, domSettleTimeoutMs, verbose, debugDom, systemPrompt, browserbaseSessionCreateParams, }: StartSessionParams): Promise<StartSessionResult>;
    act(options: ActOptions): Promise<ActResult>;
    extract<T extends z.AnyZodObject>(options: ExtractOptions<T>): Promise<ExtractResult<T>>;
    observe(options?: ObserveOptions): Promise<ObserveResult[]>;
    goto(url: string, options?: GotoOptions): Promise<void>;
    end(): Promise<Response>;
    private execute;
    private request;
}

declare class StagehandContext {
    private readonly stagehand;
    private readonly intContext;
    private pageMap;
    private activeStagehandPage;
    private constructor();
    private createStagehandPage;
    static init(context: BrowserContext$1, stagehand: Stagehand): Promise<StagehandContext>;
    get context(): EnhancedContext;
    getStagehandPage(page: Page$1): Promise<StagehandPage>;
    getStagehandPages(): Promise<StagehandPage[]>;
    setActivePage(page: StagehandPage): void;
    getActivePage(): StagehandPage | null;
}

declare class StagehandPage {
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
    constructor(page: Page$1, stagehand: Stagehand, context: StagehandContext, llmClient: LLMClient, userProvidedInstructions?: string, api?: StagehandAPI, waitForCaptchaSolves?: boolean);
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

interface BrowserResult {
    env: "LOCAL" | "BROWSERBASE";
    browser?: Browser;
    context: BrowserContext;
    debugUrl?: string;
    sessionUrl?: string;
    contextPath?: string;
    sessionId?: string;
}

declare class Stagehand {
    private stagehandPage;
    private stagehandContext;
    private intEnv;
    browserbaseSessionID?: string;
    readonly domSettleTimeoutMs: number;
    readonly debugDom: boolean;
    readonly headless: boolean;
    verbose: 0 | 1 | 2;
    llmProvider: LLMProvider;
    enableCaching: boolean;
    private apiKey;
    private projectId;
    private externalLogger?;
    private browserbaseSessionCreateParams?;
    variables: {
        [key: string]: unknown;
    };
    private contextPath?;
    llmClient: LLMClient;
    readonly userProvidedInstructions?: string;
    private usingAPI;
    private modelName;
    apiClient: StagehandAPI | undefined;
    readonly waitForCaptchaSolves: boolean;
    private localBrowserLaunchOptions?;
    readonly selfHeal: boolean;
    private cleanupCalled;
    readonly actTimeoutMs: number;
    protected setActivePage(page: StagehandPage): void;
    get page(): Page;
    constructor({ env, apiKey, projectId, verbose, debugDom, llmProvider, llmClient, headless, logger, browserbaseSessionCreateParams, domSettleTimeoutMs, enableCaching, browserbaseSessionID, modelName, modelClientOptions, systemPrompt, useAPI, localBrowserLaunchOptions, selfHeal, waitForCaptchaSolves, actTimeoutMs, }?: ConstructorParams);
    private registerSignalHandlers;
    get logger(): (logLine: LogLine) => void;
    get env(): "LOCAL" | "BROWSERBASE";
    get context(): EnhancedContext;
    init(
    /** @deprecated Use constructor options instead */
    initOptions?: InitOptions): Promise<InitResult>;
    /** @deprecated initFromPage is deprecated and will be removed in the next major version. */
    initFromPage({ page, }: InitFromPageOptions): Promise<InitFromPageResult>;
    private pending_logs_to_send_to_browserbase;
    private is_processing_browserbase_logs;
    log(logObj: LogLine): void;
    private _run_browserbase_log_processing_cycle;
    private _log_to_browserbase;
    /** @deprecated Use stagehand.page.act() instead. This will be removed in the next major release. */
    act(options: ActOptions): Promise<ActResult>;
    /** @deprecated Use stagehand.page.extract() instead. This will be removed in the next major release. */
    extract<T extends z.AnyZodObject>(options: ExtractOptions<T>): Promise<ExtractResult<T>>;
    /** @deprecated Use stagehand.page.observe() instead. This will be removed in the next major release. */
    observe(options?: ObserveOptions): Promise<ObserveResult[]>;
    close(): Promise<void>;
}

export { type ActOptions, type ActResult, AnnotatedScreenshotText, type AnthropicJsonSchemaObject, type AvailableModel, AvailableModelSchema, type Browser, type BrowserContext, type BrowserResult, type ChatCompletionOptions, type ChatMessage, type ChatMessageContent, type ChatMessageImageContent, type ChatMessageTextContent, type ClientOptions, type ConstructorParams, type CreateChatCompletionOptions, type ExtractOptions, type ExtractResult, type GotoOptions, type InitFromPageOptions, type InitFromPageResult, type InitOptions, type InitResult, LLMClient, type LLMResponse, type LocalBrowserLaunchOptions, type LogLine, type ModelProvider, type ObserveOptions, type ObserveResult, type Page, PlaywrightCommandException, PlaywrightCommandMethodNotSupportedException, Stagehand, defaultExtractSchema, pageTextSchema };
