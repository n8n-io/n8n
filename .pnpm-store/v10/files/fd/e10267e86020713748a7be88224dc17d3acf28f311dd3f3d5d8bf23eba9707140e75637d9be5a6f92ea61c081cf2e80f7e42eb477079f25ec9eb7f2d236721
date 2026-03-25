declare class FormidableError extends Error {
    internalCode: number;
    httpCode?: number | undefined;
    constructor(message: string, internalCode: number, httpCode?: number);
}

declare const errors:
    & {
        FormidableError: typeof FormidableError;
    }
    & Record<
        | "missingPlugin"
        | "pluginFunction"
        | "aborted"
        | "noParser"
        | "uninitializedParser"
        | "filenameNotString"
        | "maxFieldsSizeExceeded"
        | "maxFieldsExceeded"
        | "smallerThanMinFileSize"
        | "biggerThanMaxFileSize"
        | "noEmptyFiles"
        | "missingContentType"
        | "malformedMultipart"
        | "missingMultipartBoundary"
        | "unknownTransferEncoding",
        number
    >;

export = errors;
