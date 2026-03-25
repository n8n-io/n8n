/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ClientCitation } from '@microsoft/agents-activity'

// import { stringify } from 'yaml'

// import { Tokenizer } from './tokenizers'

/**
 * Utility functions for manipulating text and citations.
 */
export class CitationUtil {
  /**
     *
     * Clips the text to a maximum length in case it exceeds the limit.
     * @param {string} text The text to clip.
     * @param {number} maxLength The maximum length of the text to return, cutting off the last whole word.
     * @returns {string} The modified text
     */
  public static snippet (text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    let snippet = text.slice(0, maxLength)
    snippet = snippet.slice(0, Math.min(snippet.length, snippet.lastIndexOf(' ')))
    snippet += '...'
    return snippet
  }

  /**
     * Convert citation tags `[doc(s)n]` to `[n]` where n is a number.
     * @param {string} text The text to format.
     * @returns {string} The formatted text.
     */
  public static formatCitationsResponse (text: string): string {
    return text.replace(/\[docs?(\d+)\]/gi, '[$1]')
  }

  /**
     * Get the citations used in the text. This will remove any citations that are included in the citations array from the response but not referenced in the text.
     * @param {string} text - The text to search for citation references, i.e. [1], [2], etc.
     * @param {ClientCitation[]} citations - The list of citations to search for.
     * @returns {ClientCitation[] | undefined} The list of citations used in the text.
     */
  public static getUsedCitations (text: string, citations: ClientCitation[]): ClientCitation[] | undefined {
    const regex = /\[(\d+)\]/gi
    const matches = text.match(regex)

    if (!matches) {
      return undefined
    }

    // Remove duplicates
    const filteredMatches = new Set()
    matches.forEach((match) => {
      if (filteredMatches.has(match)) {
        return
      }

      filteredMatches.add(match)
    })

    // Add citations
    const usedCitations: ClientCitation[] = []
    filteredMatches.forEach((match) => {
      const found = citations.find((citation) => `[${citation.position}]` === match)
      if (found) {
        usedCitations.push(found)
      }
    })
    return usedCitations
  }
}
