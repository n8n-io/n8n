import { HelpOptions } from './help';
import { Theme } from './theme';
export type CommandDiscovery = {
    /**
     * The strategy to use for loading commands.
     *
     * - `pattern` will use glob patterns to find command files in the specified `target`.
     * - `explicit` will use `import` (or `require` for CJS) to load the commands from the
     *    specified `target`.
     * - `single` will use the `target` which should export a command class. This is for CLIs that
     *    only have a single command.
     *
     * In both cases, the `oclif.manifest.json` file will be used to find the commands if it exists.
     */
    strategy: 'pattern' | 'explicit' | 'single';
    /**
     * If the `strategy` is `pattern`, this is the **directory** to use to find command files.
     *
     * If the `strategy` is `explicit`, this is the **file** that exports the commands.
     *   - This export must be an object with keys that are the command names and values that are the command classes.
     *   - Unless `identifier` is specified, the default export will be used.
     *
     * @example
     * ```typescript
     * // in src/commands.ts
     * import {Command} from '@oclif/core'
     * import Hello from './commands/hello/index.js'
     * import HelloWorld from './commands/hello/world.js'
     *
     * export default {
     *   hello: Hello,
     *   'hello:world': HelloWorld,
     * } satisfies Record<string, Command.Class>
     * ```
     */
    target: string;
    /**
     * The glob patterns to use to find command files when no `oclif.manifest.json` is present.
     * This is only used when `strategy` is `pattern`.
     */
    globPatterns?: string[];
    /**
     * The name of the export to used when loading the command object from the `target` file. Only
     * used when `strategy` is `explicit`. Defaults to `default`.
     *
     * @example
     * ```typescript
     * // in src/commands.ts
     * import {Command} from '@oclif/core'
     * import Hello from './commands/hello/index.js'
     * import HelloWorld from './commands/hello/world.js'
     *
     * export const MY_COMMANDS = {
     *  hello: Hello,
     * 'hello:world': HelloWorld,
     * } satisfies Record<string, Command.Class>
     * ```
     *
     * In the package.json:
     * ```json
     * {
     *  "oclif": {
     *   "commands": {
     *     "strategy": "explicit",
     *     "target": "./dist/index.js",
     *     "identifier": "MY_COMMANDS"
     *    }
     * }
     * ```
     */
    identifier?: string;
};
export type HookOptions = {
    /**
     * The file path containing hook.
     */
    target: string;
    /**
     * The name of the export to use when loading the hook function from the `target` file. Defaults to `default`.
     */
    identifier: string;
};
export type HelpLocationOptions = {
    /**
     * The file path containing help class.
     */
    target: string;
    /**
     * The name of the export to use when loading the help class from the `target` file. Defaults to `default`.
     */
    identifier: string;
};
export type S3Templates = {
    baseDir?: string;
    manifest?: string;
    unversioned?: string;
    versioned?: string;
};
export type S3 = {
    acl?: string | undefined;
    bucket?: string | undefined;
    folder?: string | undefined;
    gz?: boolean | undefined;
    host?: string | undefined;
    indexVersionLimit?: number | undefined;
    templates?: {
        target: S3Templates;
        vanilla: S3Templates;
    } | undefined;
    xz?: boolean | undefined;
};
export type OclifConfiguration = {
    /**
     * Flags in addition to --help that should trigger help output.
     */
    additionalHelpFlags?: string[];
    /**
     * Flags in addition to --version that should trigger version output.
     */
    additionalVersionFlags?: string[];
    /**
     * Plugin aliases.
     */
    aliases?: {
        [name: string]: null | string;
    };
    /**
     * The name of the executable.
     */
    bin?: string;
    /**
     * Aliases for the executable.
     */
    binAliases?: string[];
    commands?: string | CommandDiscovery;
    /**
     * Your CLI's description. Overrides the description in the package.json.
     */
    description?: string | undefined;
    /**
     * Plugins to load when in development mode.
     */
    devPlugins?: string[];
    /**
     * The directory name to use when determining the cache, config, and data directories.
     */
    dirname?: string;
    /**
     * Example plugin to use in @oclif/plugin-plugin's help output.
     */
    examplePlugin?: string;
    /**
     * Customize the exit codes for the CLI.
     */
    exitCodes?: {
        default?: number;
        failedFlagParsing?: number;
        failedFlagValidation?: number;
        invalidArgsSpec?: number;
        nonExistentFlag?: number;
        requiredArgs?: number;
        unexpectedArgs?: number;
    };
    /**
     * Enable flexible taxonomy for commands.
     */
    flexibleTaxonomy?: boolean;
    /**
     * The location of your custom help class.
     */
    helpClass?: string | HelpLocationOptions;
    /**
     * Options for the help output.
     */
    helpOptions?: HelpOptions;
    /**
     * Register hooks to run at various points in the CLI lifecycle.
     */
    hooks?: {
        [name: string]: string | string[] | HookOptions | HookOptions[] | (string | HookOptions)[];
    };
    /**
     * Plugins that can be installed just-in-time.
     */
    jitPlugins?: Record<string, string>;
    macos?: {
        identifier?: string;
        sign?: string;
    };
    /**
     * Use a private or alternate npm registry.
     */
    npmRegistry?: string;
    /**
     * Script to run during postinstall on windows.
     */
    nsisCustomization?: string;
    /**
     * Plugin prefix to use when working with plugins with @oclif/plugin-plugins.
     *
     * Defaults to `plugin-`.
     */
    pluginPrefix?: string;
    /**
     * Plugins to load.
     */
    plugins?: string[];
    /**
     * Template string used to build links to source code in CLI's README (when using `oclif readme`).
     */
    repositoryPrefix?: string;
    schema?: number;
    /**
     * The namespace to be used for plugins of your CLI, e.g. `@salesforce`.
     */
    scope?: string;
    /**
     * State of your CLI
     *
     * - `beta` - will show message to user that command or CLI is in beta
     * - `deprecated` - will show message to user that command or CLI is deprecated
     */
    state?: 'beta' | 'deprecated' | string;
    /**
     * The theme to ship with the CLI.
     *
     * Can be a path to a JSON file or a Theme object.
     */
    theme?: string | Theme;
    /**
     * Separator to use for your CLI. Can be `:` or ` `.
     */
    topicSeparator?: ' ' | ':';
    /**
     * Customize the topics in the CLI.
     */
    topics?: {
        [k: string]: {
            description?: string;
            hidden?: boolean;
            subtopics?: OclifConfiguration['topics'];
        };
    };
    /**
     * Tar flags configuration for different platforms.
     *
     * {
     *  "tarFlags": {
     *   "win32": "--force-local",
     *   "darwin": "--no-xattrs"
     *  }
     * }
     *
     */
    tarFlags?: {
        [platform: string]: string;
    };
    update?: {
        autoupdate?: {
            debounce?: number;
            rollout?: number;
        };
        disableNpmLookup?: boolean;
        node?: {
            targets?: string[];
            version?: string;
            options?: string | string[];
        };
        s3?: S3;
    };
    'warn-if-update-available'?: {
        authorization?: string;
        message?: string;
        registry?: string;
        timeoutInDays?: number;
        frequency?: number;
        frequencyUnit?: 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds';
    };
    windows?: {
        homepage?: string;
        keypath?: string;
        name?: string;
    };
};
export type UserPlugin = {
    name: string;
    tag?: string;
    type: 'user';
    url?: string;
};
export type LinkedPlugin = {
    name: string;
    root: string;
    type: 'link';
};
export type UserPJSON = {
    oclif: {
        plugins?: (UserPlugin | LinkedPlugin)[];
    };
    private?: boolean;
};
export type PJSON = {
    [k: string]: any;
    dependencies?: {
        [name: string]: string;
    };
    devDependencies?: {
        [name: string]: string;
    };
    name: string;
    oclif: OclifConfiguration;
    version: string;
};
