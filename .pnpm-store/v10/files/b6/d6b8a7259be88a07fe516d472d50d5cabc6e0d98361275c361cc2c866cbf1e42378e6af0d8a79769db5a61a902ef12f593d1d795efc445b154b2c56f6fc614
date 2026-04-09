/**
 * Finds the potential starting index where searchedText could begin in text.
 *
 * This function checks for both complete and partial matches:
 * - If searchedText is found as a complete substring, returns the index of the first occurrence.
 * - If the end of text matches the beginning of searchedText (partial match),
 *   returns the index where that partial match starts.
 *
 * @param text - The text to search within.
 * @param searchedText - The text to search for.
 * @returns The starting index of the match (complete or partial), or null if
 *          searchedText is empty or no match is found.
 */
export function getPotentialStartIndex(
  text: string,
  searchedText: string,
): number | null {
  // Return null immediately if searchedText is empty.
  if (searchedText.length === 0) {
    return null;
  }

  // Check if the searchedText exists as a direct substring of text.
  const directIndex = text.indexOf(searchedText);
  if (directIndex !== -1) {
    return directIndex;
  }

  // Otherwise, look for the largest suffix of "text" that matches
  // a prefix of "searchedText". We go from the end of text inward.
  for (let i = text.length - 1; i >= 0; i--) {
    const suffix = text.substring(i);
    if (searchedText.startsWith(suffix)) {
      return i;
    }
  }

  return null;
}
