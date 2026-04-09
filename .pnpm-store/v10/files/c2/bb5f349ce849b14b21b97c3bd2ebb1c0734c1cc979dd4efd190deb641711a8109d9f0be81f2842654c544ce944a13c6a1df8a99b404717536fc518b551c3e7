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
 * CLIENT-LOGGER
 *
 * Categories are prefixed by a logical grouping, e.g. PREVIEW_ or FRAMEWORK_ to prevent manager and
 * preview errors from having the same category and error code.
 */
declare enum Category {
    BLOCKS = "BLOCKS",
    DOCS_TOOLS = "DOCS-TOOLS",
    PREVIEW_CLIENT_LOGGER = "PREVIEW_CLIENT-LOGGER",
    PREVIEW_CHANNELS = "PREVIEW_CHANNELS",
    PREVIEW_CORE_EVENTS = "PREVIEW_CORE-EVENTS",
    PREVIEW_INSTRUMENTER = "PREVIEW_INSTRUMENTER",
    PREVIEW_API = "PREVIEW_API",
    PREVIEW_REACT_DOM_SHIM = "PREVIEW_REACT-DOM-SHIM",
    PREVIEW_ROUTER = "PREVIEW_ROUTER",
    PREVIEW_THEMING = "PREVIEW_THEMING",
    RENDERER_HTML = "RENDERER_HTML",
    RENDERER_PREACT = "RENDERER_PREACT",
    RENDERER_REACT = "RENDERER_REACT",
    RENDERER_SERVER = "RENDERER_SERVER",
    RENDERER_SVELTE = "RENDERER_SVELTE",
    RENDERER_VUE = "RENDERER_VUE",
    RENDERER_VUE3 = "RENDERER_VUE3",
    RENDERER_WEB_COMPONENTS = "RENDERER_WEB-COMPONENTS",
    FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS",
    ADDON_VITEST = "ADDON_VITEST"
}
declare class MissingStoryAfterHmrError extends StorybookError {
    data: {
        storyId: string;
    };
    constructor(data: {
        storyId: string;
    });
}
declare class ImplicitActionsDuringRendering extends StorybookError {
    data: {
        phase: string;
        name: string;
        deprecated: boolean;
    };
    constructor(data: {
        phase: string;
        name: string;
        deprecated: boolean;
    });
}
declare class CalledExtractOnStoreError extends StorybookError {
    constructor();
}
declare class MissingRenderToCanvasError extends StorybookError {
    constructor();
}
declare class CalledPreviewMethodBeforeInitializationError extends StorybookError {
    data: {
        methodName: string;
    };
    constructor(data: {
        methodName: string;
    });
}
declare class StoryIndexFetchError extends StorybookError {
    data: {
        text: string;
    };
    constructor(data: {
        text: string;
    });
}
declare class MdxFileWithNoCsfReferencesError extends StorybookError {
    data: {
        storyId: string;
    };
    constructor(data: {
        storyId: string;
    });
}
declare class EmptyIndexError extends StorybookError {
    constructor();
}
declare class NoStoryMatchError extends StorybookError {
    data: {
        storySpecifier: string;
    };
    constructor(data: {
        storySpecifier: string;
    });
}
declare class MissingStoryFromCsfFileError extends StorybookError {
    data: {
        storyId: string;
    };
    constructor(data: {
        storyId: string;
    });
}
declare class StoryStoreAccessedBeforeInitializationError extends StorybookError {
    constructor();
}
declare class MountMustBeDestructuredError extends StorybookError {
    data: {
        playFunction: string;
    };
    constructor(data: {
        playFunction: string;
    });
}
declare class NoRenderFunctionError extends StorybookError {
    data: {
        id: string;
    };
    constructor(data: {
        id: string;
    });
}
declare class NoStoryMountedError extends StorybookError {
    constructor();
}
declare class NextJsSharpError extends StorybookError {
    constructor();
}
declare class NextjsRouterMocksNotAvailable extends StorybookError {
    data: {
        importType: string;
    };
    constructor(data: {
        importType: string;
    });
}
declare class UnknownArgTypesError extends StorybookError {
    data: {
        type: object;
        language: string;
    };
    constructor(data: {
        type: object;
        language: string;
    });
}
declare class UnsupportedViewportDimensionError extends StorybookError {
    data: {
        dimension: string;
        value: string;
    };
    constructor(data: {
        dimension: string;
        value: string;
    });
}

export { CalledExtractOnStoreError, CalledPreviewMethodBeforeInitializationError, Category, EmptyIndexError, ImplicitActionsDuringRendering, MdxFileWithNoCsfReferencesError, MissingRenderToCanvasError, MissingStoryAfterHmrError, MissingStoryFromCsfFileError, MountMustBeDestructuredError, NextJsSharpError, NextjsRouterMocksNotAvailable, NoRenderFunctionError, NoStoryMatchError, NoStoryMountedError, StoryIndexFetchError, StoryStoreAccessedBeforeInitializationError, UnknownArgTypesError, UnsupportedViewportDimensionError };
