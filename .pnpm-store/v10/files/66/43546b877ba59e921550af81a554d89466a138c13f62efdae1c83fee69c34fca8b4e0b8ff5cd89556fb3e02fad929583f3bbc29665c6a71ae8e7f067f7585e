import { z } from "zod";
import { ObserveResult, Page } from ".";
import { LogLine } from "../types/log";
import { TextAnnotation } from "../types/textannotation";
export declare function generateId(operation: string): string;
/**
 * `formatText` converts a list of text annotations into a formatted text representation.
 * Each annotation represents a piece of text at a certain position on a webpage.
 * The formatting attempts to reconstruct a textual "screenshot" of the page by:
 * - Grouping annotations into lines based on their vertical positions.
 * - Adjusting spacing to reflect line gaps.
 * - Attempting to preserve relative positions and formatting.
 *
 * The output is a text block, optionally surrounded by lines of dashes, that aims
 * to closely mirror the visual layout of the text on the page.
 *
 * @param textAnnotations - An array of TextAnnotations describing text and their positions.
 * @param pageWidth - The width of the page in pixels, used to normalize positions.
 * @returns A string representing the text layout of the page.
 */
export declare function formatText(textAnnotations: TextAnnotation[], pageWidth: number): string;
export declare function logLineToString(logLine: LogLine): string;
export declare function validateZodSchema(schema: z.ZodTypeAny, data: unknown): boolean;
export declare function drawObserveOverlay(page: Page, results: ObserveResult[]): Promise<void>;
export declare function clearOverlays(page: Page): Promise<void>;
/**
 * Detects if the code is running in the Bun runtime environment.
 * @returns {boolean} True if running in Bun, false otherwise.
 */
export declare function isRunningInBun(): boolean;
