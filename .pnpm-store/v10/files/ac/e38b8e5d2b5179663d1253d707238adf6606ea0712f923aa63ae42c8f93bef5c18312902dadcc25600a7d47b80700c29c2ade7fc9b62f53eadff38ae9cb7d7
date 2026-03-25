"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitationUtil = void 0;
// import { stringify } from 'yaml'
// import { Tokenizer } from './tokenizers'
/**
 * Utility functions for manipulating text and citations.
 */
class CitationUtil {
    /**
       *
       * Clips the text to a maximum length in case it exceeds the limit.
       * @param {string} text The text to clip.
       * @param {number} maxLength The maximum length of the text to return, cutting off the last whole word.
       * @returns {string} The modified text
       */
    static snippet(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        let snippet = text.slice(0, maxLength);
        snippet = snippet.slice(0, Math.min(snippet.length, snippet.lastIndexOf(' ')));
        snippet += '...';
        return snippet;
    }
    /**
       * Convert citation tags `[doc(s)n]` to `[n]` where n is a number.
       * @param {string} text The text to format.
       * @returns {string} The formatted text.
       */
    static formatCitationsResponse(text) {
        return text.replace(/\[docs?(\d+)\]/gi, '[$1]');
    }
    /**
       * Get the citations used in the text. This will remove any citations that are included in the citations array from the response but not referenced in the text.
       * @param {string} text - The text to search for citation references, i.e. [1], [2], etc.
       * @param {ClientCitation[]} citations - The list of citations to search for.
       * @returns {ClientCitation[] | undefined} The list of citations used in the text.
       */
    static getUsedCitations(text, citations) {
        const regex = /\[(\d+)\]/gi;
        const matches = text.match(regex);
        if (!matches) {
            return undefined;
        }
        // Remove duplicates
        const filteredMatches = new Set();
        matches.forEach((match) => {
            if (filteredMatches.has(match)) {
                return;
            }
            filteredMatches.add(match);
        });
        // Add citations
        const usedCitations = [];
        filteredMatches.forEach((match) => {
            const found = citations.find((citation) => `[${citation.position}]` === match);
            if (found) {
                usedCitations.push(found);
            }
        });
        return usedCitations;
    }
}
exports.CitationUtil = CitationUtil;
//# sourceMappingURL=citationUtil.js.map