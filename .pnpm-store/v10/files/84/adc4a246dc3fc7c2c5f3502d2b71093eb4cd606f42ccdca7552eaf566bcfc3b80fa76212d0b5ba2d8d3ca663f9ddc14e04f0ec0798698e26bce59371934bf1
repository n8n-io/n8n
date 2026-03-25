import { AccessibilityNode, TreeResult } from "../../types/context";
import { StagehandPage } from "../StagehandPage";
import { LogLine } from "../../types/log";
import { CDPSession, Page } from "playwright";
export declare function formatSimplifiedTree(node: AccessibilityNode, level?: number): string;
/**
 * Builds a hierarchical tree structure from a flat array of accessibility nodes.
 * The function processes nodes in multiple passes to create a clean, meaningful tree.
 * @param nodes - Flat array of accessibility nodes from the CDP
 * @returns Object containing both the tree structure and a simplified string representation
 */
export declare function buildHierarchicalTree(nodes: AccessibilityNode[], page?: StagehandPage, logger?: (logLine: LogLine) => void): Promise<TreeResult>;
/**
 * Retrieves the full accessibility tree via CDP and transforms it into a hierarchical structure.
 */
export declare function getAccessibilityTree(page: StagehandPage, logger: (logLine: LogLine) => void): Promise<TreeResult>;
export declare function getXPathByResolvedObjectId(cdpClient: CDPSession, resolvedObjectId: string): Promise<string>;
/**
 * `findScrollableElementIds` is a function that identifies elements in
 * the browser that are deemed "scrollable". At a high level, it does the
 * following:
 * - Calls the browser-side `window.getScrollableElementXpaths()` function,
 *   which returns a list of XPaths for scrollable containers.
 * - Iterates over the returned list of XPaths, locating each element in the DOM
 *   using `stagehandPage.sendCDP(...)`
 *     - During each iteration, we call `Runtime.evaluate` to run `document.evaluate(...)`
 *       with each XPath, obtaining a `RemoteObject` reference if it exists.
 *     - Then, for each valid object reference, we call `DOM.describeNode` to retrieve
 *       the element’s `backendNodeId`.
 * - Collects all resulting `backendNodeId`s in a Set and returns them.
 *
 * @param stagehandPage - A StagehandPage instance with built-in CDP helpers.
 * @returns A Promise that resolves to a Set of unique `backendNodeId`s corresponding
 *          to scrollable elements in the DOM.
 */
export declare function findScrollableElementIds(stagehandPage: StagehandPage): Promise<Set<number>>;
export declare function performPlaywrightMethod(stagehandPage: Page, logger: (logLine: LogLine) => void, method: string, args: unknown[], xpath: string): Promise<void>;
