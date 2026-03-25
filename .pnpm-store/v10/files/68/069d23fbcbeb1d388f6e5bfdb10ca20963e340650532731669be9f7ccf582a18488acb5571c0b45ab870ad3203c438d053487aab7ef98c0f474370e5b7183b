import { Command } from '../command';
import { Config } from './config';
import { Input, OutputFlags } from './parser';
import { Plugin } from './plugin';
interface HookMeta {
    options: Record<string, unknown>;
    return: any;
}
type Context = {
    debug(...args: any[]): void;
    error(message: Error | string, options?: {
        code?: string;
        exit?: number;
    }): void;
    exit(code?: number): void;
    log(message?: any, ...args: any[]): void;
    warn(message: string): void;
};
export interface Hooks {
    [event: string]: HookMeta;
    command_incomplete: {
        options: {
            argv: string[];
            id: string;
            matches: Command.Loadable[];
        };
        return: unknown;
    };
    command_not_found: {
        options: {
            argv?: string[];
            id: string;
        };
        return: unknown;
    };
    finally: {
        options: {
            argv: string[];
            id: string;
            Command: Command.Loadable | undefined;
            error: Error | undefined;
        };
        return: void;
    };
    init: {
        options: {
            argv: string[];
            id: string | undefined;
        };
        return: void;
    };
    jit_plugin_not_installed: {
        options: {
            argv: string[];
            command: Command.Loadable;
            id: string;
            pluginName: string;
            pluginVersion: string;
        };
        return: unknown;
    };
    'plugins:preinstall': {
        options: {
            plugin: {
                name: string;
                tag: string;
                type: 'npm';
            } | {
                type: 'repo';
                url: string;
            };
        };
        return: void;
    };
    postrun: {
        options: {
            Command: Command.Class;
            argv: string[];
            result?: any;
        };
        return: void;
    };
    preparse: {
        options: {
            argv: string[];
            options: Input<OutputFlags<any>, OutputFlags<any>, OutputFlags<any>>;
        };
        return: string[];
    };
    prerun: {
        options: {
            Command: Command.Class;
            argv: string[];
        };
        return: void;
    };
    preupdate: {
        options: {
            channel: string;
            version: string;
        };
        return: void;
    };
    update: {
        options: {
            channel: string;
            version: string;
        };
        return: void;
    };
}
export type Hook<T extends keyof P, P extends Hooks = Hooks> = (this: Hook.Context, options: P[T]['options'] & {
    config: Config;
    context: Context;
}) => Promise<P[T]['return']>;
export declare namespace Hook {
    /**
     * Runs at the end of the CLI lifecycle - regardless of success or failure.
     */
    type Finally = Hook<'finally'>;
    /**
     * Runs when the CLI is initialized before a command is executed.
     */
    type Init = Hook<'init'>;
    /**
     * Runs before the `plugins install` command from @oclif/plugin-plugins is run.
     */
    type PluginsPreinstall = Hook<'plugins:preinstall'>;
    /**
     * Runs after the `init` hook, after a command is found but before it is executed.
     */
    type Prerun = Hook<'prerun'>;
    /**
     * Runs after a command is successfully executed. Does not run if the command fails.
     */
    type Postrun = Hook<'postrun'>;
    /**
     * Runs before the CLI is updated by `update` command from @oclif/plugin-update.
     */
    type Preupdate = Hook<'preupdate'>;
    /**
     * Runs before a command's flags and args are parsed. Useful for modifying the command line arguments before they are parsed.
     *
     * The return value is a string[] of the modified arguments.
     */
    type Preparse = Hook<'preparse'>;
    /**
     * Runs once the `update` command from @oclif/plugin-update is run.
     */
    type Update = Hook<'update'>;
    /**
     * Runs when a command is not found.
     */
    type CommandNotFound = Hook<'command_not_found'>;
    /**
     * Runs when a partial command is entered and no matching command is found.
     */
    type CommandIncomplete = Hook<'command_incomplete'>;
    /**
     * Runs when a command from an uninstalled JIT plugins is run.
     */
    type JitPluginNotInstalled = Hook<'jit_plugin_not_installed'>;
    interface Context {
        config: Config;
        debug(...args: any[]): void;
        error(message: Error | string, options?: {
            code?: string;
            exit?: number;
        }): void;
        exit(code?: number): void;
        log(message?: any, ...args: any[]): void;
        warn(message: string): void;
    }
    interface Result<T> {
        failures: Array<{
            error: Error;
            plugin: Plugin;
        }>;
        successes: Array<{
            plugin: Plugin;
            result: T;
        }>;
    }
}
export {};
