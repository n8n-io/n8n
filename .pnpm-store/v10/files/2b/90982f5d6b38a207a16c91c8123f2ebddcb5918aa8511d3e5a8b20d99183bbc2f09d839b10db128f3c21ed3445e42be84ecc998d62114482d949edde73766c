/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ClientCitation } from '@microsoft/agents-activity';
/**
 * Utility functions for manipulating text and citations.
 */
export declare class CitationUtil {
    /**
       *
       * Clips the text to a maximum length in case it exceeds the limit.
       * @param {string} text The text to clip.
       * @param {number} maxLength The maximum length of the text to return, cutting off the last whole word.
       * @returns {string} The modified text
       */
    static snippet(text: string, maxLength: number): string;
    /**
       * Convert citation tags `[doc(s)n]` to `[n]` where n is a number.
       * @param {string} text The text to format.
       * @returns {string} The formatted text.
       */
    static formatCitationsResponse(text: string): string;
    /**
       * Get the citations used in the text. This will remove any citations that are included in the citations array from the response but not referenced in the text.
       * @param {string} text - The text to search for citation references, i.e. [1], [2], etc.
       * @param {ClientCitation[]} citations - The list of citations to search for.
       * @returns {ClientCitation[] | undefined} The list of citations used in the text.
       */
    static getUsedCitations(text: string, citations: ClientCitation[]): ClientCitation[] | undefined;
}
