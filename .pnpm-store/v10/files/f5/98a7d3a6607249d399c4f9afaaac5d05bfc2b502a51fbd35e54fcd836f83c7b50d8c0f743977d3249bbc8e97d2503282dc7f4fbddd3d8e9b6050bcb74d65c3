import { Locator, Page } from "@playwright/test";
import { LogLine } from "../../types/log";
import {
  PlaywrightCommandException,
  PlaywrightCommandMethodNotSupportedException,
} from "../../types/playwright";
import { ActionCache } from "../cache/ActionCache";
import { act, fillInVariables, verifyActCompletion } from "../inference";
import { LLMClient } from "../llm/LLMClient";
import { LLMProvider } from "../llm/LLMProvider";
import { StagehandContext } from "../StagehandContext";
import { StagehandPage } from "../StagehandPage";
import { generateId } from "../utils";
import {
  ActResult,
  ObserveResult,
  ActOptions,
  ObserveOptions,
} from "@/types/stagehand";
import { SupportedPlaywrightAction } from "@/types/act";
import { buildActObservePrompt } from "../prompt";
/**
 * NOTE: Vision support has been removed from this version of Stagehand.
 * If useVision or verifierUseVision is set to true, a warning is logged and
 * the flow continues as if vision = false.
 */
export class StagehandActHandler {
  private readonly stagehandPage: StagehandPage;
  private readonly verbose: 0 | 1 | 2;
  private readonly llmProvider: LLMProvider;
  private readonly enableCaching: boolean;
  private readonly logger: (logLine: LogLine) => void;
  private readonly actionCache: ActionCache | undefined;
  private readonly actions: {
    [key: string]: { result: string; action: string };
  };
  private readonly userProvidedInstructions?: string;
  private readonly selfHeal: boolean;
  private readonly waitForCaptchaSolves: boolean;

  constructor({
    verbose,
    llmProvider,
    enableCaching,
    logger,
    stagehandPage,
    userProvidedInstructions,
    selfHeal,
    waitForCaptchaSolves,
  }: {
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
  }) {
    this.verbose = verbose;
    this.llmProvider = llmProvider;
    this.enableCaching = enableCaching;
    this.logger = logger;
    this.actionCache = enableCaching ? new ActionCache(this.logger) : undefined;
    this.actions = {};
    this.stagehandPage = stagehandPage;
    this.userProvidedInstructions = userProvidedInstructions;
    this.selfHeal = selfHeal;
    this.waitForCaptchaSolves = waitForCaptchaSolves;
  }

  /**
   * Perform an immediate Playwright action based on an ObserveResult object
   * that was returned from `page.observe(...)`.
   */
  public async actFromObserveResult(
    observe: ObserveResult,
    domSettleTimeoutMs?: number,
  ): Promise<ActResult> {
    this.logger({
      category: "action",
      message: "Performing act from an ObserveResult",
      level: 1,
      auxiliary: {
        observeResult: {
          value: JSON.stringify(observe),
          type: "object",
        },
      },
    });

    const method = observe.method;
    if (method === "not-supported") {
      this.logger({
        category: "action",
        message: "Cannot execute ObserveResult with unsupported method",
        level: 1,
        auxiliary: {
          error: {
            value:
              "NotSupportedError: The method requested in this ObserveResult is not supported by Stagehand.",
            type: "string",
          },
          trace: {
            value: `Cannot execute act from ObserveResult with unsupported method: ${method}`,
            type: "string",
          },
        },
      });
      return {
        success: false,
        message: `Unable to perform action: The method '${method}' is not supported in ObserveResult. Please use a supported Playwright locator method.`,
        action: observe.description || `ObserveResult action (${method})`,
      };
    }
    const args = observe.arguments ?? [];
    // remove the xpath prefix on the selector
    const selector = observe.selector.replace("xpath=", "");

    try {
      await this._performPlaywrightMethod(
        method,
        args,
        selector,
        domSettleTimeoutMs,
      );

      return {
        success: true,
        message: `Action [${method}] performed successfully on selector: ${selector}`,
        action: observe.description || `ObserveResult action (${method})`,
      };
    } catch (err) {
      if (
        !this.selfHeal ||
        err instanceof PlaywrightCommandMethodNotSupportedException
      ) {
        this.logger({
          category: "action",
          message: "Error performing act from an ObserveResult",
          level: 1,
          auxiliary: {
            error: { value: err.message, type: "string" },
            trace: { value: err.stack, type: "string" },
          },
        });
        return {
          success: false,
          message: `Failed to perform act: ${err.message}`,
          action: observe.description || `ObserveResult action (${method})`,
        };
      }
      // We will try to use regular act on a failed ObserveResult-act if selfHeal is true
      this.logger({
        category: "action",
        message:
          "Error performing act from an ObserveResult. Trying again with regular act method",
        level: 1,
        auxiliary: {
          error: { value: err.message, type: "string" },
          trace: { value: err.stack, type: "string" },
          observeResult: { value: JSON.stringify(observe), type: "object" },
        },
      });
      try {
        // Remove redundancy from method-description
        const actCommand = observe.description
          .toLowerCase()
          .startsWith(method.toLowerCase())
          ? observe.description
          : method
            ? `${method} ${observe.description}`
            : observe.description;
        // Call act with the ObserveResult description
        await this.stagehandPage.act({
          action: actCommand,
          slowDomBasedAct: true,
        });
      } catch (err) {
        this.logger({
          category: "action",
          message: "Error performing act from an ObserveResult on fallback",
          level: 1,
          auxiliary: {
            error: { value: err.message, type: "string" },
            trace: { value: err.stack, type: "string" },
          },
        });
        return {
          success: false,
          message: `Failed to perform act: ${err.message}`,
          action: observe.description || `ObserveResult action (${method})`,
        };
      }
    }
  }

  /**
   * Perform an act based on an instruction.
   * This method will observe the page and then perform the act on the first element returned.
   */
  public async observeAct(actionOrOptions: ActOptions): Promise<ActResult> {
    // Extract action string and observe options
    let action: string;
    const observeOptions: Partial<ObserveOptions> = {};

    if (typeof actionOrOptions === "object" && actionOrOptions !== null) {
      if (!("action" in actionOrOptions)) {
        throw new Error(
          "Invalid argument. Action options must have an `action` field.",
        );
      }

      if (
        typeof actionOrOptions.action !== "string" ||
        actionOrOptions.action.length === 0
      ) {
        throw new Error("Invalid argument. No action provided.");
      }

      action = actionOrOptions.action;

      // Extract options that should be passed to observe
      if (actionOrOptions.modelName)
        observeOptions.modelName = actionOrOptions.modelName;
      if (actionOrOptions.modelClientOptions)
        observeOptions.modelClientOptions = actionOrOptions.modelClientOptions;
    } else {
      throw new Error(
        "Invalid argument. Valid arguments are: a string, an ActOptions object with an `action` field not empty, or an ObserveResult with a `selector` and `method` field.",
      );
    }

    // Craft the instruction for observe
    const instruction = buildActObservePrompt(
      action,
      Object.values(SupportedPlaywrightAction),
      actionOrOptions.variables,
    );

    // Call observe with the instruction and extracted options
    const observeResults = await this.stagehandPage.observe({
      instruction,
      ...observeOptions,
    });

    if (observeResults.length === 0) {
      return {
        success: false,
        message: `Failed to perform act: No observe results found for action`,
        action,
      };
    }

    // Perform the action on the first observed element
    const element = observeResults[0];
    // Replace the arguments with the variables if any
    if (actionOrOptions.variables) {
      Object.keys(actionOrOptions.variables).forEach((key) => {
        element.arguments = element.arguments.map((arg) =>
          arg.replace(key, actionOrOptions.variables[key]),
        );
      });
    }
    return this.actFromObserveResult(
      element,
      actionOrOptions.domSettleTimeoutMs,
    );
  }

  private async _recordAction(action: string, result: string): Promise<string> {
    const id = generateId(action);

    this.actions[id] = { result, action };

    return id;
  }

  private async _verifyActionCompletion({
    completed,
    requestId,
    action,
    steps,
    llmClient,
    domSettleTimeoutMs,
  }: {
    completed: boolean;
    requestId: string;
    action: string;
    steps: string;
    llmClient: LLMClient;
    domSettleTimeoutMs?: number;
  }): Promise<boolean> {
    if (!completed) {
      return false;
    }

    await this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);

    // o1 is overkill for this task + this task uses a lot of tokens. So we switch it 4o
    let verifyLLmClient = llmClient;
    if (
      llmClient.modelName.startsWith("o1") ||
      llmClient.modelName.startsWith("o3")
    ) {
      verifyLLmClient = this.llmProvider.getClient(
        "gpt-4o",
        llmClient.clientOptions,
      );
    }

    const { outputString: domElements } =
      await this.stagehandPage.page.evaluate(() => {
        return window.processAllOfDom();
      });

    let actionCompleted = false;
    if (completed) {
      // Run action completion verifier
      this.logger({
        category: "action",
        message: "action marked as completed, verifying if this is true...",
        level: 1,
        auxiliary: {
          action: {
            value: action,
            type: "string",
          },
        },
      });

      // Always use text-based DOM verification (no vision).
      actionCompleted = await verifyActCompletion({
        goal: action,
        steps,
        llmProvider: this.llmProvider,
        llmClient: verifyLLmClient,
        domElements,
        logger: this.logger,
        requestId,
      });

      this.logger({
        category: "action",
        message: "action completion verification result",
        level: 1,
        auxiliary: {
          action: {
            value: action,
            type: "string",
          },
          result: {
            value: actionCompleted.toString(),
            type: "boolean",
          },
        },
      });
    }

    return actionCompleted;
  }

  private async _performPlaywrightMethod(
    method: string,
    args: unknown[],
    xpath: string,
    domSettleTimeoutMs?: number,
  ) {
    const locator = this.stagehandPage.page.locator(`xpath=${xpath}`).first();
    const initialUrl = this.stagehandPage.page.url();

    this.logger({
      category: "action",
      message: "performing playwright method",
      level: 2,
      auxiliary: {
        xpath: {
          value: xpath,
          type: "string",
        },
        method: {
          value: method,
          type: "string",
        },
      },
    });

    if (method === "scrollIntoView") {
      this.logger({
        category: "action",
        message: "scrolling element into view",
        level: 2,
        auxiliary: {
          xpath: {
            value: xpath,
            type: "string",
          },
        },
      });
      try {
        await locator
          .evaluate((element: HTMLElement) => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          })
          .catch((e: Error) => {
            this.logger({
              category: "action",
              message: "error scrolling element into view",
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
                xpath: {
                  value: xpath,
                  type: "string",
                },
              },
            });
          });
      } catch (e) {
        this.logger({
          category: "action",
          message: "error scrolling element into view",
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
            xpath: {
              value: xpath,
              type: "string",
            },
          },
        });

        throw new PlaywrightCommandException(e.message);
      }
    } else if (method === "fill" || method === "type") {
      try {
        await locator.fill("");
        await locator.click();
        const text = args[0]?.toString();
        for (const char of text) {
          await this.stagehandPage.page.keyboard.type(char, {
            delay: Math.random() * 50 + 25,
          });
        }
      } catch (e) {
        this.logger({
          category: "action",
          message: "error filling element",
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
            xpath: {
              value: xpath,
              type: "string",
            },
          },
        });

        throw new PlaywrightCommandException(e.message);
      }
    } else if (method === "press") {
      try {
        const key = args[0]?.toString();
        await this.stagehandPage.page.keyboard.press(key);
      } catch (e) {
        this.logger({
          category: "action",
          message: "error pressing key",
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
            key: {
              value: args[0]?.toString() ?? "unknown",
              type: "string",
            },
          },
        });

        throw new PlaywrightCommandException(e.message);
      }
    } else if (method === "click") {
      // Log the URL before clicking
      this.logger({
        category: "action",
        message: "page URL before click",
        level: 2,
        auxiliary: {
          url: {
            value: this.stagehandPage.page.url(),
            type: "string",
          },
        },
      });

      // if the element is a radio button, we should try to click the label instead
      try {
        const isRadio = await locator.evaluate((el) => {
          return el instanceof HTMLInputElement && el.type === "radio";
        });

        const clickArg = args.length ? args[0] : undefined;

        if (isRadio) {
          // if it's a radio button, try to find a label to click
          const inputId = await locator.evaluate((el) => el.id);
          let labelLocator;

          if (inputId) {
            // if the radio button has an ID, try label[for="thatId"]
            labelLocator = this.stagehandPage.page.locator(
              `label[for="${inputId}"]`,
            );
          }
          if (!labelLocator || (await labelLocator.count()) < 1) {
            // if no label was found or the label doesn't exist, check if
            // there is an ancestor <label>
            labelLocator = this.stagehandPage.page
              .locator(`xpath=${xpath}/ancestor::label`)
              .first();
          }
          if ((await labelLocator.count()) < 1) {
            // if still no label, try checking for a following-sibling or preceding-sibling label
            labelLocator = locator
              .locator(`xpath=following-sibling::label`)
              .first();
            if ((await labelLocator.count()) < 1) {
              labelLocator = locator
                .locator(`xpath=preceding-sibling::label`)
                .first();
            }
          }
          if ((await labelLocator.count()) > 0) {
            // if we found a label, click it
            await labelLocator.click(clickArg);
          } else {
            // otherwise, just click the radio button itself
            await locator.click(clickArg);
          }
        } else {
          // here we just do a normal click if it's not a radio input
          const clickArg = args.length ? args[0] : undefined;
          await locator.click(clickArg);
        }
      } catch (e) {
        this.logger({
          category: "action",
          message: "error performing click",
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
            xpath: {
              value: xpath,
              type: "string",
            },
            method: {
              value: method,
              type: "string",
            },
            args: {
              value: JSON.stringify(args),
              type: "object",
            },
          },
        });

        throw new PlaywrightCommandException(e.message);
      }

      // Handle navigation if a new page is opened
      this.logger({
        category: "action",
        message: "clicking element, checking for page navigation",
        level: 1,
        auxiliary: {
          xpath: {
            value: xpath,
            type: "string",
          },
        },
      });

      const newOpenedTab = await Promise.race([
        new Promise<Page | null>((resolve) => {
          // TODO: This is a hack to get the new page
          // We should find a better way to do this
          this.stagehandPage.context.once("page", (page) => resolve(page));
          setTimeout(() => resolve(null), 1_500);
        }),
      ]);

      this.logger({
        category: "action",
        message: "clicked element",
        level: 1,
        auxiliary: {
          newOpenedTab: {
            value: newOpenedTab ? "opened a new tab" : "no new tabs opened",
            type: "string",
          },
        },
      });

      if (newOpenedTab) {
        this.logger({
          category: "action",
          message: "new page detected (new tab) with URL",
          level: 1,
          auxiliary: {
            url: {
              value: newOpenedTab.url(),
              type: "string",
            },
          },
        });
        await newOpenedTab.close();
        await this.stagehandPage.page.goto(newOpenedTab.url());
        await this.stagehandPage.page.waitForLoadState("domcontentloaded");
      }

      await this.stagehandPage
        ._waitForSettledDom(domSettleTimeoutMs)
        .catch((e) => {
          this.logger({
            category: "action",
            message: "wait for settled dom timeout hit",
            level: 1,
            auxiliary: {
              trace: {
                value: e.stack,
                type: "string",
              },
              message: {
                value: e.message,
                type: "string",
              },
            },
          });
        });

      this.logger({
        category: "action",
        message: "finished waiting for (possible) page navigation",
        level: 1,
      });

      if (this.stagehandPage.page.url() !== initialUrl) {
        this.logger({
          category: "action",
          message: "new page detected with URL",
          level: 1,
          auxiliary: {
            url: {
              value: this.stagehandPage.page.url(),
              type: "string",
            },
          },
        });
      }
    } else if (typeof locator[method as keyof typeof locator] === "function") {
      // Fallback: any other locator method
      // Log current URL before action
      this.logger({
        category: "action",
        message: "page URL before action",
        level: 2,
        auxiliary: {
          url: {
            value: this.stagehandPage.page.url(),
            type: "string",
          },
        },
      });

      // Perform the action
      try {
        await (
          locator[method as keyof Locator] as unknown as (
            ...args: string[]
          ) => Promise<void>
        )(...args.map((arg) => arg?.toString() || ""));
      } catch (e) {
        this.logger({
          category: "action",
          message: "error performing method",
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
            xpath: {
              value: xpath,
              type: "string",
            },
            method: {
              value: method,
              type: "string",
            },
            args: {
              value: JSON.stringify(args),
              type: "object",
            },
          },
        });

        throw new PlaywrightCommandException(e.message);
      }
    } else {
      this.logger({
        category: "action",
        message: "chosen method is invalid",
        level: 1,
        auxiliary: {
          method: {
            value: method,
            type: "string",
          },
        },
      });

      throw new PlaywrightCommandMethodNotSupportedException(
        `Method ${method} not supported`,
      );
    }

    await this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
  }

  private async _getComponentString(locator: Locator) {
    return await locator.evaluate((el) => {
      // Create a clone of the element to avoid modifying the original
      const clone = el.cloneNode(true) as HTMLElement;

      // Keep only specific stable attributes that help identify elements
      const attributesToKeep = [
        "type",
        "name",
        "placeholder",
        "aria-label",
        "role",
        "href",
        "title",
        "alt",
      ];

      // Remove all attributes except those we want to keep
      Array.from(clone.attributes).forEach((attr) => {
        if (!attributesToKeep.includes(attr.name)) {
          clone.removeAttribute(attr.name);
        }
      });

      const outerHtml = clone.outerHTML;
      return outerHtml.trim().replace(/\s+/g, " ");
    });
  }

  public async act({
    action,
    steps = "",
    chunksSeen,
    llmClient,
    retries = 0,
    requestId,
    variables,
    previousSelectors,
    skipActionCacheForThisStep = false,
    domSettleTimeoutMs,
    timeoutMs,
    startTime = Date.now(),
  }: {
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
  }): Promise<{ success: boolean; message: string; action: string }> {
    try {
      await this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
      await this.stagehandPage.startDomDebug();

      if (timeoutMs && startTime) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > timeoutMs) {
          return {
            success: false,
            message: `Action timed out after ${timeoutMs}ms`,
            action: action,
          };
        }
      }

      this.logger({
        category: "action",
        message: "running / continuing action",
        level: 2,
        auxiliary: {
          action: {
            value: action,
            type: "string",
          },
          pageUrl: {
            value: this.stagehandPage.page.url(),
            type: "string",
          },
        },
      });

      this.logger({
        category: "action",
        message: "processing DOM",
        level: 2,
      });

      const { outputString, selectorMap, chunk, chunks } =
        await this.stagehandPage.page.evaluate(
          ({ chunksSeen }: { chunksSeen: number[] }) => {
            return window.processDom(chunksSeen);
          },
          { chunksSeen },
        );

      this.logger({
        category: "action",
        message: "looking at chunk",
        level: 1,
        auxiliary: {
          chunk: {
            value: chunk.toString(),
            type: "integer",
          },
          chunks: {
            value: chunks.length.toString(),
            type: "integer",
          },
          chunksSeen: {
            value: chunksSeen.length.toString(),
            type: "integer",
          },
          chunksLeft: {
            value: (chunks.length - chunksSeen.length).toString(),
            type: "integer",
          },
        },
      });

      // Run the LLM-based inference with text only
      const response = await act({
        action,
        domElements: outputString,
        steps,
        llmClient,
        logger: this.logger,
        requestId,
        variables,
        userProvidedInstructions: this.userProvidedInstructions,
      });

      this.logger({
        category: "action",
        message: "received response from LLM",
        level: 1,
        auxiliary: {
          response: {
            value: JSON.stringify(response),
            type: "object",
          },
        },
      });

      await this.stagehandPage.cleanupDomDebug();

      if (!response) {
        if (chunksSeen.length + 1 < chunks.length) {
          chunksSeen.push(chunk);

          this.logger({
            category: "action",
            message: "no action found in current chunk",
            level: 1,
            auxiliary: {
              chunksSeen: {
                value: chunksSeen.length.toString(),
                type: "integer",
              },
            },
          });

          return this.act({
            action,
            steps:
              steps +
              (!steps.endsWith("\n") ? "\n" : "") +
              "## Step: Scrolled to another section\n",
            chunksSeen,
            llmClient,
            requestId,
            variables,
            previousSelectors,
            skipActionCacheForThisStep,
            domSettleTimeoutMs,
            timeoutMs,
            startTime,
          });
        } else {
          if (this.enableCaching) {
            this.llmProvider.cleanRequestCache(requestId);
            this.actionCache?.deleteCacheForRequestId(requestId);
          }

          return {
            success: false,
            message: `Action was not able to be completed.`,
            action: action,
          };
        }
      }

      // Action found, proceed to execute
      const elementId = response["element"];
      const xpaths = selectorMap[elementId];
      const method = response["method"];
      const args = response["args"];

      // Get the element text from the outputString
      const elementLines = outputString.split("\n");
      const elementText =
        elementLines
          .find((line) => line.startsWith(`${elementId}:`))
          ?.split(":")[1] || "Element not found";

      this.logger({
        category: "action",
        message: "executing method",
        level: 1,
        auxiliary: {
          method: {
            value: method,
            type: "string",
          },
          elementId: {
            value: elementId.toString(),
            type: "integer",
          },
          xpaths: {
            value: JSON.stringify(xpaths),
            type: "object",
          },
          args: {
            value: JSON.stringify(args),
            type: "object",
          },
        },
      });

      try {
        const initialUrl = this.stagehandPage.page.url();

        // Modified: Attempt to locate the first valid XPath before proceeding
        let foundXpath: string | null = null;
        let locator: Locator | null = null;

        for (const xp of xpaths) {
          const candidate = this.stagehandPage.page
            .locator(`xpath=${xp}`)
            .first();
          try {
            // Try a short wait to see if it's attached to the DOM
            await candidate.waitFor({ state: "attached", timeout: 2000 });
            foundXpath = xp;
            locator = candidate;
            break;
          } catch (e) {
            this.logger({
              category: "action",
              message: "XPath not yet located; moving on",
              level: 1,
              auxiliary: {
                xpath: {
                  value: xp,
                  type: "string",
                },
                error: {
                  value: e.message,
                  type: "string",
                },
              },
            });
            // Continue to next XPath
          }
        }

        // If no XPath was valid, we cannot proceed
        if (!foundXpath || !locator) {
          throw new Error("None of the provided XPaths could be located.");
        }

        const originalUrl = this.stagehandPage.page.url();
        const componentString = await this._getComponentString(locator);
        const responseArgs = [...args];

        if (variables) {
          responseArgs.forEach((arg, index) => {
            if (typeof arg === "string") {
              args[index] = fillInVariables(arg, variables);
            }
          });
        }

        await this._performPlaywrightMethod(
          method,
          args,
          foundXpath,
          domSettleTimeoutMs,
        );

        const newStepString =
          (!steps.endsWith("\n") ? "\n" : "") +
          `## Step: ${response.step}\n` +
          `  Element: ${elementText}\n` +
          `  Action: ${response.method}\n` +
          `  Reasoning: ${response.why}\n`;

        steps += newStepString;

        if (this.enableCaching) {
          this.actionCache
            .addActionStep({
              action,
              url: originalUrl,
              previousSelectors,
              playwrightCommand: {
                method,
                args: responseArgs.map((arg) => arg?.toString() || ""),
              },
              componentString,
              requestId,
              xpaths,
              newStepString,
              completed: response.completed,
            })
            .catch((e) => {
              this.logger({
                category: "action",
                message: "error adding action step to cache",
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
            });
        }

        if (this.stagehandPage.page.url() !== initialUrl) {
          steps += `  Result (Important): Page URL changed from ${initialUrl} to ${this.stagehandPage.page.url()}\n\n`;

          if (this.waitForCaptchaSolves) {
            try {
              await this.stagehandPage.waitForCaptchaSolve(1000);
            } catch {
              // ignore
            }
          }
        }

        const actionCompleted = await this._verifyActionCompletion({
          completed: response.completed,
          requestId,
          action,
          steps,
          llmClient,
          domSettleTimeoutMs,
        }).catch((error) => {
          this.logger({
            category: "action",
            message:
              "error verifying action completion. Assuming action completed.",
            level: 1,
            auxiliary: {
              error: {
                value: error.message,
                type: "string",
              },
              trace: {
                value: error.stack,
                type: "string",
              },
            },
          });

          return true;
        });

        if (!actionCompleted) {
          this.logger({
            category: "action",
            message: "continuing to next action step",
            level: 1,
          });

          return this.act({
            action,
            steps,
            llmClient,
            chunksSeen,
            requestId,
            variables,
            previousSelectors: [...previousSelectors, foundXpath],
            skipActionCacheForThisStep: false,
            domSettleTimeoutMs,
            timeoutMs,
            startTime,
          });
        } else {
          this.logger({
            category: "action",
            message: "action completed successfully",
            level: 1,
          });
          await this._recordAction(action, response.step);
          return {
            success: true,
            message: `Action completed successfully: ${steps}${response.step}`,
            action: action,
          };
        }
      } catch (error) {
        this.logger({
          category: "action",
          message: "error performing action - d",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string",
            },
            trace: {
              value: error.stack,
              type: "string",
            },
            retries: {
              value: retries.toString(),
              type: "integer",
            },
          },
        });

        if (retries < 2) {
          return this.act({
            action,
            steps,
            llmClient,
            retries: retries + 1,
            chunksSeen,
            requestId,
            variables,
            previousSelectors,
            skipActionCacheForThisStep,
            domSettleTimeoutMs,
            timeoutMs,
            startTime,
          });
        }

        await this._recordAction(action, "");
        if (this.enableCaching) {
          this.llmProvider.cleanRequestCache(requestId);
          this.actionCache.deleteCacheForRequestId(requestId);
        }

        return {
          success: false,
          message: "error performing action - a",
          action: action,
        };
      }
    } catch (error) {
      this.logger({
        category: "action",
        message: "error performing action - b",
        level: 1,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });

      if (this.enableCaching) {
        this.llmProvider.cleanRequestCache(requestId);
        this.actionCache.deleteCacheForRequestId(requestId);
      }

      return {
        success: false,
        message: `Error performing action - C: ${error.message}`,
        action: action,
      };
    }
  }
}
