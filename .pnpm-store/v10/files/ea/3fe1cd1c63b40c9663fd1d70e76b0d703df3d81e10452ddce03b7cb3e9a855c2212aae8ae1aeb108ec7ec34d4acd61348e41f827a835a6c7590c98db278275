import { type GzipOptions, type ZlibOptions } from 'minizlib';
import { type Stats } from 'node:fs';
import { type ReadEntry } from './read-entry.js';
import { type WarnData } from './warn-method.js';
import { WriteEntry } from './write-entry.js';
/**
 * The options that can be provided to tar commands.
 *
 * Note that some of these are only relevant for certain commands, since
 * they are specific to reading or writing.
 *
 * Aliases are provided in the {@link TarOptionsWithAliases} type.
 */
export interface TarOptions {
    /**
     * Perform all I/O operations synchronously. If the stream is ended
     * immediately, then it will be processed entirely synchronously.
     */
    sync?: boolean;
    /**
     * The tar file to be read and/or written. When this is set, a stream
     * is not returned. Asynchronous commands will return a promise indicating
     * when the operation is completed, and synchronous commands will return
     * immediately.
     */
    file?: string;
    /**
     * Treat warnings as crash-worthy errors. Defaults false.
     */
    strict?: boolean;
    /**
     * The effective current working directory for this tar command
     */
    cwd?: string;
    /**
     * When creating a tar archive, this can be used to compress it as well.
     * Set to `true` to use the default gzip options, or customize them as
     * needed.
     *
     * When reading, if this is unset, then the compression status will be
     * inferred from the archive data. This is generally best, unless you are
     * sure of the compression settings in use to create the archive, and want to
     * fail if the archive doesn't match expectations.
     */
    gzip?: boolean | GzipOptions;
    /**
     * When creating archives, preserve absolute and `..` paths in the archive,
     * rather than sanitizing them under the cwd.
     *
     * When extracting, allow absolute paths, paths containing `..`, and
     * extracting through symbolic links. By default, the root `/` is stripped
     * from absolute paths (eg, turning `/x/y/z` into `x/y/z`), paths containing
     * `..` are not extracted, and any file whose location would be modified by a
     * symbolic link is not extracted.
     *
     * **WARNING** This is almost always unsafe, and must NEVER be used on
     * archives from untrusted sources, such as user input, and every entry must
     * be validated to ensure it is safe to write. Even if the input is not
     * malicious, mistakes can cause a lot of damage!
     */
    preservePaths?: boolean;
    /**
     * When extracting, do not set the `mtime` value for extracted entries to
     * match the `mtime` in the archive.
     *
     * When creating archives, do not store the `mtime` value in the entry. Note
     * that this prevents properly using other mtime-based features (such as
     * `tar.update` or the `newer` option) with the resulting archive.
     */
    noMtime?: boolean;
    /**
     * Set to `true` or an object with settings for `zlib.BrotliCompress()` to
     * create a brotli-compressed archive
     *
     * When extracting, this will cause the archive to be treated as a
     * brotli-compressed file if set to `true` or a ZlibOptions object.
     *
     * If set `false`, then brotli options will not be used.
     *
     * If this, the `gzip`, and `zstd` options are left `undefined`, then tar
     * will attempt to infer the brotli compression status, but can only do so
     * based on the filename. If the filename ends in `.tbr` or `.tar.br`, and
     * the first 512 bytes are not a valid tar header, then brotli decompression
     * will be attempted.
     */
    brotli?: boolean | ZlibOptions;
    /**
     * Set to `true` or an object with settings for `zstd.compress()` to
     * create a zstd-compressed archive
     *
     * When extracting, this will cause the archive to be treated as a
     * zstd-compressed file if set to `true` or a ZlibOptions object.
     *
     * If set `false`, then zstd options will not be used.
     *
     * If this, the `gzip`, and `brotli` options are left `undefined`, then tar
     * will attempt to infer the zstd compression status, but can only do so
     * based on the filename. If the filename ends in `.tzst` or `.tar.zst`, and
     * the first 512 bytes are not a valid tar header, then zstd decompression
     * will be attempted.
     */
    zstd?: boolean | ZlibOptions;
    /**
     * A function that is called with `(path, stat)` when creating an archive, or
     * `(path, entry)` when extracting. Return true to process the file/entry, or
     * false to exclude it.
     */
    filter?: (path: string, entry: Stats | ReadEntry) => boolean;
    /**
     * A function that gets called for any warning encountered.
     *
     * Note: if `strict` is set, then the warning will throw, and this method
     * will not be called.
     */
    onwarn?: (code: string, message: string, data: WarnData) => any;
    /**
     * When extracting, unlink files before creating them. Without this option,
     * tar overwrites existing files, which preserves existing hardlinks. With
     * this option, existing hardlinks will be broken, as will any symlink that
     * would affect the location of an extracted file.
     */
    unlink?: boolean;
    /**
     * When extracting, strip the specified number of path portions from the
     * entry path. For example, with `{strip: 2}`, the entry `a/b/c/d` would be
     * extracted to `{cwd}/c/d`.
     *
     * Any entry whose entire path is stripped will be excluded.
     */
    strip?: number;
    /**
     * When extracting, keep the existing file on disk if it's newer than the
     * file in the archive.
     */
    newer?: boolean;
    /**
     * When extracting, do not overwrite existing files at all.
     */
    keep?: boolean;
    /**
     * When extracting, set the `uid` and `gid` of extracted entries to the `uid`
     * and `gid` fields in the archive. Defaults to true when run as root, and
     * false otherwise.
     *
     * If false, then files and directories will be set with the owner and group
     * of the user running the process. This is similar to `-p` in `tar(1)`, but
     * ACLs and other system-specific data is never unpacked in this
     * implementation, and modes are set by default already.
     */
    preserveOwner?: boolean;
    /**
     * The maximum depth of subfolders to extract into. This defaults to 1024.
     * Anything deeper than the limit will raise a warning and skip the entry.
     * Set to `Infinity` to remove the limitation.
     */
    maxDepth?: number;
    /**
     * When extracting, force all created files and directories, and all
     * implicitly created directories, to be owned by the specified user id,
     * regardless of the `uid` field in the archive.
     *
     * Cannot be used along with `preserveOwner`. Requires also setting the `gid`
     * option.
     */
    uid?: number;
    /**
     * When extracting, force all created files and directories, and all
     * implicitly created directories, to be owned by the specified group id,
     * regardless of the `gid` field in the archive.
     *
     * Cannot be used along with `preserveOwner`. Requires also setting the `uid`
     * option.
     */
    gid?: number;
    /**
     * When extracting, provide a function that takes an `entry` object, and
     * returns a stream, or any falsey value. If a stream is provided, then that
     * stream's data will be written instead of the contents of the archive
     * entry. If a falsey value is provided, then the entry is written to disk as
     * normal.
     *
     * To exclude items from extraction, use the `filter` option.
     *
     * Note that using an asynchronous stream type with the `transform` option
     * will cause undefined behavior in synchronous extractions.
     * [MiniPass](http://npm.im/minipass)-based streams are designed for this use
     * case.
     */
    transform?: (entry: ReadEntry) => any;
    /**
     * Call `chmod()` to ensure that extracted files match the entry's mode
     * field. Without this field set, all mode fields in archive entries are a
     * best effort attempt only.
     *
     * Setting this necessitates a call to the deprecated `process.umask()`
     * method to determine the default umask value, unless a `processUmask`
     * config is provided as well.
     *
     * If not set, tar will attempt to create file system entries with whatever
     * mode is provided, and let the implicit process `umask` apply normally, but
     * if a file already exists to be written to, then its existing mode will not
     * be modified.
     *
     * When setting `chmod: true`, it is highly recommend to set the
     * {@link TarOptions#processUmask} option as well, to avoid the call to the
     * deprecated (and thread-unsafe) `process.umask()` method.
     */
    chmod?: boolean;
    /**
     * When setting the {@link TarOptions#chmod} option to `true`, you may
     * provide a value here to avoid having to call the deprecated and
     * thread-unsafe `process.umask()` method.
     *
     * This has no effect with `chmod` is not set to true, as mode values are not
     * set explicitly anyway. If `chmod` is set to `true`, and a value is not
     * provided here, then `process.umask()` must be called, which will result in
     * deprecation warnings.
     *
     * The most common values for this are `0o22` (resulting in directories
     * created with mode `0o755` and files with `0o644` by default) and `0o2`
     * (resulting in directores created with mode `0o775` and files `0o664`, so
     * they are group-writable).
     */
    processUmask?: number;
    /**
     * When parsing/listing archives, `entry` streams are by default resumed
     * (set into "flowing" mode) immediately after the call to `onReadEntry()`.
     * Set `noResume: true` to suppress this behavior.
     *
     * Note that when this is set, the stream will never complete until the
     * data is consumed somehow.
     *
     * Set automatically in extract operations, since the entry is piped to
     * a file system entry right away. Only relevant when parsing.
     */
    noResume?: boolean;
    /**
     * When creating, updating, or replacing within archives, this method will
     * be called with each WriteEntry that is created.
     */
    onWriteEntry?: (entry: WriteEntry) => any;
    /**
     * When extracting or listing archives, this method will be called with
     * each entry that is not excluded by a `filter`.
     *
     * Important when listing archives synchronously from a file, because there
     * is otherwise no way to interact with the data!
     */
    onReadEntry?: (entry: ReadEntry) => any;
    /**
     * Pack the targets of symbolic links rather than the link itself.
     */
    follow?: boolean;
    /**
     * When creating archives, omit any metadata that is system-specific:
     * `ctime`, `atime`, `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and
     * `nlink`. Note that `mtime` is still included, because this is necessary
     * for other time-based operations such as `tar.update`. Additionally, `mode`
     * is set to a "reasonable default" for mose unix systems, based on an
     * effective `umask` of `0o22`.
     *
     * This also defaults the `portable` option in the gzip configs when creating
     * a compressed archive, in order to produce deterministic archives that are
     * not operating-system specific.
     */
    portable?: boolean;
    /**
     * When creating archives, do not recursively archive the contents of
     * directories. By default, archiving a directory archives all of its
     * contents as well.
     */
    noDirRecurse?: boolean;
    /**
     * Suppress Pax extended headers when creating archives. Note that this means
     * long paths and linkpaths will be truncated, and large or negative numeric
     * values may be interpreted incorrectly.
     */
    noPax?: boolean;
    /**
     * Set to a `Date` object to force a specific `mtime` value for everything
     * written to an archive.
     *
     * This is useful when creating archives that are intended to be
     * deterministic based on their contents, irrespective of the file's last
     * modification time.
     *
     * Overridden by `noMtime`.
     */
    mtime?: Date;
    /**
     * A path portion to prefix onto the entries added to an archive.
     */
    prefix?: string;
    /**
     * The mode to set on any created file archive, defaults to 0o666
     * masked by the process umask, often resulting in 0o644.
     *
     * This does *not* affect the mode fields of individual entries, or the
     * mode status of extracted entries on the filesystem.
     */
    mode?: number;
    /**
     * A cache of mtime values, to avoid having to stat the same file repeatedly.
     *
     * @internal
     */
    mtimeCache?: Map<string, Date>;
    /**
     * maximum buffer size for `fs.read()` operations.
     *
     * @internal
     */
    maxReadSize?: number;
    /**
     * Filter modes of entries being unpacked, like `process.umask()`
     *
     * @internal
     */
    umask?: number;
    /**
     * Default mode for directories. Used for all implicitly created directories,
     * and any directories in the archive that do not have a mode field.
     *
     * @internal
     */
    dmode?: number;
    /**
     * default mode for files
     *
     * @internal
     */
    fmode?: number;
    /**
     * Map that tracks which directories already exist, for extraction
     *
     * @internal
     */
    dirCache?: Map<string, boolean>;
    /**
     * maximum supported size of meta entries. Defaults to 1MB
     *
     * @internal
     */
    maxMetaEntrySize?: number;
    /**
     * A Map object containing the device and inode value for any file whose
     * `nlink` value is greater than 1, to identify hard links when creating
     * archives.
     *
     * @internal
     */
    linkCache?: Map<LinkCacheKey, string>;
    /**
     * A map object containing the results of `fs.readdir()` calls.
     *
     * @internal
     */
    readdirCache?: Map<string, string[]>;
    /**
     * A cache of all `lstat` results, for use in creating archives.
     *
     * @internal
     */
    statCache?: Map<string, Stats>;
    /**
     * Number of concurrent jobs to run when creating archives.
     *
     * Defaults to 4.
     *
     * @internal
     */
    jobs?: number;
    /**
     * Automatically set to true on Windows systems.
     *
     * When extracting, causes behavior where filenames containing `<|>?:`
     * characters are converted to windows-compatible escape sequences in the
     * created filesystem entries.
     *
     * When packing, causes behavior where paths replace `\` with `/`, and
     * filenames containing the windows-compatible escaped forms of `<|>?:` are
     * converted to actual `<|>?:` characters in the archive.
     *
     * @internal
     */
    win32?: boolean;
    /**
     * For `WriteEntry` objects, the absolute path to the entry on the
     * filesystem. By default, this is `resolve(cwd, entry.path)`, but it can be
     * overridden explicitly.
     *
     * @internal
     */
    absolute?: string;
    /**
     * Used with Parser stream interface, to attach and take over when the
     * stream is completely parsed. If this is set, then the prefinish,
     * finish, and end events will not fire, and are the responsibility of
     * the ondone method to emit properly.
     *
     * @internal
     */
    ondone?: () => void;
    /**
     * Mostly for testing, but potentially useful in some cases.
     * Forcibly trigger a chown on every entry, no matter what.
     */
    forceChown?: boolean;
    /**
     * ambiguous deprecated name for {@link onReadEntry}
     *
     * @deprecated
     */
    onentry?: (entry: ReadEntry) => any;
}
export type TarOptionsSync = TarOptions & {
    sync: true;
};
export type TarOptionsAsync = TarOptions & {
    sync?: false;
};
export type TarOptionsFile = TarOptions & {
    file: string;
};
export type TarOptionsNoFile = TarOptions & {
    file?: undefined;
};
export type TarOptionsSyncFile = TarOptionsSync & TarOptionsFile;
export type TarOptionsAsyncFile = TarOptionsAsync & TarOptionsFile;
export type TarOptionsSyncNoFile = TarOptionsSync & TarOptionsNoFile;
export type TarOptionsAsyncNoFile = TarOptionsAsync & TarOptionsNoFile;
export type LinkCacheKey = `${number}:${number}`;
export interface TarOptionsWithAliases extends TarOptions {
    /**
     * The effective current working directory for this tar command
     */
    C?: TarOptions['cwd'];
    /**
     * The tar file to be read and/or written. When this is set, a stream
     * is not returned. Asynchronous commands will return a promise indicating
     * when the operation is completed, and synchronous commands will return
     * immediately.
     */
    f?: TarOptions['file'];
    /**
     * When creating a tar archive, this can be used to compress it as well.
     * Set to `true` to use the default gzip options, or customize them as
     * needed.
     *
     * When reading, if this is unset, then the compression status will be
     * inferred from the archive data. This is generally best, unless you are
     * sure of the compression settings in use to create the archive, and want to
     * fail if the archive doesn't match expectations.
     */
    z?: TarOptions['gzip'];
    /**
     * When creating archives, preserve absolute and `..` paths in the archive,
     * rather than sanitizing them under the cwd.
     *
     * When extracting, allow absolute paths, paths containing `..`, and
     * extracting through symbolic links. By default, the root `/` is stripped
     * from absolute paths (eg, turning `/x/y/z` into `x/y/z`), paths containing
     * `..` are not extracted, and any file whose location would be modified by a
     * symbolic link is not extracted.
     *
     * **WARNING** This is almost always unsafe, and must NEVER be used on
     * archives from untrusted sources, such as user input, and every entry must
     * be validated to ensure it is safe to write. Even if the input is not
     * malicious, mistakes can cause a lot of damage!
     */
    P?: TarOptions['preservePaths'];
    /**
     * When extracting, unlink files before creating them. Without this option,
     * tar overwrites existing files, which preserves existing hardlinks. With
     * this option, existing hardlinks will be broken, as will any symlink that
     * would affect the location of an extracted file.
     */
    U?: TarOptions['unlink'];
    /**
     * When extracting, strip the specified number of path portions from the
     * entry path. For example, with `{strip: 2}`, the entry `a/b/c/d` would be
     * extracted to `{cwd}/c/d`.
     */
    'strip-components'?: TarOptions['strip'];
    /**
     * When extracting, strip the specified number of path portions from the
     * entry path. For example, with `{strip: 2}`, the entry `a/b/c/d` would be
     * extracted to `{cwd}/c/d`.
     */
    stripComponents?: TarOptions['strip'];
    /**
     * When extracting, keep the existing file on disk if it's newer than the
     * file in the archive.
     */
    'keep-newer'?: TarOptions['newer'];
    /**
     * When extracting, keep the existing file on disk if it's newer than the
     * file in the archive.
     */
    keepNewer?: TarOptions['newer'];
    /**
     * When extracting, keep the existing file on disk if it's newer than the
     * file in the archive.
     */
    'keep-newer-files'?: TarOptions['newer'];
    /**
     * When extracting, keep the existing file on disk if it's newer than the
     * file in the archive.
     */
    keepNewerFiles?: TarOptions['newer'];
    /**
     * When extracting, do not overwrite existing files at all.
     */
    k?: TarOptions['keep'];
    /**
     * When extracting, do not overwrite existing files at all.
     */
    'keep-existing'?: TarOptions['keep'];
    /**
     * When extracting, do not overwrite existing files at all.
     */
    keepExisting?: TarOptions['keep'];
    /**
     * When extracting, do not set the `mtime` value for extracted entries to
     * match the `mtime` in the archive.
     *
     * When creating archives, do not store the `mtime` value in the entry. Note
     * that this prevents properly using other mtime-based features (such as
     * `tar.update` or the `newer` option) with the resulting archive.
     */
    m?: TarOptions['noMtime'];
    /**
     * When extracting, do not set the `mtime` value for extracted entries to
     * match the `mtime` in the archive.
     *
     * When creating archives, do not store the `mtime` value in the entry. Note
     * that this prevents properly using other mtime-based features (such as
     * `tar.update` or the `newer` option) with the resulting archive.
     */
    'no-mtime'?: TarOptions['noMtime'];
    /**
     * When extracting, set the `uid` and `gid` of extracted entries to the `uid`
     * and `gid` fields in the archive. Defaults to true when run as root, and
     * false otherwise.
     *
     * If false, then files and directories will be set with the owner and group
     * of the user running the process. This is similar to `-p` in `tar(1)`, but
     * ACLs and other system-specific data is never unpacked in this
     * implementation, and modes are set by default already.
     */
    p?: TarOptions['preserveOwner'];
    /**
     * Pack the targets of symbolic links rather than the link itself.
     */
    L?: TarOptions['follow'];
    /**
     * Pack the targets of symbolic links rather than the link itself.
     */
    h?: TarOptions['follow'];
    /**
     * Deprecated option. Set explicitly false to set `chmod: true`. Ignored
     * if {@link TarOptions#chmod} is set to any boolean value.
     *
     * @deprecated
     */
    noChmod?: boolean;
}
export type TarOptionsWithAliasesSync = TarOptionsWithAliases & {
    sync: true;
};
export type TarOptionsWithAliasesAsync = TarOptionsWithAliases & {
    sync?: false;
};
export type TarOptionsWithAliasesFile = (TarOptionsWithAliases & {
    file: string;
}) | (TarOptionsWithAliases & {
    f: string;
});
export type TarOptionsWithAliasesSyncFile = TarOptionsWithAliasesSync & TarOptionsWithAliasesFile;
export type TarOptionsWithAliasesAsyncFile = TarOptionsWithAliasesAsync & TarOptionsWithAliasesFile;
export type TarOptionsWithAliasesNoFile = TarOptionsWithAliases & {
    f?: undefined;
    file?: undefined;
};
export type TarOptionsWithAliasesSyncNoFile = TarOptionsWithAliasesSync & TarOptionsWithAliasesNoFile;
export type TarOptionsWithAliasesAsyncNoFile = TarOptionsWithAliasesAsync & TarOptionsWithAliasesNoFile;
export declare const isSyncFile: <O extends TarOptions>(o: O) => o is O & TarOptionsSyncFile;
export declare const isAsyncFile: <O extends TarOptions>(o: O) => o is O & TarOptionsAsyncFile;
export declare const isSyncNoFile: <O extends TarOptions>(o: O) => o is O & TarOptionsSyncNoFile;
export declare const isAsyncNoFile: <O extends TarOptions>(o: O) => o is O & TarOptionsAsyncNoFile;
export declare const isSync: <O extends TarOptions>(o: O) => o is O & TarOptionsSync;
export declare const isAsync: <O extends TarOptions>(o: O) => o is O & TarOptionsAsync;
export declare const isFile: <O extends TarOptions>(o: O) => o is O & TarOptionsFile;
export declare const isNoFile: <O extends TarOptions>(o: O) => o is O & TarOptionsNoFile;
export declare const dealias: (opt?: TarOptionsWithAliases) => TarOptions;
//# sourceMappingURL=options.d.ts.map