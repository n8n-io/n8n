/**
 * Decides whether or not the document is reader-able without parsing the whole thing.
 * @return {boolean} Whether or not we suspect Readability.parse() will suceeed at returning an article object.
 */
export function isProbablyReaderable(
  document: Document,
  options?: {
    /** The minimum node content length used to decide if the document is readerable. */
    minContentLength?: number;
    /** The minumum cumulated 'score' used to determine if the document is readerable. */
    minScore?: number;
    /** The function used to determine if a node is visible. */
    visibilityChecker?: (node: Node) => boolean;
  }
): boolean;

export class Readability<T = string> {
  constructor(
    document: Document,
    options?: {
      debug?: boolean;
      maxElemsToParse?: number;
      nbTopCandidates?: number;
      charThreshold?: number;
      classesToPreserve?: string[];
      keepClasses?: boolean;
      serializer?: (node: Node) => T;
      disableJSONLD?: boolean;
      allowedVideoRegex?: RegExp;
    }
  );

  parse(): null | {
    /** article title */
    title: string | null | undefined;

    /** HTML string of processed article content */
    content: T | null | undefined;

    /** text content of the article, with all the HTML tags removed */
    textContent: string | null | undefined;

    /** length of an article, in characters */
    length: number | null | undefined;

    /** article description, or short excerpt from the content */
    excerpt: string | null | undefined;

    /** author metadata */
    byline: string | null | undefined;

    /** content direction */
    dir: string | null | undefined;

    /** name of the site */
    siteName: string | null | undefined;

    /** content language */
    lang: string | null | undefined;

    /** published time */
    publishedTime: string | null | undefined;
  };
}
