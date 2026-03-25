// src/storybook-error.ts
function parseErrorCode({
  code,
  category
}) {
  let paddedCode = String(code).padStart(4, "0");
  return `SB_${category}_${paddedCode}`;
}
function appendErrorRef(url) {
  if (/^(?!.*storybook\.js\.org)|[?&]ref=error\b/.test(url))
    return url;
  try {
    let urlObj = new URL(url);
    return urlObj.searchParams.set("ref", "error"), urlObj.toString();
  } catch {
    return url;
  }
}
var StorybookError = class _StorybookError extends Error {
  constructor(props) {
    super(_StorybookError.getFullMessage(props));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    /**
     * Flag used to determine if the error is handled by us and should therefore not be shown to the
     * user.
     */
    this.isHandledError = !1;
    /**
     * A collection of sub errors which relate to a parent error.
     *
     * Sub-errors are used to represent multiple related errors that occurred together. When a
     * StorybookError with sub-errors is sent to telemetry, both the parent error and each sub-error
     * are sent as separate telemetry events. This allows for better error tracking and debugging.
     *
     * @example
     *
     * ```ts
     * const error1 = new SomeError();
     * const error2 = new AnotherError();
     * const parentError = new ParentError({
     *   // ... other props
     *   subErrors: [error1, error2],
     * });
     * ```
     */
    this.subErrors = [];
    this.category = props.category, this.documentation = props.documentation ?? !1, this.code = props.code, this.isHandledError = props.isHandledError ?? !1, this.name = props.name, this.subErrors = props.subErrors ?? [];
  }
  get fullErrorCode() {
    return parseErrorCode({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let errorName = this._name || this.constructor.name;
    return `${this.fullErrorCode} (${errorName})`;
  }
  set name(name) {
    this._name = name;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation,
    code,
    category,
    message
  }) {
    let page;
    return documentation === !0 ? page = `https://storybook.js.org/error/${parseErrorCode({ code, category })}?ref=error` : typeof documentation == "string" ? page = appendErrorRef(documentation) : Array.isArray(documentation) && (page = `
${documentation.map((doc) => `	- ${appendErrorRef(doc)}`).join(`
`)}`), `${message}${page != null ? `

More info: ${page}
` : ""}`;
  }
};

export {
  StorybookError
};
