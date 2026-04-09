import { Stats } from '../stats.js';
import { type File } from './file.js';
import { Index } from './file_index.js';
import { FileSystem, type CreationOptions, type PureCreationOptions, type UsageInfo } from './filesystem.js';
import { Inode, type InodeLike } from './inode.js';
/**
 * A file system that uses an `Index` for metadata.
 * @category Internals
 * @internal
 */
export declare abstract class IndexFS extends FileSystem {
    readonly index: Index;
    constructor(id: number, name: string, index?: Index);
    usage(): UsageInfo;
    /**
     * @deprecated
     */
    reloadFiles(): never;
    /**
     * @deprecated
     */
    reloadFilesSync(): never;
    /**
     * Finds all the paths in the index that need to be moved for a rename
     */
    private pathsForRename;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
    stat(path: string): Promise<Stats>;
    statSync(path: string): Stats;
    openFile(path: string, flag: string): Promise<File>;
    openFileSync(path: string, flag: string): File;
    protected _remove(path: string, isUnlink: boolean): void;
    protected abstract remove(path: string): Promise<void>;
    protected abstract removeSync(path: string): void;
    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;
    rmdir(path: string): Promise<void>;
    rmdirSync(path: string): void;
    protected create(path: string, options: PureCreationOptions): Inode;
    createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    createFileSync(path: string, flag: string, mode: number, options: CreationOptions): File;
    mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    mkdirSync(path: string, mode: number, options: CreationOptions): void;
    link(target: string, link: string): Promise<void>;
    linkSync(target: string, link: string): void;
    readdir(path: string): Promise<string[]>;
    readdirSync(path: string): string[];
    /**
     * Optional hook for implementations to support updating metadata
     */
    protected syncMetadata?(path: string, metadata: Readonly<InodeLike>): Promise<void>;
    sync(path: string, data?: Uint8Array, stats?: Readonly<InodeLike>): Promise<void>;
    /**
     * Optional hook for implementations to support updating metadata
     */
    protected syncMetadataSync?(path: string, metadata: Readonly<InodeLike>): void;
    syncSync(path: string, data?: Uint8Array, stats?: Readonly<InodeLike>): void;
}
