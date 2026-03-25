import { LogLine } from "../../types/log";
import { Stagehand } from "../index";
import { observe } from "../inference";
import { LLMClient } from "../llm/LLMClient";
import { StagehandPage } from "../StagehandPage";
import { generateId, drawObserveOverlay } from "../utils";
import {
  getAccessibilityTree,
  getXPathByResolvedObjectId,
} from "../a11y/utils";
import { AccessibilityNode } from "../../types/context";

export class StagehandObserveHandler {
  private readonly stagehand: Stagehand;
  private readonly logger: (logLine: LogLine) => void;
  private readonly stagehandPage: StagehandPage;
  private observations: {
    [key: string]: {
      result: { selector: string; description: string }[];
      instruction: string;
    };
  };
  private readonly userProvidedInstructions?: string;
  constructor({
    stagehand,
    logger,
    stagehandPage,
    userProvidedInstructions,
  }: {
    stagehand: Stagehand;
    logger: (logLine: LogLine) => void;
    stagehandPage: StagehandPage;
    userProvidedInstructions?: string;
  }) {
    this.stagehand = stagehand;
    this.logger = logger;
    this.stagehandPage = stagehandPage;
    this.userProvidedInstructions = userProvidedInstructions;
    this.observations = {};
  }

  private async _recordObservation(
    instruction: string,
    result: { selector: string; description: string }[],
  ): Promise<string> {
    const id = generateId(instruction);

    this.observations[id] = { result, instruction };

    return id;
  }

  public async observe({
    instruction,
    llmClient,
    requestId,
    returnAction,
    onlyVisible,
    drawOverlay,
  }: {
    instruction: string;
    llmClient: LLMClient;
    requestId: string;
    domSettleTimeoutMs?: number;
    returnAction?: boolean;
    onlyVisible?: boolean;
    drawOverlay?: boolean;
  }) {
    if (!instruction) {
      instruction = `Find elements that can be used for any future actions in the page. These may be navigation links, related pages, section/subsection links, buttons, or other interactive elements. Be comprehensive: if there are multiple elements that may be relevant for future actions, return all of them.`;
    }

    this.logger({
      category: "observation",
      message: "starting observation",
      level: 1,
      auxiliary: {
        instruction: {
          value: instruction,
          type: "string",
        },
      },
    });

    let selectorMap: Record<string, string[]> = {};
    let outputString: string;
    let iframes: AccessibilityNode[] = [];
    const useAccessibilityTree = !onlyVisible;
    if (useAccessibilityTree) {
      await this.stagehandPage._waitForSettledDom();
      const tree = await getAccessibilityTree(this.stagehandPage, this.logger);
      this.logger({
        category: "observation",
        message: "Getting accessibility tree data",
        level: 1,
      });
      outputString = tree.simplified;
      iframes = tree.iframes;
    } else {
      const evalResult = await this.stagehand.page.evaluate(() => {
        return window.processAllOfDom().then((result) => result);
      });
      ({ outputString, selectorMap } = evalResult);
    }

    // No screenshot or vision-based annotation is performed
    const observationResponse = await observe({
      instruction,
      domElements: outputString,
      llmClient,
      requestId,
      userProvidedInstructions: this.userProvidedInstructions,
      logger: this.logger,
      isUsingAccessibilityTree: useAccessibilityTree,
      returnAction,
    });

    //Add iframes to the observation response if there are any on the page
    if (iframes.length > 0) {
      iframes.forEach((iframe) => {
        observationResponse.elements.push({
          elementId: Number(iframe.nodeId),
          description: "an iframe",
          method: "not-supported",
          arguments: [],
        });
      });
    }
    const elementsWithSelectors = await Promise.all(
      observationResponse.elements.map(async (element) => {
        const { elementId, ...rest } = element;

        if (useAccessibilityTree) {
          // Generate xpath for the given element if not found in selectorMap
          this.logger({
            category: "observation",
            message: "Getting xpath for element",
            level: 1,
            auxiliary: {
              elementId: {
                value: elementId.toString(),
                type: "string",
              },
            },
          });

          const args = { backendNodeId: elementId };
          const { object } = await this.stagehandPage.sendCDP<{
            object: { objectId: string };
          }>("DOM.resolveNode", args);

          if (!object || !object.objectId) {
            this.logger({
              category: "observation",
              message: `Invalid object ID returned for element: ${elementId}`,
              level: 1,
            });
          }

          const xpath = await getXPathByResolvedObjectId(
            await this.stagehandPage.getCDPClient(),
            object.objectId,
          );

          if (!xpath || xpath === "") {
            this.logger({
              category: "observation",
              message: `Empty xpath returned for element: ${elementId}`,
              level: 1,
            });
          }

          return {
            ...rest,
            selector: `xpath=${xpath}`,
            // Provisioning or future use if we want to use direct CDP
            // backendNodeId: elementId,
          };
        }

        return {
          ...rest,
          selector: `xpath=${selectorMap[elementId][0]}`,
          // backendNodeId: backendNodeIdMap[elementId],
        };
      }),
    );
    await this.stagehandPage.cleanupDomDebug();

    this.logger({
      category: "observation",
      message: "found elements",
      level: 1,
      auxiliary: {
        elements: {
          value: JSON.stringify(elementsWithSelectors),
          type: "object",
        },
      },
    });

    if (drawOverlay) {
      await drawObserveOverlay(this.stagehandPage.page, elementsWithSelectors);
    }

    await this._recordObservation(instruction, elementsWithSelectors);
    return elementsWithSelectors;
  }
}
