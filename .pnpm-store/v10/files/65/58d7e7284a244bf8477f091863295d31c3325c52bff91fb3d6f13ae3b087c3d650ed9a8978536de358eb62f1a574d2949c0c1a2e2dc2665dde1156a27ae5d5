import { Browserbase } from "@browserbasehq/sdk";
import type { CDPSession, Page as PlaywrightPage } from "@playwright/test";
import { chromium } from "@playwright/test";
import { z } from "zod";
import { Page, defaultExtractSchema } from "../types/page";
import {
  ExtractOptions,
  ExtractResult,
  ObserveOptions,
  ObserveResult,
} from "../types/stagehand";
import { StagehandAPI } from "./api";
import { StagehandActHandler } from "./handlers/actHandler";
import { StagehandExtractHandler } from "./handlers/extractHandler";
import { StagehandObserveHandler } from "./handlers/observeHandler";
import { ActOptions, ActResult, GotoOptions, Stagehand } from "./index";
import { LLMClient } from "./llm/LLMClient";
import { StagehandContext } from "./StagehandContext";
import { EnhancedContext } from "../types/context";
import { clearOverlays } from "./utils";

const BROWSERBASE_REGION_DOMAIN = {
  "us-west-2": "wss://connect.usw2.browserbase.com",
  "us-east-1": "wss://connect.use1.browserbase.com",
  "eu-central-1": "wss://connect.euc1.browserbase.com",
  "ap-southeast-1": "wss://connect.apse1.browserbase.com",
};

export class StagehandPage {
  private stagehand: Stagehand;
  private intPage: Page;
  private intContext: StagehandContext;
  private actHandler: StagehandActHandler;
  private extractHandler: StagehandExtractHandler;
  private observeHandler: StagehandObserveHandler;
  private llmClient: LLMClient;
  private cdpClient: CDPSession | null = null;
  private api: StagehandAPI;
  private userProvidedInstructions?: string;
  private waitForCaptchaSolves: boolean;
  private initialized: boolean = false;

  constructor(
    page: PlaywrightPage,
    stagehand: Stagehand,
    context: StagehandContext,
    llmClient: LLMClient,
    userProvidedInstructions?: string,
    api?: StagehandAPI,
    waitForCaptchaSolves?: boolean,
  ) {
    // Create a proxy to intercept all method calls and property access
    this.intPage = new Proxy(page, {
      get: (target: PlaywrightPage, prop: keyof PlaywrightPage) => {
        // Special handling for our enhanced methods before initialization
        if (
          !this.initialized &&
          (prop === ("act" as keyof Page) ||
            prop === ("extract" as keyof Page) ||
            prop === ("observe" as keyof Page) ||
            prop === ("on" as keyof Page))
        ) {
          return () => {
            throw new Error(
              `You seem to be calling \`${String(prop)}\` on a page in an uninitialized \`Stagehand\` object. Ensure you are running \`await stagehand.init()\` on the Stagehand object before referencing the \`page\` object.`,
            );
          };
        }

        const value = target[prop];
        // If the property is a function, wrap it to update active page before execution
        if (typeof value === "function" && prop !== "on") {
          return (...args: unknown[]) => {
            // Update active page before executing the method
            this.intContext.setActivePage(this);
            return value.apply(target, args);
          };
        }
        return value;
      },
    }) as Page;

    this.stagehand = stagehand;
    this.intContext = context;
    this.llmClient = llmClient;
    this.api = api;
    this.userProvidedInstructions = userProvidedInstructions;
    this.waitForCaptchaSolves = waitForCaptchaSolves ?? false;

    if (this.llmClient) {
      this.actHandler = new StagehandActHandler({
        verbose: this.stagehand.verbose,
        llmProvider: this.stagehand.llmProvider,
        enableCaching: this.stagehand.enableCaching,
        logger: this.stagehand.logger,
        stagehandPage: this,
        stagehandContext: this.intContext,
        llmClient: llmClient,
        userProvidedInstructions,
        selfHeal: this.stagehand.selfHeal,
        waitForCaptchaSolves: this.waitForCaptchaSolves,
      });
      this.extractHandler = new StagehandExtractHandler({
        stagehand: this.stagehand,
        logger: this.stagehand.logger,
        stagehandPage: this,
        userProvidedInstructions,
      });
      this.observeHandler = new StagehandObserveHandler({
        stagehand: this.stagehand,
        logger: this.stagehand.logger,
        stagehandPage: this,
        userProvidedInstructions,
      });
    }
  }

  private async _refreshPageFromAPI() {
    if (!this.api) return;

    const sessionId = this.stagehand.browserbaseSessionID;
    if (!sessionId) {
      throw new Error("No Browserbase session ID found");
    }

    const browserbase = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY,
    });

    const sessionStatus = await browserbase.sessions.retrieve(sessionId);
    const browserbaseDomain =
      BROWSERBASE_REGION_DOMAIN[sessionStatus.region] ||
      "wss://connect.browserbase.com";
    const connectUrl = `${browserbaseDomain}?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;

    const browser = await chromium.connectOverCDP(connectUrl);
    const context = browser.contexts()[0];
    const newPage = context.pages()[0];

    const newStagehandPage = await new StagehandPage(
      newPage,
      this.stagehand,
      this.intContext,
      this.llmClient,
      this.userProvidedInstructions,
      this.api,
    ).init();

    this.intPage = newStagehandPage.page;

    if (this.stagehand.debugDom) {
      await this.intPage.evaluate(
        (debugDom) => (window.showChunks = debugDom),
        this.stagehand.debugDom,
      );
    }
    await this.intPage.waitForLoadState("domcontentloaded");
    await this._waitForSettledDom();
  }

  /**
   * Waits for a captcha to be solved when using Browserbase environment.
   *
   * @param timeoutMs - Optional timeout in milliseconds. If provided, the promise will reject if the captcha solving hasn't started within the given time.
   * @throws Error if called in a LOCAL environment
   * @throws Error if the timeout is reached before captcha solving starts
   * @returns Promise that resolves when the captcha is solved
   */
  public async waitForCaptchaSolve(timeoutMs?: number) {
    if (this.stagehand.env === "LOCAL") {
      throw new Error(
        "The waitForCaptcha method may only be used when using the Browserbase environment.",
      );
    }

    this.stagehand.log({
      category: "captcha",
      message: "Waiting for captcha",
      level: 1,
    });

    return new Promise<void>((resolve, reject) => {
      let started = false;
      let timeoutId: NodeJS.Timeout;

      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          if (!started) {
            reject(new Error("Captcha timeout"));
          }
        }, timeoutMs);
      }

      this.intPage.on("console", (msg) => {
        if (msg.text() === "browserbase-solving-finished") {
          this.stagehand.log({
            category: "captcha",
            message: "Captcha solving finished",
            level: 1,
          });
          if (timeoutId) clearTimeout(timeoutId);
          resolve();
        } else if (msg.text() === "browserbase-solving-started") {
          started = true;
          this.stagehand.log({
            category: "captcha",
            message: "Captcha solving started",
            level: 1,
          });
        }
      });
    });
  }

  async init(): Promise<StagehandPage> {
    const page = this.intPage;
    const stagehand = this.stagehand;

    // Create a proxy that updates active page on method calls
    const handler = {
      get: (target: PlaywrightPage, prop: string | symbol) => {
        const value = target[prop as keyof PlaywrightPage];

        // Handle enhanced methods
        if (prop === "act" || prop === "extract" || prop === "observe") {
          if (!this.llmClient) {
            return () => {
              throw new Error(
                "No LLM API key or LLM Client configured. An LLM API key or a custom LLM Client is required to use act, extract, or observe.",
              );
            };
          }

          // Use type assertion to safely call the method with proper typing
          type EnhancedMethod = (
            options:
              | ActOptions
              | ExtractOptions<z.AnyZodObject>
              | ObserveOptions,
          ) => Promise<
            ActResult | ExtractResult<z.AnyZodObject> | ObserveResult[]
          >;

          const method = this[prop as keyof StagehandPage] as EnhancedMethod;
          return async (options: unknown) => {
            this.intContext.setActivePage(this);
            return method.call(this, options);
          };
        }

        // Handle goto specially
        if (prop === "goto") {
          return async (url: string, options: GotoOptions) => {
            this.intContext.setActivePage(this);
            const result = this.api
              ? await this.api.goto(url, options)
              : await target.goto(url, options);

            if (this.waitForCaptchaSolves) {
              try {
                await this.waitForCaptchaSolve(1000);
              } catch {
                // ignore
              }
            }

            if (this.api) {
              await this._refreshPageFromAPI();
            } else {
              if (stagehand.debugDom) {
                await target.evaluate(
                  (debugDom) => (window.showChunks = debugDom),
                  stagehand.debugDom,
                );
              }
              await target.waitForLoadState("domcontentloaded");
              await this._waitForSettledDom();
            }
            return result;
          };
        }

        // Handle event listeners
        if (prop === "on") {
          return (
            event: keyof PlaywrightPage["on"],
            listener: Parameters<PlaywrightPage["on"]>[1],
          ) => {
            if (event === "popup") {
              return this.context.on("page", async (page: PlaywrightPage) => {
                const newContext = await StagehandContext.init(
                  page.context(),
                  stagehand,
                );
                const newStagehandPage = new StagehandPage(
                  page,
                  stagehand,
                  newContext,
                  this.llmClient,
                );

                await newStagehandPage.init();
                listener(newStagehandPage.page);
              });
            }
            this.intContext.setActivePage(this);
            return target.on(event, listener);
          };
        }

        // For all other method calls, update active page
        if (typeof value === "function") {
          return (...args: unknown[]) => {
            this.intContext.setActivePage(this);
            return value.apply(target, args);
          };
        }

        return value;
      },
    };

    this.intPage = new Proxy(page, handler) as unknown as Page;
    this.initialized = true;
    return this;
  }

  public get page(): Page {
    return this.intPage;
  }

  public get context(): EnhancedContext {
    return this.intContext.context;
  }

  // We can make methods public because StagehandPage is private to the Stagehand class.
  // When a user gets stagehand.page, they are getting a proxy to the Playwright page.
  // We can override the methods on the proxy to add our own behavior
  public async _waitForSettledDom(timeoutMs?: number) {
    try {
      const timeout = timeoutMs ?? this.stagehand.domSettleTimeoutMs;
      let timeoutHandle: NodeJS.Timeout;

      await this.page.waitForLoadState("domcontentloaded");

      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(() => {
          this.stagehand.log({
            category: "dom",
            message: "DOM settle timeout exceeded, continuing anyway",
            level: 1,
            auxiliary: {
              timeout_ms: {
                value: timeout.toString(),
                type: "integer",
              },
            },
          });
          resolve();
        }, timeout);
      });

      try {
        await Promise.race([
          this.page.evaluate(() => {
            return new Promise<void>((resolve) => {
              if (typeof window.waitForDomSettle === "function") {
                window.waitForDomSettle().then(resolve);
              } else {
                console.warn(
                  "waitForDomSettle is not defined, considering DOM as settled",
                );
                resolve();
              }
            });
          }),
          this.page.waitForLoadState("domcontentloaded"),
          this.page.waitForSelector("body"),
          timeoutPromise,
        ]);
      } finally {
        clearTimeout(timeoutHandle!);
      }
    } catch (e) {
      this.stagehand.log({
        category: "dom",
        message: "Error in waitForSettledDom",
        level: 1,
        auxiliary: {
          error: {
            value: e.message,
            type: "string",
          },
          trace: {
            value: e.stack,
            type: "string",
          },
        },
      });
    }
  }

  public async startDomDebug() {
    if (this.stagehand.debugDom) {
      try {
        await this.page
          .evaluate(() => {
            if (typeof window.debugDom === "function") {
              window.debugDom();
            } else {
              this.stagehand.log({
                category: "dom",
                message: "debugDom is not defined",
                level: 1,
              });
            }
          })
          .catch(() => {});
      } catch (e) {
        this.stagehand.log({
          category: "dom",
          message: "Error in startDomDebug",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string",
            },
            trace: {
              value: e.stack,
              type: "string",
            },
          },
        });
      }
    }
  }

  public async cleanupDomDebug() {
    if (this.stagehand.debugDom) {
      await this.page.evaluate(() => window.cleanupDebug()).catch(() => {});
    }
  }

  async act(
    actionOrOptions: string | ActOptions | ObserveResult,
  ): Promise<ActResult> {
    if (!this.actHandler) {
      throw new Error("Act handler not initialized");
    }

    await clearOverlays(this.page);

    // If actionOrOptions is an ObserveResult, we call actFromObserveResult.
    // We need to ensure there is both a selector and a method in the ObserveResult.
    if (typeof actionOrOptions === "object" && actionOrOptions !== null) {
      // If it has selector AND method => treat as ObserveResult
      if ("selector" in actionOrOptions && "method" in actionOrOptions) {
        const observeResult = actionOrOptions as ObserveResult;
        // validate observeResult.method, etc.
        return this.actHandler.actFromObserveResult(observeResult);
      } else {
        // If it's an object but no selector/method,
        // check that it's truly ActOptions (i.e., has an `action` field).
        if (!("action" in actionOrOptions)) {
          throw new Error(
            "Invalid argument. Valid arguments are: a string, an ActOptions object, " +
              "or an ObserveResult WITH 'selector' and 'method' fields.",
          );
        }
      }
    } else if (typeof actionOrOptions === "string") {
      // Convert string to ActOptions
      actionOrOptions = { action: actionOrOptions };
    } else {
      throw new Error(
        "Invalid argument: you may have called act with an empty ObserveResult.\n" +
          "Valid arguments are: a string, an ActOptions object, or an ObserveResult " +
          "WITH 'selector' and 'method' fields.",
      );
    }

    const {
      action,
      modelName,
      modelClientOptions,
      useVision, // still destructure this but will not pass it on
      variables = {},
      domSettleTimeoutMs,
      slowDomBasedAct = true,
      timeoutMs = this.stagehand.actTimeoutMs,
    } = actionOrOptions;

    if (typeof useVision !== "undefined") {
      this.stagehand.log({
        category: "deprecation",
        message:
          "Warning: vision is not supported in this version of Stagehand",
        level: 1,
      });
    }

    if (this.api) {
      const result = await this.api.act(actionOrOptions);
      await this._refreshPageFromAPI();
      return result;
    }

    const requestId = Math.random().toString(36).substring(2);
    const llmClient: LLMClient = modelName
      ? this.stagehand.llmProvider.getClient(modelName, modelClientOptions)
      : this.llmClient;

    if (!slowDomBasedAct) {
      return this.actHandler.observeAct(actionOrOptions);
    }

    this.stagehand.log({
      category: "act",
      message: "running act",
      level: 1,
      auxiliary: {
        action: {
          value: action,
          type: "string",
        },
        requestId: {
          value: requestId,
          type: "string",
        },
        modelName: {
          value: llmClient.modelName,
          type: "string",
        },
      },
    });

    // `useVision` is no longer passed to the handler
    return this.actHandler
      .act({
        action,
        llmClient,
        chunksSeen: [],
        requestId,
        variables,
        previousSelectors: [],
        skipActionCacheForThisStep: false,
        domSettleTimeoutMs,
        timeoutMs,
      })
      .catch((e) => {
        this.stagehand.log({
          category: "act",
          message: "error acting",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string",
            },
            trace: {
              value: e.stack,
              type: "string",
            },
          },
        });

        return {
          success: false,
          message: `Internal error: Error acting: ${e.message}`,
          action: action,
        };
      });
  }

  async extract<T extends z.AnyZodObject = typeof defaultExtractSchema>(
    instructionOrOptions?: string | ExtractOptions<T>,
  ): Promise<ExtractResult<T>> {
    if (!this.extractHandler) {
      throw new Error("Extract handler not initialized");
    }

    await clearOverlays(this.page);

    // check if user called extract() with no arguments
    if (!instructionOrOptions) {
      return this.extractHandler.extract();
    }

    const options: ExtractOptions<T> =
      typeof instructionOrOptions === "string"
        ? {
            instruction: instructionOrOptions,
            schema: defaultExtractSchema as T,
          }
        : instructionOrOptions;

    const {
      instruction,
      schema,
      modelName,
      modelClientOptions,
      domSettleTimeoutMs,
      useTextExtract,
      selector,
    } = options;

    // Throw a NotImplementedError if the user passed in an `xpath`
    // and `useTextExtract` is false
    if (selector && useTextExtract !== true) {
      throw new Error(
        "NotImplementedError: Passing an xpath into extract is only supported when `useTextExtract: true`.",
      );
    }

    if (this.api) {
      return this.api.extract<T>(options);
    }

    const requestId = Math.random().toString(36).substring(2);
    const llmClient = modelName
      ? this.stagehand.llmProvider.getClient(modelName, modelClientOptions)
      : this.llmClient;

    this.stagehand.log({
      category: "extract",
      message: "running extract",
      level: 1,
      auxiliary: {
        instruction: {
          value: instruction,
          type: "string",
        },
        requestId: {
          value: requestId,
          type: "string",
        },
        modelName: {
          value: llmClient.modelName,
          type: "string",
        },
      },
    });

    return this.extractHandler
      .extract({
        instruction,
        schema,
        llmClient,
        requestId,
        domSettleTimeoutMs,
        useTextExtract,
        selector,
      })
      .catch((e) => {
        this.stagehand.log({
          category: "extract",
          message: "error extracting",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string",
            },
            trace: {
              value: e.stack,
              type: "string",
            },
          },
        });

        if (this.stagehand.enableCaching) {
          this.stagehand.llmProvider.cleanRequestCache(requestId);
        }

        throw e;
      });
  }

  async observe(
    instructionOrOptions?: string | ObserveOptions,
  ): Promise<ObserveResult[]> {
    if (!this.observeHandler) {
      throw new Error("Observe handler not initialized");
    }

    await clearOverlays(this.page);

    const options: ObserveOptions =
      typeof instructionOrOptions === "string"
        ? { instruction: instructionOrOptions }
        : instructionOrOptions || {};

    const {
      instruction,
      modelName,
      modelClientOptions,
      useVision, // still destructure but will not pass it on
      domSettleTimeoutMs,
      returnAction = true,
      onlyVisible = false,
      useAccessibilityTree,
      drawOverlay,
    } = options;

    if (useAccessibilityTree !== undefined) {
      this.stagehand.log({
        category: "deprecation",
        message:
          "useAccessibilityTree is deprecated.\n" +
          "  To use accessibility tree as context:\n" +
          "    1. Set onlyVisible to false (default)\n" +
          "    2. Don't declare useAccessibilityTree",
        level: 1,
      });
      throw new Error(
        "useAccessibilityTree is deprecated. Use onlyVisible instead.",
      );
    }

    if (typeof useVision !== "undefined") {
      this.stagehand.log({
        category: "deprecation",
        message:
          "Warning: vision is not supported in this version of Stagehand",
        level: 1,
      });
    }

    if (this.api) {
      return this.api.observe(options);
    }

    const requestId = Math.random().toString(36).substring(2);
    const llmClient = modelName
      ? this.stagehand.llmProvider.getClient(modelName, modelClientOptions)
      : this.llmClient;

    this.stagehand.log({
      category: "observe",
      message: "running observe",
      level: 1,
      auxiliary: {
        instruction: {
          value: instruction,
          type: "string",
        },
        requestId: {
          value: requestId,
          type: "string",
        },
        modelName: {
          value: llmClient.modelName,
          type: "string",
        },
        onlyVisible: {
          value: onlyVisible ? "true" : "false",
          type: "boolean",
        },
      },
    });

    return this.observeHandler
      .observe({
        instruction,
        llmClient,
        requestId,
        domSettleTimeoutMs,
        returnAction,
        onlyVisible,
        drawOverlay,
      })
      .catch((e) => {
        this.stagehand.log({
          category: "observe",
          message: "error observing",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string",
            },
            trace: {
              value: e.stack,
              type: "string",
            },
            requestId: {
              value: requestId,
              type: "string",
            },
            instruction: {
              value: instruction,
              type: "string",
            },
          },
        });

        if (this.stagehand.enableCaching) {
          this.stagehand.llmProvider.cleanRequestCache(requestId);
        }

        throw e;
      });
  }

  async getCDPClient(): Promise<CDPSession> {
    if (!this.cdpClient) {
      this.cdpClient = await this.context.newCDPSession(this.page);
    }
    return this.cdpClient;
  }

  async sendCDP<T>(
    command: string,
    args?: Record<string, unknown>,
  ): Promise<T> {
    const client = await this.getCDPClient();
    // Type assertion needed because CDP command strings are not fully typed
    return client.send(
      command as Parameters<CDPSession["send"]>[0],
      args || {},
    ) as Promise<T>;
  }

  async enableCDP(domain: string): Promise<void> {
    await this.sendCDP(`${domain}.enable`, {});
  }

  async disableCDP(domain: string): Promise<void> {
    await this.sendCDP(`${domain}.disable`, {});
  }
}
