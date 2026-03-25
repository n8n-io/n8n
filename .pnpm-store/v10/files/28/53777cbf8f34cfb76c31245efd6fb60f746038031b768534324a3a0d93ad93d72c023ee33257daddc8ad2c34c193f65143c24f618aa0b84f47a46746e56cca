import {SourceLocation} from './source_location';

/**
 * A span of text within a source file.
 *
 * @category Logger
 */
export interface SourceSpan {
  /** The beginning of this span, inclusive. */
  start: SourceLocation;

  /**
   * The end of this span, exclusive.
   *
   * If {@link start} and {@link end} refer to the same location, the span has
   * zero length and refers to the point immediately after {@link start} and
   * before the next character.
   */
  end: SourceLocation;

  /** The canonical URL of the file this span refers to. */
  url?: URL;

  /** The text covered by the span. */
  text: string;

  /**
   * Text surrounding the span.
   *
   * If this is set, it must include only whole lines, and it must include at
   * least all line(s) which are partially covered by this span.
   */
  context?: string;
}
