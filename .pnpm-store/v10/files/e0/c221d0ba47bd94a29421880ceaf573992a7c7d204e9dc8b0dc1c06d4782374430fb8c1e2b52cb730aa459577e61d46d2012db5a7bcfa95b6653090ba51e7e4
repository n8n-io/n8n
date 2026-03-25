import crypto from "crypto";
import { z } from "zod";
import { ObserveResult, Page } from ".";
import { LogLine } from "../types/log";
import { TextAnnotation } from "../types/textannotation";

// This is a heuristic for the width of a character in pixels. It seems to work
// better than attempting to calculate character widths dynamically, which sometimes
// results in collisions when placing characters on the "canvas".
const HEURISTIC_CHAR_WIDTH = 5;

export function generateId(operation: string) {
  return crypto.createHash("sha256").update(operation).digest("hex");
}

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
export function formatText(
  textAnnotations: TextAnnotation[],
  pageWidth: number,
): string {
  // **1: Sort annotations by vertical position (y-coordinate).**
  //    The topmost annotations appear first, the bottommost last.
  const sortedAnnotations = [...textAnnotations].sort(
    (a, b) => a.bottom_left.y - b.bottom_left.y,
  );

  // **2: Group annotations by line based on their y-coordinate.**
  //    We use an epsilon so that very close y-values are treated as the same line.
  const epsilon = 1;
  const lineMap: Map<number, TextAnnotation[]> = new Map();

  for (const annotation of sortedAnnotations) {
    let foundLineY: number | undefined;
    // **3: Check if this annotation belongs to any existing line group.**
    for (const key of lineMap.keys()) {
      if (Math.abs(key - annotation.bottom_left.y) < epsilon) {
        foundLineY = key;
        break;
      }
    }

    // If found, push into that line; otherwise, create a new line entry.
    if (foundLineY !== undefined) {
      lineMap.get(foundLineY)!.push(annotation);
    } else {
      lineMap.set(annotation.bottom_left.y, [annotation]);
    }
  }

  // **4: Get all unique y-coordinates for lines and sort them top-to-bottom.**
  const lineYs = Array.from(lineMap.keys()).sort((a, b) => a - b);

  // **5: Build an array of "final lines" (TextAnnotations[]) by grouping words for each line.**
  const finalLines: TextAnnotation[][] = [];

  for (const lineY of lineYs) {
    const lineAnnotations = lineMap.get(lineY)!;

    // **6: Sort annotations in the current line left-to-right by x-coordinate.**
    lineAnnotations.sort((a, b) => a.bottom_left.x - b.bottom_left.x);

    // **7: Group annotations into word clusters (sentences/phrases).**
    const groupedLineAnnotations = groupWordsInSentence(lineAnnotations);

    // **8: Push the grouped annotations for this line into finalLines.**
    finalLines.push(groupedLineAnnotations);
  }

  // -------------------------
  // **First Pass**: Calculate the width of the longest line (in characters) up front.
  // We will use this to set the width of the canvas, which will reduce likelihood of collisions.
  // -------------------------
  let maxLineWidthInChars = 0;

  for (const line of finalLines) {
    let lineMaxEnd = 0;
    for (const ann of line) {
      // Convert normalized X to character index
      const startXInChars = Math.round(
        ann.bottom_left_normalized.x * (pageWidth / HEURISTIC_CHAR_WIDTH),
      );
      // Each annotation spans ann.text.length characters
      const endXInChars = startXInChars + ann.text.length;

      if (endXInChars > lineMaxEnd) {
        lineMaxEnd = endXInChars;
      }
    }
    // Track the largest width across all lines
    if (lineMaxEnd > maxLineWidthInChars) {
      maxLineWidthInChars = lineMaxEnd;
    }
  }

  // **9: Add a 20-char buffer to ensure we don’t cut off text.**
  maxLineWidthInChars += 20;

  // **10: Determine the canvas width based on the measured maxLineWidthInChars.**
  const canvasWidth = Math.max(maxLineWidthInChars, 1);

  // **11: Compute the baseline (lowest y) of each line to measure vertical spacing.**
  const lineBaselines = finalLines.map((line) =>
    Math.min(...line.map((a) => a.bottom_left.y)),
  );

  // **12: Compute the gaps between consecutive lines.**
  const verticalGaps: number[] = [];
  for (let i = 1; i < lineBaselines.length; i++) {
    verticalGaps.push(lineBaselines[i] - lineBaselines[i - 1]);
  }

  // **13: Estimate a "normal" line spacing via the median of these gaps.**
  const normalLineSpacing = verticalGaps.length > 0 ? median(verticalGaps) : 0;

  // **14: Create a 2D character canvas (array of arrays), filled with spaces.**
  let canvas: string[][] = [];

  // **15: lineIndex tracks which row of the canvas we’re on; start at -1 so the first line is index 0.**
  let lineIndex = -1;

  // **16: Render each line of text into our canvas.**
  for (let i = 0; i < finalLines.length; i++) {
    if (i === 0) {
      // **17: For the very first line, just increment lineIndex once.**
      lineIndex++;
      ensureLineExists(canvas, lineIndex, canvasWidth);
    } else {
      // **18: For subsequent lines, figure out how many blank lines to insert
      //       based on the gap between this line’s baseline and the previous line’s baseline.**
      const gap = lineBaselines[i] - lineBaselines[i - 1];

      let extraLines = 0;
      // **19: If the gap is significantly larger than the "normal" spacing,
      //       insert blank lines proportionally.**
      if (normalLineSpacing > 0 && gap > 1.2 * normalLineSpacing) {
        extraLines = Math.max(Math.round(gap / normalLineSpacing) - 1, 0);
      }

      // **20: Insert the calculated extra blank lines.**
      for (let e = 0; e < extraLines; e++) {
        lineIndex++;
        ensureLineExists(canvas, lineIndex, canvasWidth);
      }

      // **21: Move to the next line (row) in the canvas for this line’s text.**
      lineIndex++;
      ensureLineExists(canvas, lineIndex, canvasWidth);
    }

    // **22: Place each annotation’s text in the correct horizontal position for this line.**
    const lineAnnotations = finalLines[i];
    for (const annotation of lineAnnotations) {
      const text = annotation.text;

      // **23: Calculate the starting x-position in the canvas by converting normalized x to char space.**
      const startXInChars = Math.round(
        annotation.bottom_left_normalized.x *
          (pageWidth / HEURISTIC_CHAR_WIDTH),
      );

      // **24: Place each character of the annotation in the canvas.**
      for (let j = 0; j < text.length; j++) {
        const xPos = startXInChars + j;
        // **25: Don’t write beyond the right edge of the canvas.**
        if (xPos < canvasWidth) {
          canvas[lineIndex][xPos] = text[j];
        }
      }
    }
  }

  // **26: Trim trailing whitespace from each line to clean up the output.**
  canvas = canvas.map((row) => {
    const lineStr = row.join("");
    return Array.from(lineStr.trimEnd());
  });

  // **27: Combine all rows into a single string, separating rows with newlines.**
  let pageText = canvas.map((line) => line.join("")).join("\n");
  pageText = pageText.trimEnd();

  // **28: Surround the rendered text with lines of dashes for clarity.**
  pageText =
    "-".repeat(canvasWidth) + "\n" + pageText + "\n" + "-".repeat(canvasWidth);

  // **29: Return the final formatted text.**
  return pageText;
}

/**
 * `ensureLineExists` ensures that a specified line index exists in the canvas.
 * If the canvas is not long enough, it extends it by adding new empty lines (filled with spaces).
 * This function is used to dynamically grow the canvas as we progress through the lines.
 *
 * @param canvas - The 2D character canvas array.
 * @param lineIndex - The desired line index that must exist.
 * @param width - The width of each line in characters.
 */
function ensureLineExists(
  canvas: string[][],
  lineIndex: number,
  width: number,
) {
  // loop until the canvas has at least lineIndex+1 lines.
  // each new line is filled with spaces to match the required width.
  while (lineIndex >= canvas.length) {
    canvas.push(new Array(width).fill(" "));
  }
}

/**
 * `groupWordsInSentence` groups annotations within a single line into logical "words" or "sentences".
 * It uses a set of heuristics involving horizontal proximity and similar height
 * to decide when to join multiple annotations into a single grouped annotation.
 *
 * @param lineAnnotations - An array of annotations from a single line of text.
 * @returns An array of grouped annotations, where each represents one concatenated piece of text.
 */
function groupWordsInSentence(
  lineAnnotations: TextAnnotation[],
): TextAnnotation[] {
  const groupedAnnotations: TextAnnotation[] = [];
  let currentGroup: TextAnnotation[] = [];

  for (const annotation of lineAnnotations) {
    // if the current group is empty, start a new group with this annotation
    if (currentGroup.length === 0) {
      currentGroup.push(annotation);
      continue;
    }

    // determine horizontal grouping criteria
    // use a padding factor to allow slight spaces between words
    const padding = 1;
    const lastAnn = currentGroup[currentGroup.length - 1];
    const characterWidth = (lastAnn.width / lastAnn.text.length) * padding;
    const isWithinHorizontalRange =
      annotation.bottom_left.x <=
      lastAnn.bottom_left.x + lastAnn.width + characterWidth;

    // check if the annotation can be grouped with the current group.
    // conditions:
    // 1. the height difference from the group's first annotation is ≤ 4 units
    // 2. the annotation is horizontally close to the last annotation in the group
    if (
      Math.abs(annotation.height - currentGroup[0].height) <= 4 &&
      isWithinHorizontalRange
    ) {
      // if it meets the criteria, add to the current group
      currentGroup.push(annotation);
    } else {
      // if it doesn't meet criteria:
      // 1. finalize the current group into a single grouped annotation,
      // 2. add it to groupedAnnotations,
      // 3. start a new group with the current annotation
      if (currentGroup.length > 0) {
        const groupedAnnotation = createGroupedAnnotation(currentGroup);
        if (groupedAnnotation.text.length > 0) {
          groupedAnnotations.push(groupedAnnotation);
          currentGroup = [annotation];
        }
      }
    }
  }

  // after processing all annotations, if there's a remaining group, finalize it too
  if (currentGroup.length > 0) {
    const groupedAnnotation = createGroupedAnnotation(currentGroup);
    groupedAnnotations.push(groupedAnnotation);
  }

  // return the final array of grouped annotations representing words or phrases
  return groupedAnnotations;
}

/**
 * `createGroupedAnnotation` combines a group of annotations into a single annotation by concatenating their text.
 * It also attempts to preserve formatting, such as marking bold text if the median height suggests emphasis.
 *
 * @param group - An array of annotations that should be merged into a single text element.
 * @returns A new TextAnnotation representing the combined text and averaged metrics from the group.
 */
function createGroupedAnnotation(group: TextAnnotation[]): TextAnnotation {
  // initialize an empty string to build the combined text.
  let text = "";

  // concatenate the text from each annotation in the group.
  // insert a space between words, except when punctuation directly follows a word
  for (const word of group) {
    if (
      [".", ",", '"', "'", ":", ";", "!", "?", "{", "}", "’", "”"].includes(
        word.text,
      )
    ) {
      text += word.text;
    } else {
      text += text !== "" ? " " + word.text : word.text;
    }
  }

  // determine if the combined text qualifies as a "word" (contains alphanumeric chars)
  // and whether its median height suggests emphasizing it (e.g., bold text).
  const isWord = /[a-zA-Z0-9]/.test(text);
  const medianHeight = median(group.map((word) => word.height));

  // if it's considered a word and tall enough, surround it with `**` for bold formatting.
  if (isWord && medianHeight > 25) {
    text = "**" + text + "**";
  }

  // return a new annotation that represents the merged group.
  // use the first annotation's coordinates and normalized positions as references,
  // and sum the widths of all annotations to get the total width.
  return {
    text: text,
    bottom_left: {
      x: group[0].bottom_left.x,
      y: group[0].bottom_left.y,
    },
    bottom_left_normalized: {
      x: group[0].bottom_left_normalized.x,
      y: group[0].bottom_left_normalized.y,
    },
    width: group.reduce((sum, a) => sum + a.width, 0),
    height: group[0].height,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

export function logLineToString(logLine: LogLine): string {
  try {
    const timestamp = logLine.timestamp || new Date().toISOString();
    if (logLine.auxiliary?.error) {
      return `${timestamp}::[stagehand:${logLine.category}] ${logLine.message}\n ${logLine.auxiliary.error.value}\n ${logLine.auxiliary.trace.value}`;
    }
    return `${timestamp}::[stagehand:${logLine.category}] ${logLine.message} ${
      logLine.auxiliary ? JSON.stringify(logLine.auxiliary) : ""
    }`;
  } catch (error) {
    console.error(`Error logging line:`, error);
    return "error logging line";
  }
}

export function validateZodSchema(schema: z.ZodTypeAny, data: unknown) {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export async function drawObserveOverlay(page: Page, results: ObserveResult[]) {
  // Convert single xpath to array for consistent handling
  const xpathList = results.map((result) => result.selector);

  // Filter out empty xpaths
  const validXpaths = xpathList.filter((xpath) => xpath !== "xpath=");

  await page.evaluate((selectors) => {
    selectors.forEach((selector) => {
      let element;
      if (selector.startsWith("xpath=")) {
        const xpath = selector.substring(6);
        element = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
      } else {
        element = document.querySelector(selector);
      }

      if (element instanceof HTMLElement) {
        const overlay = document.createElement("div");
        overlay.setAttribute("stagehandObserve", "true");
        const rect = element.getBoundingClientRect();
        overlay.style.position = "absolute";
        overlay.style.left = rect.left + "px";
        overlay.style.top = rect.top + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";
        overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
        overlay.style.pointerEvents = "none";
        overlay.style.zIndex = "10000";
        document.body.appendChild(overlay);
      }
    });
  }, validXpaths);
}

export async function clearOverlays(page: Page) {
  // remove existing stagehandObserve attributes
  await page.evaluate(() => {
    const elements = document.querySelectorAll('[stagehandObserve="true"]');
    elements.forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });
  });
}

/**
 * Detects if the code is running in the Bun runtime environment.
 * @returns {boolean} True if running in Bun, false otherwise.
 */
export function isRunningInBun(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    "bun" in process.versions
  );
}
