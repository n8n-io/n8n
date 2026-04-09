declare class FormidableError extends Error {
    code: number;
    httpCode?: number | undefined;
    constructor(message: string, internalCode: number, httpCode?: number);
}

declare const errors:
    & {
        default: typeof FormidableError;
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
        | "maxFilesExceeded"
        | "smallerThanMinFileSize"
        | "biggerThanMaxFileSize"
        | "noEmptyFiles"
        | "missingContentType"
        | "malformedMultipart"
        | "missingMultipartBoundary"
        | "unknownTransferEncoding"
        | "biggerThanTotalMaxFileSize"
        | "pluginFailed"
        | "cannotCreateDir",
        number
    >;

export = errors;
