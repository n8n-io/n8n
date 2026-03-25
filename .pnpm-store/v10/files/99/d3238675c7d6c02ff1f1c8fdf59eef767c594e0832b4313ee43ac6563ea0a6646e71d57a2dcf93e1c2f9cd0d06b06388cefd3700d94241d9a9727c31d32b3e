/**
 * Extract definitions from SVG
 *
 * Can be used with other tags, but name kept for backwards compatibility.
 * Should be used only with tags that cannot be nested, such as masks, clip paths, etc.
 */
interface SplitSVGDefsResult {
    defs: string;
    content: string;
}
declare function splitSVGDefs(content: string, tag?: string): SplitSVGDefsResult;
/**
 * Merge defs and content
 */
declare function mergeDefsAndContent(defs: string, content: string): string;
/**
 * Wrap SVG content, without wrapping definitions
 */
declare function wrapSVGContent(body: string, start: string, end: string): string;

export { mergeDefsAndContent, splitSVGDefs, wrapSVGContent };
