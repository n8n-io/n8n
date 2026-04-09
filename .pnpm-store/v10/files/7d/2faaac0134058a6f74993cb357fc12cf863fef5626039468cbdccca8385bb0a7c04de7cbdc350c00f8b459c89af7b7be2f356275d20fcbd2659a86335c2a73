import { InMemoryStore } from '../backends/memory.js';
import { StoreFS } from '../backends/store/fs.js';
import { Stats } from '../stats.js';
import type { FileReadResult } from './file.js';
import { File } from './file.js';
import type { CreationOptions } from './filesystem.js';
import { Inode } from './inode.js';
/**
 * A device
 * @todo Maybe add some other device information, like a UUID?
 * @category Internals
 * @privateRemarks
 * UUIDs were considered, however they don't make sense without an easy mechanism for persistence
 */
export interface Device<TData = any> {
    /**
     * The device's driver
     */
    driver: DeviceDriver<TData>;
    /**
     * Which inode the device is assigned
     */
    ino: number;
    /**
     * Data associated with a device.
     * This is meant to be used by device drivers.
     */
    data: TData;
    /**
     * Major device number
     */
    major: number;
    /**
     * Minor device number
     */
    minor: number;
}
/**
 * @category Internals
 */
export interface DeviceInit<TData = any> {
    data?: TData;
    minor?: number;
    major?: number;
    name?: string;
}
/**
 * A device driver
 * @category Internals
 */
export interface DeviceDriver<TData = any> {
    /**
     * The name of the device driver
     */
    name: string;
    /**
     * If true, only a single device can exist per device FS.
     * Note that if this is unset or false, auto-named devices will have a number suffix
     */
    singleton?: boolean;
    /**
     * Whether the device is buffered (a "block" device) or unbuffered (a "character" device)
     * @default false
     */
    isBuffered?: boolean;
    /**
     * Initializes a new device.
     * @returns `Device.data`
     */
    init?(ino: number, options: object): DeviceInit<TData>;
    /**
     * Synchronously read from a device file
     * @group File operations
     * @deprecated
     * @todo [BREAKING] Remove
     */
    read?(file: DeviceFile<TData>, buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    /**
     * Synchronously read from a device.
     * @privateRemarks
     * For many devices there is no concept of an offset or end.
     * For example, /dev/random will be "the same" regardless of where you read from- random data.
     * @group File operations
     * @todo [BREAKING] Rename to `read`
     */
    readD(device: Device<TData>, buffer: Uint8Array, offset: number, end: number): void;
    /**
     * Synchronously write to a device file
     * @group File operations
     * @deprecated
     * @todo [BREAKING] Remove
     */
    write?(file: DeviceFile<TData>, buffer: Uint8Array, offset: number, length: number, position?: number): number;
    /**
     * Synchronously write to a device
     * @group File operations
     * @todo [BREAKING] Rename to `write`
     */
    writeD(device: Device<TData>, buffer: Uint8Array, offset: number): void;
    /**
     * Sync the device
     * @group File operations
     */
    sync?(file: DeviceFile<TData>): void;
    /**
     * Close the device
     * @group File operations
     */
    close?(file: DeviceFile<TData>): void;
}
/**
 * The base class for device files
 * This class only does some simple things:
 * It implements `truncate` using `write` and it has non-device methods throw.
 * It is up to device drivers to implement the rest of the functionality.
 * @category Internals
 * @internal
 */
export declare class DeviceFile<TData = any> extends File {
    fs: DeviceFS;
    readonly device: Device<TData>;
    position: number;
    constructor(fs: DeviceFS, path: string, device: Device<TData>);
    get driver(): DeviceDriver<TData>;
    protected stats: Inode;
    stat(): Promise<Stats>;
    statSync(): Stats;
    readSync(buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    read<TBuffer extends ArrayBufferView>(buffer: TBuffer, offset?: number, length?: number): Promise<FileReadResult<TBuffer>>;
    writeSync(buffer: Uint8Array, offset?: number, length?: number, position?: number): number;
    write(buffer: Uint8Array, offset?: number, length?: number, position?: number): Promise<number>;
    truncate(length: number): Promise<void>;
    truncateSync(length: number): void;
    closeSync(): void;
    close(): Promise<void>;
    syncSync(): void;
    sync(): Promise<void>;
    chown(): Promise<void>;
    chownSync(): void;
    chmod(): Promise<void>;
    chmodSync(): void;
    utimes(): Promise<void>;
    utimesSync(): void;
}
/**
 * A temporary file system that manages and interfaces with devices
 * @category Internals
 */
export declare class DeviceFS extends StoreFS<InMemoryStore> {
    protected readonly devices: Map<string, Device<any>>;
    /**
     * Creates a new device at `path` relative to the `DeviceFS` root.
     * @deprecated
     */
    createDevice<TData = any>(path: string, driver: DeviceDriver<TData>, options?: object): Device<TData | Record<string, never>>;
    protected devicesWithDriver(driver: DeviceDriver<unknown> | string, forceIdentity?: boolean): Device[];
    /**
     * @internal
     */
    _createDevice<TData = any>(driver: DeviceDriver<TData>, options?: object): Device<TData | Record<string, never>>;
    /**
     * Adds default devices
     */
    addDefaults(): void;
    constructor();
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
    stat(path: string): Promise<Stats>;
    statSync(path: string): Stats;
    openFile(path: string, flag: string): Promise<File>;
    openFileSync(path: string, flag: string): File;
    createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    createFileSync(path: string, flag: string, mode: number, options: CreationOptions): File;
    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;
    rmdir(path: string): Promise<void>;
    rmdirSync(path: string): void;
    mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    mkdirSync(path: string, mode: number, options: CreationOptions): void;
    readdir(path: string): Promise<string[]>;
    readdirSync(path: string): string[];
    link(target: string, link: string): Promise<void>;
    linkSync(target: string, link: string): void;
    sync(path: string, data: Uint8Array, stats: Readonly<Stats>): Promise<void>;
    syncSync(path: string, data: Uint8Array, stats: Readonly<Stats>): void;
    read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void>;
    readSync(path: string, buffer: Uint8Array, offset: number, end: number): void;
    write(path: string, data: Uint8Array, offset: number): Promise<void>;
    writeSync(path: string, data: Uint8Array, offset: number): void;
}
/**
 * Simulates the `/dev/null` device.
 * - Reads return 0 bytes (EOF).
 * - Writes discard data, advancing the file position.
 * @category Internals
 * @internal
 */
export declare const nullDevice: DeviceDriver;
/**
 * Simulates the `/dev/zero` device
 * Provides an infinite stream of zeroes when read.
 * Discards any data written to it.
 *
 * - Reads fill the buffer with zeroes.
 * - Writes discard data but update the file position.
 * - Provides basic file metadata, treating it as a character device.
 * @category Internals
 * @internal
 */
export declare const zeroDevice: DeviceDriver;
/**
 * Simulates the `/dev/full` device.
 * - Reads behave like `/dev/zero` (returns zeroes).
 * - Writes always fail with ENOSPC (no space left on device).
 * @category Internals
 * @internal
 */
export declare const fullDevice: DeviceDriver;
/**
 * Simulates the `/dev/random` device.
 * - Reads return random bytes.
 * - Writes discard data, advancing the file position.
 * @category Internals
 * @internal
 */
export declare const randomDevice: DeviceDriver;
/**
 * Shortcuts for importing.
 * @category Internals
 * @internal
 */
export declare const devices: {
    null: DeviceDriver<any>;
    zero: DeviceDriver<any>;
    full: DeviceDriver<any>;
    random: DeviceDriver<any>;
    console: DeviceDriver<{
        output: (text: string, offset: number) => unknown;
    }>;
};
