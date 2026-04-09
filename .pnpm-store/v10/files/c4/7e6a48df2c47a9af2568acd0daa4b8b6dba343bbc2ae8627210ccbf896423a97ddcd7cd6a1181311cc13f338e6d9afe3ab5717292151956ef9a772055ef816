declare const defaultOutdent: Outdent;
export interface Outdent {
    /**
       * Remove indentation from a template literal.
       */
    (strings: TemplateStringsArray, ...values: Array<any>): string;
    /**
       * Create and return a new Outdent instance with the given options.
       */
    (options: Options): Outdent;
    /**
       * Remove indentation from a string
       */
    string(str: string): string;
}
export interface Options {
    trimLeadingNewline?: boolean;
    trimTrailingNewline?: boolean;
    /**
       * Normalize all newlines in the template literal to this value.
       *
       * If `null`, newlines are left untouched.
       *
       * Newlines that get normalized are '\r\n', '\r', and '\n'.
       *
       * Newlines within interpolated values are *never* normalized.
       *
       * Although intended for normalizing to '\n' or '\r\n',
       * you can also set to any string; for example ' '.
       */
    newline?: string | null;
}
export default defaultOutdent;
export { defaultOutdent as outdent };
//# sourceMappingURL=index.d.ts.map