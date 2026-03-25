export type XMLString = string;

export type XMLFileInfo = {
  readonly fileName: string;
  readonly contents: XMLString;
};

export type XMLInput = XMLString | XMLFileInfo;

type Schema = { readonly schema: XMLInput | ReadonlyArray<XMLInput> };
type Normalization = {
  /**
   * Pass either --format or --c14n to xmllint to get a formatted
   * version of the input document to "normalized" property of the result.
   * normalization: 'format' reformats and reindents the output.
   * normalization: 'c14n' performs W3C XML Canonicalisation (C14N).
   */
  readonly normalization: 'format' | 'c14n';
};

export type XMLLintOptions = {
  /**
   * XML file contents to validate.
   * Note that xmllint only supports UTF-8 encoded files.
  */
  readonly xml: XMLInput | ReadonlyArray<XMLInput>;
  /**
   * Other files that should be added to Emscripten's in-memory
   * file system so that xmllint can access them.
   * Useful if your schema contains imports.
   */
  readonly preload?: null | undefined | XMLFileInfo | ReadonlyArray<XMLFileInfo>;
  /**
   * @default 'schema'
   */
  readonly extension?: 'schema' | 'relaxng';
} & (Schema | Normalization | (Schema & Normalization));

export type XMLValidationError = {
  readonly rawMessage: string;
  /**
   * Error message without the file name and line number.
   */
  readonly message: string;
  /**
   * Position of the error.
   * null if we failed to parse the position from the raw message for some reason.
   */
  readonly loc: null | {
    readonly fileName: string;
    readonly lineNumber: number;
  };
};

export type XMLValidationResult = {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<XMLValidationError>;
  readonly rawOutput: string;
  /**
   * If the "normalization" option was set in the options, this will contain
   * the formatted output. Otherwise, it will be empty string.
   */
  readonly normalized: string;
}

export function validateXML(options: XMLLintOptions): Promise<XMLValidationResult>;