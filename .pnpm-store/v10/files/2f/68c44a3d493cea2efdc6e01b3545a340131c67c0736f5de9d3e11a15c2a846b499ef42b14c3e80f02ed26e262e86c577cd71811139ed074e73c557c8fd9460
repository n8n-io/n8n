import { z } from "zod";
import { LLMClient } from "../llm/LLMClient";
import { StagehandPage } from "../StagehandPage";
import { Stagehand } from "../index";
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
export declare class StagehandExtractHandler {
    private readonly stagehand;
    private readonly stagehandPage;
    private readonly logger;
    private readonly userProvidedInstructions?;
    constructor({ stagehand, logger, stagehandPage, userProvidedInstructions, }: {
        stagehand: Stagehand;
        logger: (message: {
            category?: string;
            message: string;
            level?: number;
            auxiliary?: {
                [key: string]: {
                    value: string;
                    type: string;
                };
            };
        }) => void;
        stagehandPage: StagehandPage;
        userProvidedInstructions?: string;
    });
    extract<T extends z.AnyZodObject>({ instruction, schema, content, chunksSeen, llmClient, requestId, domSettleTimeoutMs, useTextExtract, selector, }?: {
        instruction?: string;
        schema?: T;
        content?: z.infer<T>;
        chunksSeen?: Array<number>;
        llmClient?: LLMClient;
        requestId?: string;
        domSettleTimeoutMs?: number;
        useTextExtract?: boolean;
        selector?: string;
    }): Promise<z.infer<T>>;
    private extractPageText;
    private textExtract;
    private domExtract;
    /**
     * Get the width, height, and offsets of either the entire page or a specific element.
     * (Matches your existing getTargetDimensions logic, just adapted to accept a string | undefined.)
     */
    private getTargetDimensions;
    /**
     * Collects the bounding boxes for each word inside each of the candidate element in selectorMap,
     * adjusting for container offsets, and producing an array of TextAnnotations.
     */
    private collectAllAnnotations;
    /**
     * Deduplicate text annotations by grouping them by text, then removing duplicates
     * within a certain proximity threshold.
     */
    private deduplicateAnnotations;
}
