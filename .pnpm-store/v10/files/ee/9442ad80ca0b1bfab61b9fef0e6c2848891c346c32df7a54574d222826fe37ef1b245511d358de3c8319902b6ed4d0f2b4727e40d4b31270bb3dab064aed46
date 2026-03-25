import { z } from "zod";
import { LogLine } from "../../types/log";
import { TextAnnotation } from "../../types/textannotation";
import { extract } from "../inference";
import { LLMClient } from "../llm/LLMClient";
import { formatText } from "../utils";
import { StagehandPage } from "../StagehandPage";
import { Stagehand } from "../index";
import { pageTextSchema } from "../../types/page";

const PROXIMITY_THRESHOLD = 15;

/**
 * The `StagehandExtractHandler` class is responsible for extracting structured data from a webpage.
 * It provides two approaches: `textExtract` and `domExtract`. `textExtract` is used by default.
 *
 * Here is what `textExtract` does at a high level:
 *
 * **1. Wait for the DOM to settle and start DOM debugging.**
 *    - Ensures the page is fully loaded and stable before extraction.
 *
 * **2. Store the original DOM before any mutations.**
 *    - Preserves the initial state of the DOM to restore later.
 *    - We do this because creating spans around every word in the DOM (see step 4)
 *      becomes very difficult to revert. Text nodes can be finicky, and directly
 *      removing the added spans often corrupts the structure of the DOM.
 *
 * **3. Process the DOM to generate a selector map of candidate elements.**
 *    - Identifies potential elements that contain the data to extract.
 *
 * **4. Create text bounding boxes around every word in the webpage.**
 *    - Wraps words in spans so that their bounding boxes can be used to
 *      determine their positions on the text-rendered-webpage.
 *
 * **5. Collect all text annotations (with positions and dimensions) from each of the candidate elements.**
 *    - Gathers text and positional data for each word.
 *
 * **6. Group annotations by text and deduplicate them based on proximity.**
 *    - There is no guarantee that the text annotations are unique (candidate elements can be nested).
 *    - Thus, we must remove duplicate words that are close to each other on the page.
 *
 * **7. Restore the original DOM after mutations.**
 *    - Returns the DOM to its original state after processing.
 *
 * **8. Format the deduplicated annotations into a text representation.**
 *    - Prepares the text data for the extraction process.
 *
 * **9. Pass the formatted text to an LLM for extraction according to the given instruction and schema.**
 *    - Uses a language model to extract structured data based on instructions.
 *
 * **10. Handle the extraction response and logging the results.**
 *     - Processes the output from the LLM and logs relevant information.
 *
 *
 * Here is what `domExtract` does at a high level:
 *
 * **1. Wait for the DOM to settle and start DOM debugging.**
 *   - Ensures the page is fully loaded and stable before extraction.
 *
 * **2. Process the DOM in chunks.**
 *   - The `processDom` function:
 *     - Divides the page into vertical "chunks" based on viewport height.
 *     - Picks the next chunk that hasn't been processed yet.
 *     - Scrolls to that chunk and extracts candidate elements.
 *     - Returns `outputString` (HTML snippets of candidate elements),
 *       `selectorMap` (the XPaths of the candidate elements),
 *       `chunk` (the current chunk index), and `chunks` (the array of all chunk indices).
 *   - This chunk-based approach ensures that large or lengthy pages can be processed in smaller, manageable sections.
 *
 * **3. Pass the extracted DOM elements (in `outputString`) to the LLM for structured data extraction.**
 *   - Uses the instructions, schema, and previously extracted content as context to
 *     guide the LLM in extracting the structured data.
 *
 * **4. Check if extraction is complete.**
 *    - If the extraction is complete (all chunks have been processed or the LLM determines
 *      that we do not need to continue), return the final result.
 *    - If not, repeat steps 1-4 with the next chunk until extraction is complete or no more chunks remain.
 *
 * @remarks
 * Each step corresponds to specific code segments, as noted in the comments throughout the code.
 */

export class StagehandExtractHandler {
  private readonly stagehand: Stagehand;
  private readonly stagehandPage: StagehandPage;
  private readonly logger: (logLine: LogLine) => void;
  private readonly userProvidedInstructions?: string;

  constructor({
    stagehand,
    logger,
    stagehandPage,
    userProvidedInstructions,
  }: {
    stagehand: Stagehand;
    logger: (message: {
      category?: string;
      message: string;
      level?: number;
      auxiliary?: { [key: string]: { value: string; type: string } };
    }) => void;
    stagehandPage: StagehandPage;
    userProvidedInstructions?: string;
  }) {
    this.stagehand = stagehand;
    this.logger = logger;
    this.stagehandPage = stagehandPage;
    this.userProvidedInstructions = userProvidedInstructions;
  }

  public async extract<T extends z.AnyZodObject>({
    instruction,
    schema,
    content = {},
    chunksSeen = [],
    llmClient,
    requestId,
    domSettleTimeoutMs,
    useTextExtract = false,
    selector,
  }: {
    instruction?: string;
    schema?: T;
    content?: z.infer<T>;
    chunksSeen?: Array<number>;
    llmClient?: LLMClient;
    requestId?: string;
    domSettleTimeoutMs?: number;
    useTextExtract?: boolean;
    selector?: string;
  } = {}): Promise<z.infer<T>> {
    const noArgsCalled = !instruction && !schema && !llmClient && !selector;
    if (noArgsCalled) {
      this.logger({
        category: "extraction",
        message: "Extracting the entire page text.",
        level: 1,
      });
      return this.extractPageText();
    }

    if (useTextExtract) {
      return this.textExtract({
        instruction,
        schema,
        content,
        llmClient,
        requestId,
        domSettleTimeoutMs,
        selector,
      });
    } else {
      return this.domExtract({
        instruction,
        schema,
        content,
        chunksSeen,
        llmClient,
        requestId,
        domSettleTimeoutMs,
      });
    }
  }

  private async extractPageText(): Promise<{ page_text?: string }> {
    await this.stagehandPage._waitForSettledDom();
    await this.stagehandPage.startDomDebug();

    const originalDOM = await this.stagehandPage.page.evaluate(() =>
      window.storeDOM(undefined),
    );

    const { selectorMap }: { selectorMap: Record<number, string[]> } =
      await this.stagehand.page.evaluate(() =>
        window.processAllOfDom(undefined),
      );

    await this.stagehand.page.evaluate(() =>
      window.createTextBoundingBoxes(undefined),
    );

    const containerDims = await this.getTargetDimensions();

    const allAnnotations = await this.collectAllAnnotations(
      selectorMap,
      containerDims.width,
      containerDims.height,
      containerDims.offsetLeft,
      containerDims.offsetTop,
    );

    const deduplicatedTextAnnotations =
      this.deduplicateAnnotations(allAnnotations);

    await this.stagehandPage.page.evaluate(
      (dom) => window.restoreDOM(dom, undefined),
      originalDOM,
    );

    const formattedText = formatText(
      deduplicatedTextAnnotations,
      containerDims.width,
    );

    await this.stagehandPage.cleanupDomDebug();

    const result = { page_text: formattedText };
    return pageTextSchema.parse(result);
  }

  private async textExtract<T extends z.AnyZodObject>({
    instruction,
    schema,
    content = {},
    llmClient,
    requestId,
    domSettleTimeoutMs,
    selector,
  }: {
    instruction?: string;
    schema?: T;
    content?: z.infer<T>;
    llmClient?: LLMClient;
    requestId?: string;
    domSettleTimeoutMs?: number;
    selector?: string;
  }): Promise<z.infer<T>> {
    this.logger({
      category: "extraction",
      message: "starting extraction",
      level: 1,
      auxiliary: {
        instruction: {
          value: instruction,
          type: "string",
        },
      },
    });

    // **1:** Wait for the DOM to settle and start DOM debugging
    await this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
    await this.stagehandPage.startDomDebug();

    const targetXpath = selector?.replace(/^xpath=/, "") ?? "";

    // **2:** Store the original DOM before any mutations
    // we need to store the original DOM here because calling createTextBoundingBoxes()
    // will mutate the DOM by adding spans around every word
    const originalDOM = await this.stagehandPage.page.evaluate(
      (xp) => window.storeDOM(xp),
      targetXpath,
    );

    // **3:** Process the DOM to generate a selector map of candidate elements
    const { selectorMap }: { selectorMap: Record<number, string[]> } =
      await this.stagehand.page.evaluate(
        (xp) => window.processAllOfDom(xp),
        targetXpath,
      );

    this.logger({
      category: "extraction",
      message: `received output from processAllOfDom. selectorMap has ${
        Object.keys(selectorMap).length
      } entries`,
      level: 1,
    });

    // **4:** Create text bounding boxes around every word in the webpage
    // calling createTextBoundingBoxes() will create a span around every word on the
    // webpage. The bounding boxes of these spans will be used to determine their
    // positions in the text rendered webpage
    await this.stagehand.page.evaluate(
      (xp) => window.createTextBoundingBoxes(xp),
      targetXpath,
    );

    // **5:** Determine the container dimensions for either the entire page or the target element
    const {
      width: containerWidth,
      height: containerHeight,
      offsetLeft = 0,
      offsetTop = 0,
    } = await this.getTargetDimensions(targetXpath);

    // **6:** Collect all text annotations (with positions and dimensions) from the candidate elements
    // allAnnotations will store all the TextAnnotations BEFORE deduplication
    const allAnnotations = await this.collectAllAnnotations(
      selectorMap,
      containerWidth,
      containerHeight,
      offsetLeft,
      offsetTop,
    );

    // **7:** Group annotations by text and deduplicate them based on proximity
    const annotationsGroupedByText = new Map<string, TextAnnotation[]>();

    for (const annotation of allAnnotations) {
      if (!annotationsGroupedByText.has(annotation.text)) {
        annotationsGroupedByText.set(annotation.text, []);
      }
      annotationsGroupedByText.get(annotation.text)!.push(annotation);
    }

    const deduplicatedTextAnnotations: TextAnnotation[] = [];

    // here, we deduplicate annotations per text group
    for (const [text, annotations] of annotationsGroupedByText.entries()) {
      for (const annotation of annotations) {
        // check if this annotation is close to any existing deduplicated annotation
        const isDuplicate = deduplicatedTextAnnotations.some(
          (existingAnnotation) => {
            if (existingAnnotation.text !== text) return false;

            const dx =
              existingAnnotation.bottom_left.x - annotation.bottom_left.x;
            const dy =
              existingAnnotation.bottom_left.y - annotation.bottom_left.y;
            const distance = Math.hypot(dx, dy);
            // the annotation is a duplicate if it has the same text and its bottom_left
            // position is within the PROXIMITY_THRESHOLD of an existing annotation.
            // we calculate the Euclidean distance between the two bottom_left points,
            // and if the distance is less than PROXIMITY_THRESHOLD,
            // the annotation is considered a duplicate.
            return distance < PROXIMITY_THRESHOLD;
          },
        );

        if (!isDuplicate) {
          deduplicatedTextAnnotations.push(annotation);
        }
      }
    }

    // **8:** Restore the original DOM after mutations
    await this.stagehandPage.page.evaluate(
      ({ dom, xp }) => window.restoreDOM(dom, xp),
      { dom: originalDOM, xp: targetXpath },
    );

    // **9:** Format the deduplicated annotations into a text representation
    const formattedText = formatText(
      deduplicatedTextAnnotations,
      containerWidth,
    );

    // **10:** Pass the formatted text to an LLM for extraction according to the given instruction and schema
    const extractionResponse = await extract({
      instruction,
      previouslyExtractedContent: content,
      domElements: formattedText,
      schema,
      chunksSeen: 1,
      chunksTotal: 1,
      llmClient,
      requestId,
      userProvidedInstructions: this.userProvidedInstructions,
      logger: this.logger,
    });

    const {
      metadata: { completed },
      ...output
    } = extractionResponse;

    // Clean up debug
    await this.stagehandPage.cleanupDomDebug();

    // **11:** Handle the extraction response and log the results
    this.logger({
      category: "extraction",
      message: "received extraction response",
      auxiliary: {
        extraction_response: {
          value: JSON.stringify(extractionResponse),
          type: "object",
        },
      },
    });

    if (completed) {
      this.logger({
        category: "extraction",
        message: "extraction completed successfully",
        level: 1,
        auxiliary: {
          extraction_response: {
            value: JSON.stringify(extractionResponse),
            type: "object",
          },
        },
      });
    } else {
      this.logger({
        category: "extraction",
        message: "extraction incomplete after processing all data",
        level: 1,
        auxiliary: {
          extraction_response: {
            value: JSON.stringify(extractionResponse),
            type: "object",
          },
        },
      });
    }
    return output;
  }

  private async domExtract<T extends z.AnyZodObject>({
    instruction,
    schema,
    content = {},
    chunksSeen = [],
    llmClient,
    requestId,
    domSettleTimeoutMs,
  }: {
    instruction: string;
    schema: T;
    content?: z.infer<T>;
    chunksSeen?: Array<number>;
    llmClient: LLMClient;
    requestId?: string;
    domSettleTimeoutMs?: number;
  }): Promise<z.infer<T>> {
    this.logger({
      category: "extraction",
      message: "starting extraction using old approach",
      level: 1,
      auxiliary: {
        instruction: {
          value: instruction,
          type: "string",
        },
      },
    });

    // **1:** Wait for the DOM to settle and start DOM debugging
    // This ensures the page is stable before extracting any data.
    await this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
    await this.stagehandPage.startDomDebug();

    // **2:** Call processDom() to handle chunk-based extraction
    // processDom determines which chunk of the page to process next.
    // It will:
    //   - Identify all chunks (vertical segments of the page),
    //   - Pick the next unprocessed chunk,
    //   - Scroll to that chunk's region,
    //   - Extract candidate elements and their text,
    //   - Return the extracted text (outputString), a selectorMap (for referencing elements),
    //     the current chunk index, and the full list of chunks.
    const { outputString, chunk, chunks } = await this.stagehand.page.evaluate(
      (chunksSeen?: number[]) => window.processDom(chunksSeen ?? []),
      chunksSeen,
    );

    this.logger({
      category: "extraction",
      message: "received output from processDom.",
      auxiliary: {
        chunk: {
          value: chunk.toString(),
          type: "integer",
        },
        chunks_left: {
          value: (chunks.length - chunksSeen.length).toString(),
          type: "integer",
        },
        chunks_total: {
          value: chunks.length.toString(),
          type: "integer",
        },
      },
    });

    // **3:** Pass the list of candidate HTML snippets to the LLM
    // The LLM uses the provided instruction and schema to parse and extract
    // structured data.
    const extractionResponse = await extract({
      instruction,
      previouslyExtractedContent: content,
      domElements: outputString,
      schema,
      llmClient,
      chunksSeen: chunksSeen.length,
      chunksTotal: chunks.length,
      requestId,
      isUsingTextExtract: false,
      userProvidedInstructions: this.userProvidedInstructions,
      logger: this.logger,
    });

    const {
      metadata: { completed },
      ...output
    } = extractionResponse;

    await this.stagehandPage.cleanupDomDebug();

    this.logger({
      category: "extraction",
      message: "received extraction response",
      auxiliary: {
        extraction_response: {
          value: JSON.stringify(extractionResponse),
          type: "object",
        },
      },
    });

    // Mark the current chunk as processed by adding it to chunksSeen
    chunksSeen.push(chunk);

    // **4:** Check if extraction is complete
    // If the LLM deems the extraction complete or we've processed all chunks, return the final result.
    // Otherwise, call domExtract again for the next chunk.
    if (completed || chunksSeen.length === chunks.length) {
      this.logger({
        category: "extraction",
        message: "got response",
        auxiliary: {
          extraction_response: {
            value: JSON.stringify(extractionResponse),
            type: "object",
          },
        },
      });

      return output;
    } else {
      this.logger({
        category: "extraction",
        message: "continuing extraction",
        auxiliary: {
          extraction_response: {
            value: JSON.stringify(extractionResponse),
            type: "object",
          },
        },
      });
      await this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);

      // Recursively continue with the next chunk
      return this.domExtract({
        instruction,
        schema,
        content: output,
        chunksSeen,
        llmClient,
        domSettleTimeoutMs,
      });
    }
  }

  /**
   * Get the width, height, and offsets of either the entire page or a specific element.
   * (Matches your existing getTargetDimensions logic, just adapted to accept a string | undefined.)
   */
  private async getTargetDimensions(targetXpath?: string): Promise<{
    width: number;
    height: number;
    offsetLeft: number;
    offsetTop: number;
  }> {
    // If targetXpath is undefined, get entire page dimensions
    if (!targetXpath) {
      const { innerWidth, innerHeight } = await this.stagehand.page.evaluate(
        () => ({
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        }),
      );
      return {
        width: innerWidth,
        height: innerHeight,
        offsetLeft: 0,
        offsetTop: 0,
      };
    }

    // If targetXpath is present, get element-specific dimensions
    const { elemWidth, elemHeight, offsetLeft, offsetTop } =
      await this.stagehand.page.evaluate((xp) => {
        const el = window.getNodeFromXpath(xp) as HTMLElement | null;

        if (!el) {
          return {
            elemWidth: window.innerWidth,
            elemHeight: window.innerHeight,
            offsetLeft: 0,
            offsetTop: 0,
          };
        }

        const rect = el.getBoundingClientRect();
        return {
          elemWidth: rect.width,
          elemHeight: rect.height,
          offsetLeft: rect.left,
          offsetTop: rect.top,
        };
      }, targetXpath);

    return {
      width: elemWidth,
      height: elemHeight,
      offsetLeft,
      offsetTop,
    };
  }

  /**
   * Collects the bounding boxes for each word inside each of the candidate element in selectorMap,
   * adjusting for container offsets, and producing an array of TextAnnotations.
   */
  private async collectAllAnnotations(
    selectorMap: Record<number, string[]>,
    containerWidth: number,
    containerHeight: number,
    offsetLeft: number,
    offsetTop: number,
  ): Promise<TextAnnotation[]> {
    const allAnnotations: TextAnnotation[] = [];

    // Loop over the candidate XPaths in the selector map
    for (const xpaths of Object.values(selectorMap)) {
      const xpath = xpaths[0];

      // Evaluate in the browser to get bounding boxes
      const boundingBoxes: Array<{
        text: string;
        left: number;
        top: number;
        width: number;
        height: number;
      }> = await this.stagehandPage.page.evaluate(
        (xp) => window.getElementBoundingBoxes(xp),
        xpath,
      );

      for (const box of boundingBoxes) {
        // 1. Subtract container offsets to get local coordinates
        const localLeft = box.left - offsetLeft;
        const localTop = box.top - offsetTop;

        // 2. bottom_left is local x, plus local y + height
        //    so the baseline is at the bottom edge of the box
        const bottom_left = { x: localLeft, y: localTop + box.height };

        // 3. Normalize by dividing local positions by container width/height
        const bottom_left_normalized = {
          x: localLeft / containerWidth,
          y: (localTop + box.height) / containerHeight,
        };

        if (box.text.trim().length > 0) {
          allAnnotations.push({
            text: box.text,
            bottom_left,
            bottom_left_normalized,
            width: box.width,
            height: box.height,
          });
        }
      }
    }

    return allAnnotations;
  }

  /**
   * Deduplicate text annotations by grouping them by text, then removing duplicates
   * within a certain proximity threshold.
   */
  private deduplicateAnnotations(
    annotations: TextAnnotation[],
  ): TextAnnotation[] {
    const annotationsGroupedByText = new Map<string, TextAnnotation[]>();
    const deduplicated: TextAnnotation[] = [];

    for (const annotation of annotations) {
      if (!annotationsGroupedByText.has(annotation.text)) {
        annotationsGroupedByText.set(annotation.text, []);
      }
      annotationsGroupedByText.get(annotation.text)!.push(annotation);
    }

    for (const [text, group] of annotationsGroupedByText.entries()) {
      for (const annotation of group) {
        const isDuplicate = deduplicated.some((existing) => {
          if (existing.text !== text) return false;

          const dx = existing.bottom_left.x - annotation.bottom_left.x;
          const dy = existing.bottom_left.y - annotation.bottom_left.y;
          const distance = Math.hypot(dx, dy);
          return distance < PROXIMITY_THRESHOLD;
        });

        if (!isDuplicate) {
          deduplicated.push(annotation);
        }
      }
    }

    return deduplicated;
  }
}
