/**
 * Replace the header of a doc up to and including the specified marker.
 * Insert at beginning if header doesn't exist.
 * @param markdown - doc content
 * @param newHeader - new header including marker
 * @param marker - marker to indicate end of header
 */
export declare function replaceOrCreateHeader(markdown: string, newHeader: string, marker: string): string;
/**
 * Find the section most likely to be the top-level section for a given string.
 */
export declare function findSectionHeader(markdown: string, str: string): string | undefined;
export declare function findFinalHeaderLevel(str: string): number | undefined;
/**
 * Ensure a doc contains (or doesn't contain) some particular content.
 * Upon failure, output the failure and set a failure exit code.
 * @param docName - name of doc for error message
 * @param contentName - name of content for error message
 * @param contents - the doc's contents
 * @param content - the content we are checking for
 * @param expected - whether the content should be present or not present
 */
export declare function expectContentOrFail(docName: string, contentName: string, contents: string, content: string, expected: boolean): void;
export declare function expectSectionHeaderOrFail(contentName: string, contents: string, possibleHeaders: readonly string[], expected: boolean): void;
