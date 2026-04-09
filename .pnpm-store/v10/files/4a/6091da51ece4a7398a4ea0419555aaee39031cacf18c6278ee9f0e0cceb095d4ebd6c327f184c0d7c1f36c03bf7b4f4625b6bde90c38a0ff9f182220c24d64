import { TypescriptOptions, StorybookConfig, PackageJson } from '@storybook/core/types';
import { BinaryLike } from 'crypto';

type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'bun' | 'deno';
type AgentName = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno';
interface DetectResult {
    /**
     * Agent name without the specifier.
     *
     * Can be `npm`, `yarn`, `pnpm`, `bun`, or `deno`.
     */
    name: AgentName;
    /**
     * Agent specifier to resolve the command.
     *
     * May contain '@' to differentiate the version (e.g. 'yarn@berry').
     * Use `name` for the agent name without the specifier.
     */
    agent: Agent;
    /**
     * Specific version of the agent, read from `packageManager` field in package.json.
     */
    version?: string;
}

declare const monorepoConfigs: {
    readonly Nx: "nx.json";
    readonly Turborepo: "turbo.json";
    readonly Lerna: "lerna.json";
    readonly Rush: "rush.json";
    readonly Lage: "lage.config.json";
};
type MonorepoType = keyof typeof monorepoConfigs | 'Workspaces' | undefined;

type EventType = 'boot' | 'dev' | 'build' | 'upgrade' | 'init' | 'init-step' | 'scaffolded-empty' | 'browser' | 'canceled' | 'error' | 'error-metadata' | 'version-update' | 'core-config' | 'remove' | 'save-story' | 'create-new-story-file' | 'create-new-story-file-search' | 'testing-module-watch-mode' | 'testing-module-completed-report' | 'testing-module-crash-report';
interface Dependency {
    version: string | undefined;
    versionSpecifier?: string;
}
interface StorybookAddon extends Dependency {
    options: any;
}
type StorybookMetadata = {
    storybookVersion?: string;
    storybookVersionSpecifier: string;
    generatedAt?: number;
    userSince?: number;
    language: 'typescript' | 'javascript';
    framework?: {
        name: string;
        options?: any;
    };
    builder?: string;
    renderer?: string;
    monorepo?: MonorepoType;
    packageManager?: {
        type: DetectResult['name'];
        version: DetectResult['version'];
        agent: DetectResult['agent'];
    };
    typescriptOptions?: Partial<TypescriptOptions>;
    addons?: Record<string, StorybookAddon>;
    storybookPackages?: Record<string, Dependency>;
    metaFramework?: {
        name: string;
        packageName: string;
        version: string;
    };
    testPackages?: Record<string, string | undefined>;
    hasRouterPackage?: boolean;
    hasStorybookEslint?: boolean;
    hasStaticDirs?: boolean;
    hasCustomWebpack?: boolean;
    hasCustomBabel?: boolean;
    features?: StorybookConfig['features'];
    refCount?: number;
    preview?: {
        usesGlobals?: boolean;
    };
    portableStoriesFileCount?: number;
    applicationFileCount?: number;
};
interface Payload {
    [key: string]: any;
}
interface Options {
    retryDelay: number;
    immediate: boolean;
    configDir?: string;
    enableCrashReports?: boolean;
    stripMetadata?: boolean;
    notify?: boolean;
}
interface TelemetryData {
    eventType: EventType;
    payload: Payload;
    metadata?: StorybookMetadata;
}

declare const oneWayHash: (payload: BinaryLike) => string;

declare const metaFrameworks: Record<string, string>;
declare const sanitizeAddonName: (name: string) => string;
declare const computeStorybookMetadata: ({ packageJsonPath, packageJson, mainConfig, }: {
    packageJsonPath: string;
    packageJson: PackageJson;
    mainConfig?: StorybookConfig & Record<string, any>;
}) => Promise<StorybookMetadata>;
declare const getStorybookMetadata: (_configDir?: string) => Promise<StorybookMetadata>;

interface IErrorWithStdErrAndStdOut {
    stderr?: Buffer | string;
    stdout?: Buffer | string;
    [key: string]: unknown;
}
declare function removeAnsiEscapeCodes(input?: string): string;
declare function cleanPaths(str: string, separator?: string): string;
declare function sanitizeError(error: Error, pathSeparator?: string): any;

interface UpgradeSummary {
    timestamp: number;
    eventType?: EventType;
    eventId?: string;
    sessionId?: string;
}
declare const getPrecedingUpgrade: (events?: any) => Promise<UpgradeSummary | undefined>;

declare const addToGlobalContext: (key: string, value: any) => void;

/** Is this story part of the CLI generated examples, including user-created stories in those files */
declare const isExampleStoryId: (storyId: string) => boolean;
declare const telemetry: (eventType: EventType, payload?: Payload, options?: Partial<Options>) => Promise<void>;

export { type Dependency, type EventType, type IErrorWithStdErrAndStdOut, type Options, type Payload, type StorybookAddon, type StorybookMetadata, type TelemetryData, addToGlobalContext, cleanPaths, computeStorybookMetadata, getPrecedingUpgrade, getStorybookMetadata, isExampleStoryId, metaFrameworks, oneWayHash, removeAnsiEscapeCodes, sanitizeAddonName, sanitizeError, telemetry };
