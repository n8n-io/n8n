import type { Backend, BackendConfiguration, FilesystemOf, SharedConfig } from './backends/backend.js';
import type { Device, DeviceDriver } from './internal/devices.js';
import type { LogConfiguration } from './internal/log.js';
/**
 * Configuration for a specific mount point
 * @category Backends and Configuration
 */
export type MountConfiguration<T extends Backend> = FilesystemOf<T> | BackendConfiguration<T> | T;
/**
 * Retrieve a file system with `configuration`.
 * @category Backends and Configuration
 * @see MountConfiguration
 */
export declare function resolveMountConfig<T extends Backend>(configuration: MountConfiguration<T>, _depth?: number): Promise<FilesystemOf<T>>;
/**
 * An object mapping mount points to backends
 * @category Backends and Configuration
 */
export interface ConfigMounts {
    [K: string]: Backend;
}
/**
 * Configuration
 * @category Backends and Configuration
 */
export interface Configuration<T extends ConfigMounts> extends SharedConfig {
    /**
     * An object mapping mount points to mount configuration
     */
    mounts: {
        [K in keyof T]: MountConfiguration<T[K]>;
    };
    /**
     * The uid to use
     * @default 0
     */
    uid: number;
    /**
     * The gid to use
     * @default 0
     */
    gid: number;
    /**
     * Whether to automatically add normal Linux devices
     * @default false
     */
    addDevices: boolean;
    /**
     * If true, disables *all* permissions checking.
     *
     * This can increase performance.
     * @default false
     */
    disableAccessChecks: boolean;
    /**
     * If true, disables `read` and `readSync` from updating the atime.
     *
     * This can increase performance.
     * @experimental
     * @default false
     */
    disableUpdateOnRead: boolean;
    /**
     * If true, files will only sync to the file system when closed.
     *
     * This can increase performance.
     * @experimental
     * @overrides `disableUpdateOnRead`
     * @default false
     */
    onlySyncOnClose: boolean;
    /**
     * Configurations options for the log.
     * @experimental
     */
    log: LogConfiguration;
}
/**
 * Configures ZenFS with single mount point /
 * @category Backends and Configuration
 */
export declare function configureSingle<T extends Backend>(configuration: MountConfiguration<T>): Promise<void>;
/**
 * @category Backends and Configuration
 */
export declare function addDevice(driver: DeviceDriver, options?: object): Device;
/**
 * Configures ZenFS with `configuration`
 * @category Backends and Configuration
 * @see Configuration
 */
export declare function configure<T extends ConfigMounts>(configuration: Partial<Configuration<T>>): Promise<void>;
