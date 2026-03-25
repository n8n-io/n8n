import { Logger } from "./logger";
import { Options as UserOptions, SetCommitsOptions, RewriteSourcesHook, ResolveSourceMapHook, IncludeEntry, ModuleMetadata, ModuleMetadataCallback } from "./types";
export type NormalizedOptions = {
    org: string | undefined;
    project: string | undefined;
    authToken: string | undefined;
    url: string;
    headers: Record<string, string> | undefined;
    debug: boolean;
    silent: boolean;
    errorHandler: ((err: Error) => void) | undefined;
    telemetry: boolean;
    disable: boolean;
    sourcemaps: {
        disable?: boolean | "disable-upload";
        assets?: string | string[];
        ignore?: string | string[];
        rewriteSources?: RewriteSourcesHook;
        resolveSourceMap?: ResolveSourceMapHook;
        filesToDeleteAfterUpload?: string | string[] | Promise<string | string[] | undefined>;
    } | undefined;
    release: {
        name: string | undefined;
        inject: boolean;
        create: boolean;
        finalize: boolean;
        vcsRemote: string;
        setCommits: (SetCommitsOptions & {
            shouldNotThrowOnFailure?: boolean;
        }) | false | undefined;
        dist?: string;
        deploy?: {
            env: string;
            started?: number | string;
            finished?: number | string;
            time?: number;
            name?: string;
            url?: string;
        } | false;
        uploadLegacySourcemaps?: string | IncludeEntry | Array<string | IncludeEntry>;
    };
    bundleSizeOptimizations: {
        excludeDebugStatements?: boolean;
        excludeTracing?: boolean;
        excludeReplayCanvas?: boolean;
        excludeReplayShadowDom?: boolean;
        excludeReplayIframe?: boolean;
        excludeReplayWorker?: boolean;
    } | undefined;
    reactComponentAnnotation: {
        enabled?: boolean;
        ignoredComponents?: string[];
    } | undefined;
    _metaOptions: {
        telemetry: {
            metaFramework: string | undefined;
        };
    };
    applicationKey: string | undefined;
    moduleMetadata: ModuleMetadata | ModuleMetadataCallback | undefined;
    _experiments: {
        injectBuildInformation?: boolean;
    } & Record<string, unknown>;
};
export declare const SENTRY_SAAS_URL = "https://sentry.io";
export declare function normalizeUserOptions(userOptions: UserOptions): NormalizedOptions;
/**
 * Validates a few combinations of options that are not checked by Sentry CLI.
 *
 * For all other options, we can rely on Sentry CLI to validate them. In fact,
 * we can't validate them in the plugin because Sentry CLI might pick up options from
 * its config file.
 *
 * @param options the internal options
 * @param logger the logger
 *
 * @returns `true` if the options are valid, `false` otherwise
 */
export declare function validateOptions(options: NormalizedOptions, logger: Logger): boolean;
//# sourceMappingURL=options-mapping.d.ts.map