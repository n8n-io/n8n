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
 * path of which the error is thrown. For instance: If it's from `@storybook/node-logger`, then
 * NODE-LOGGER If it's from a package that is too broad, e.g. @storybook/cli in the init command,
 * then use a combination like CLI_INIT
 */
declare enum Category {
    CLI = "CLI",
    CLI_INIT = "CLI_INIT",
    CLI_AUTOMIGRATE = "CLI_AUTOMIGRATE",
    CLI_UPGRADE = "CLI_UPGRADE",
    CLI_ADD = "CLI_ADD",
    CODEMOD = "CODEMOD",
    CORE_SERVER = "CORE-SERVER",
    CSF_PLUGIN = "CSF-PLUGIN",
    CSF_TOOLS = "CSF-TOOLS",
    CORE_COMMON = "CORE-COMMON",
    NODE_LOGGER = "NODE-LOGGER",
    TELEMETRY = "TELEMETRY",
    BUILDER_MANAGER = "BUILDER-MANAGER",
    BUILDER_VITE = "BUILDER-VITE",
    BUILDER_WEBPACK5 = "BUILDER-WEBPACK5",
    SOURCE_LOADER = "SOURCE-LOADER",
    POSTINSTALL = "POSTINSTALL",
    DOCS_TOOLS = "DOCS-TOOLS",
    CORE_WEBPACK = "CORE-WEBPACK",
    FRAMEWORK_ANGULAR = "FRAMEWORK_ANGULAR",
    FRAMEWORK_EMBER = "FRAMEWORK_EMBER",
    FRAMEWORK_HTML_VITE = "FRAMEWORK_HTML-VITE",
    FRAMEWORK_HTML_WEBPACK5 = "FRAMEWORK_HTML-WEBPACK5",
    FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS",
    FRAMEWORK_PREACT_VITE = "FRAMEWORK_PREACT-VITE",
    FRAMEWORK_PREACT_WEBPACK5 = "FRAMEWORK_PREACT-WEBPACK5",
    FRAMEWORK_REACT_VITE = "FRAMEWORK_REACT-VITE",
    FRAMEWORK_REACT_WEBPACK5 = "FRAMEWORK_REACT-WEBPACK5",
    FRAMEWORK_SERVER_WEBPACK5 = "FRAMEWORK_SERVER-WEBPACK5",
    FRAMEWORK_SVELTE_VITE = "FRAMEWORK_SVELTE-VITE",
    FRAMEWORK_SVELTE_WEBPACK5 = "FRAMEWORK_SVELTE-WEBPACK5",
    FRAMEWORK_SVELTEKIT = "FRAMEWORK_SVELTEKIT",
    FRAMEWORK_VUE_VITE = "FRAMEWORK_VUE-VITE",
    FRAMEWORK_VUE_WEBPACK5 = "FRAMEWORK_VUE-WEBPACK5",
    FRAMEWORK_VUE3_VITE = "FRAMEWORK_VUE3-VITE",
    FRAMEWORK_VUE3_WEBPACK5 = "FRAMEWORK_VUE3-WEBPACK5",
    FRAMEWORK_WEB_COMPONENTS_VITE = "FRAMEWORK_WEB-COMPONENTS-VITE",
    FRAMEWORK_WEB_COMPONENTS_WEBPACK5 = "FRAMEWORK_WEB-COMPONENTS-WEBPACK5"
}
declare class NxProjectDetectedError extends StorybookError {
    constructor();
}
declare class MissingFrameworkFieldError extends StorybookError {
    constructor();
}
declare class InvalidFrameworkNameError extends StorybookError {
    data: {
        frameworkName: string;
    };
    constructor(data: {
        frameworkName: string;
    });
}
declare class CouldNotEvaluateFrameworkError extends StorybookError {
    data: {
        frameworkName: string;
    };
    constructor(data: {
        frameworkName: string;
    });
}
declare class ConflictingStaticDirConfigError extends StorybookError {
    constructor();
}
declare class InvalidStoriesEntryError extends StorybookError {
    constructor();
}
declare class WebpackMissingStatsError extends StorybookError {
    constructor();
}
declare class WebpackInvocationError extends StorybookError {
    data: {
        error: Error;
    };
    constructor(data: {
        error: Error;
    });
}
declare class WebpackCompilationError extends StorybookError {
    data: {
        errors: {
            message: string;
            stack?: string;
            name?: string;
        }[];
    };
    constructor(data: {
        errors: {
            message: string;
            stack?: string;
            name?: string;
        }[];
    });
}
declare class MissingAngularJsonError extends StorybookError {
    data: {
        path: string;
    };
    constructor(data: {
        path: string;
    });
}
declare class AngularLegacyBuildOptionsError extends StorybookError {
    constructor();
}
declare class CriticalPresetLoadError extends StorybookError {
    data: {
        error: Error;
        presetName: string;
    };
    constructor(data: {
        error: Error;
        presetName: string;
    });
}
declare class MissingBuilderError extends StorybookError {
    constructor();
}
declare class GoogleFontsDownloadError extends StorybookError {
    data: {
        fontFamily: string;
        url: string;
    };
    constructor(data: {
        fontFamily: string;
        url: string;
    });
}
declare class GoogleFontsLoadingError extends StorybookError {
    data: {
        error: unknown | Error;
        url: string;
    };
    constructor(data: {
        error: unknown | Error;
        url: string;
    });
}
declare class NoMatchingExportError extends StorybookError {
    data: {
        error: unknown | Error;
    };
    constructor(data: {
        error: unknown | Error;
    });
}
declare class MainFileESMOnlyImportError extends StorybookError {
    data: {
        location: string;
        line: string | undefined;
        num: number | undefined;
    };
    constructor(data: {
        location: string;
        line: string | undefined;
        num: number | undefined;
    });
}
declare class MainFileMissingError extends StorybookError {
    data: {
        location: string;
        source?: 'storybook' | 'vitest';
    };
    constructor(data: {
        location: string;
        source?: 'storybook' | 'vitest';
    });
}
declare class MainFileEvaluationError extends StorybookError {
    data: {
        location: string;
        error: Error;
    };
    constructor(data: {
        location: string;
        error: Error;
    });
}
declare class GenerateNewProjectOnInitError extends StorybookError {
    data: {
        error: unknown | Error;
        packageManager: string;
        projectType: string;
    };
    constructor(data: {
        error: unknown | Error;
        packageManager: string;
        projectType: string;
    });
}
declare class UpgradeStorybookToLowerVersionError extends StorybookError {
    data: {
        beforeVersion: string;
        currentVersion: string;
    };
    constructor(data: {
        beforeVersion: string;
        currentVersion: string;
    });
}
declare class UpgradeStorybookToSameVersionError extends StorybookError {
    data: {
        beforeVersion: string;
    };
    constructor(data: {
        beforeVersion: string;
    });
}
declare class UpgradeStorybookUnknownCurrentVersionError extends StorybookError {
    constructor();
}
declare class UpgradeStorybookInWrongWorkingDirectory extends StorybookError {
    constructor();
}
declare class NoStatsForViteDevError extends StorybookError {
    constructor();
}
declare class FindPackageVersionsError extends StorybookError {
    data: {
        error: Error | unknown;
        packageName: string;
        packageManager: string;
    };
    constructor(data: {
        error: Error | unknown;
        packageName: string;
        packageManager: string;
    });
}
declare class SavingGlobalSettingsFileError extends StorybookError {
    data: {
        filePath: string;
        error: Error | unknown;
    };
    constructor(data: {
        filePath: string;
        error: Error | unknown;
    });
}

export { AngularLegacyBuildOptionsError, Category, ConflictingStaticDirConfigError, CouldNotEvaluateFrameworkError, CriticalPresetLoadError, FindPackageVersionsError, GenerateNewProjectOnInitError, GoogleFontsDownloadError, GoogleFontsLoadingError, InvalidFrameworkNameError, InvalidStoriesEntryError, MainFileESMOnlyImportError, MainFileEvaluationError, MainFileMissingError, MissingAngularJsonError, MissingBuilderError, MissingFrameworkFieldError, NoMatchingExportError, NoStatsForViteDevError, NxProjectDetectedError, SavingGlobalSettingsFileError, UpgradeStorybookInWrongWorkingDirectory, UpgradeStorybookToLowerVersionError, UpgradeStorybookToSameVersionError, UpgradeStorybookUnknownCurrentVersionError, WebpackCompilationError, WebpackInvocationError, WebpackMissingStatsError };
