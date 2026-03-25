import {SourceSpan} from './logger';

/**
 * An exception thrown because a Sass compilation failed.
 *
 * @category Other
 */
export class Exception extends Error {
  private constructor();

  /**
   * A human-friendly representation of the exception.
   *
   * Because many tools simply print `Error.message` directly, this includes not
   * only the textual description of what went wrong (the {@link sassMessage})
   * but also an indication of where in the Sass stylesheet the error occurred
   * (the {@link span}) and the Sass stack trace at the point of error (the
   * {@link sassStack}).
   */
  message: string;

  /**
   * A textual description of what went wrong.
   *
   * Unlike {@link message}, this does *not* include representations of {@link
   * span} or {@link sassStack}.
   */
  readonly sassMessage: string;

  /**
   * A human-friendly representation of the Sass stack trace at the point of
   * error.
   */
  readonly sassStack: string;

  /** The location the error occurred in the Sass file that triggered it. */
  readonly span: SourceSpan;

  /** Returns the same string as {@link message}. */
  toString(): string;
}
