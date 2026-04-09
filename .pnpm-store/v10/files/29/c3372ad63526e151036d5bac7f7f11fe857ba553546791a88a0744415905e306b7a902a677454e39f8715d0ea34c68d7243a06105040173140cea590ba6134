declare abstract class StorybookError extends Error {
    /** Category of the error. Used to classify the type of error, e.g., 'PREVIEW_API'. */
    readonly category: string;
    /** Code representing the error. Used to uniquely identify the error, e.g., 1. */
    readonly code: number;
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    readonly data: {};
    /**
     * Specifies the documentation for the error.
     *
     * - If `true`, links to a documentation page on the Storybook website (make sure it exists before
     *   enabling) – This is not implemented yet.
     * - If a string, uses the provided URL for documentation (external or FAQ links).
     * - If `false` (default), no documentation link is added.
     */
    readonly documentation: boolean | string | string[];
    /** Flag used to easily determine if the error originates from Storybook. */
    readonly fromStorybook: true;
    get fullErrorCode(): `SB_${string}_${string}`;
    /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
    get name(): string;
    constructor(props: {
        category: string;
        code: number;
        message: string;
        documentation?: boolean | string | string[];
    });
    /** Generates the error message along with additional documentation link (if applicable). */
    static getFullMessage({ documentation, code, category, message, }: ConstructorParameters<typeof StorybookError>[0]): string;
}

/**
 * If you can't find a suitable category for your error, create one based on the package name/file
 * path of which the error is thrown. For instance: If it's from `@storybook/client-logger`, then
 * MANAGER_CLIENT-LOGGER
 *
 * Categories are prefixed by a logical grouping, e.g. MANAGER_ to prevent manager and preview
 * errors from having the same category and error code.
 */
declare enum Category {
    MANAGER_UNCAUGHT = "MANAGER_UNCAUGHT",
    MANAGER_UI = "MANAGER_UI",
    MANAGER_API = "MANAGER_API",
    MANAGER_CLIENT_LOGGER = "MANAGER_CLIENT-LOGGER",
    MANAGER_CHANNELS = "MANAGER_CHANNELS",
    MANAGER_CORE_EVENTS = "MANAGER_CORE-EVENTS",
    MANAGER_ROUTER = "MANAGER_ROUTER",
    MANAGER_THEMING = "MANAGER_THEMING"
}
declare class ProviderDoesNotExtendBaseProviderError extends StorybookError {
    constructor();
}
declare class UncaughtManagerError extends StorybookError {
    data: {
        error: Error;
    };
    constructor(data: {
        error: Error;
    });
}

export { Category, ProviderDoesNotExtendBaseProviderError, UncaughtManagerError };
