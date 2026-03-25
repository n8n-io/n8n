# wa-sqlite example code
These examples are intended to help developers get started with writing extensions,
and to experiment with interesting approaches and techniques. Using them as-is in
production is not prohibited but that isn't their primary purpose.

## VFS examples
### MemoryVFS and MemoryAsyncVFS
These implementations store database pages in memory. The default SQLite VFS already does that, so their value is mainly to provide minimal working examples for writing a VFS or to help debugging investigations by providing a comparative baseline for behavior and/or performance. First-time VFS implementers should probably start by looking at these classes, as well as the [SQLite VFS documentation](https://www.sqlite.org/vfs.html).

### IDBBatchAtomicVFS
This VFS stores database pages in IndexedDB. IndexedDB works on all contexts - Window, Worker, SharedWorker, service worker, extension - which makes IDBBatchAtomicVFS a good general purpose VFS.

SQLite supports a special mode for filesystems that can make "batch atomic" writes, i.e. guaranteeing that an arbitrary set of changes is made either completely or not at all, and IDBBatchAtomicVFS leverages IndexedDB to do this. When this mode can be used, an external journal file is not needed which improves performance. The journal will instead be kept in the page cache, so a requirement for triggering batch atomic mode is that the cache size must be set large enough to hold the journal.

IDBBatchAtomicVFS can trade durability for performance by setting `PRAGMA synchronous=normal`.

Changing the page size after the database is created is not supported (this is a change from pre-1.0).

### IDBMirrorVFS
This VFS keeps all files in memory, persisting database files to IndexedDB. It works on all contexts.

IDBMirrorVFS can trade durability for performance by setting `PRAGMA synchronous=normal`.

Changing the page size after the database is created is not supported.

IDBMirrorVFS has the same characteristics as IDBBatchAtomicVFS in the table below. The differences from IDBBatchAtomicVFS are (1) it is much faster both with and without contention, and (2) it can only use databases that fit in available memory.

### AccessHandlePoolVFS
This is an OPFS VFS that has all synchronous methods, i.e. they don't return Promises. This allows it to be used with a with a synchronous WebAssembly build and that has definite performance advantages.

AccessHandlePoolVFS works by pre-opening a number of access handles and associating them with SQLite open requests as needed. Operation is restricted to a single wa-sqlite instance, so multiple connections are not supported.

The silver lining to not allowing multiple connections is that there is no drawback to using `PRAGMA locking_mode=exclusive`. This in turn allows `PRAGMA journal_mode=wal`, which can significantly reduce write transaction overhead.

This VFS is not filesystem transparent, which means that its database files in OPFS cannot be directly imported and exported.

### OPFSAdaptiveVFS
This VFS is fundamentally a straightforward mapping of OPFS access handles to VFS methods, but adds two different techniques to support multiple connections.

The current OPFS spec allows only one open access handle on a file at a time. Supporting multiple connections to a database thus requires closing the access handle on one connection before opening it on another. This open/close is expensive so OPFSAdaptiveVFS does this lazily, i.e. it only closes the access handle when another connection needs it.

A proposed change to OPFS allows there to be multiple open access handles on a file. OPFSAdaptiveVFS will take advantage of this on browsers that support it, and this will improve performance as well as allow overlapping multiple read transactions with a write transaction.

If multiple open access handles are not supported then only journaling modes "delete" (default), "memory", and "off" are allowed.

### OPFSAnyContextVFS
This VFS uses the slower File and FileSystemWritableFileStream OPFS APIs instead of synchronous access handles. This should allow it to be used on any context, i.e. not just a dedicated Worker.

Read performance should be only somewhat slower, and might even be better than messaging overhead to communicate with a Worker. Write performance, however, will be very bad and will be increasingly worse as the file grows. It is recommended to use it only for read-only or nearly read-only databases.

### OPFSCoopSyncVFS
This VFS is a synchronous OPFS VFS (like AccessHandlePoolVFS) that allows multiple connections and is filesystem transparent (unlike AccessHandlePoolVFS).

OPFSCoopSyncVFS uses an access handle pool for files other than the main database and its journal file. For the shared files, it closes them lazily (like OPFSAdaptiveVFS) to support multiple connections while retaining performance with a single connection.

To keep all the methods synchronous, when asynchronous operations are necessary (e.g. for locking) a method returns an error. The library wrapper API internally handles the error, waits for the asynchronous operation to complete, and then repeats the operation. This is not very efficient, but is only necessary when opening a database or under active multiple connection contention.

Transactions that access more than one main (non-temporary) database are not supported.

### OPFSPermutedVFS
This is a hybrid OPFS/IndexedDB VFS that allows high concurrency - simultaneous access by multiple readers and a single writer. It requires the proposed "readwrite-unsafe" locking mode for OPFS access handles (only on Chromium browsers as of June 2024).

OPFSPermutedVFS is a lot like SQLite WAL except that it writes directly to the database file instead of a separate write-ahead log file, so there may be more than one version of a page in the file and the location of pages is generally not sequential. All the page data is stored in the file and IndexedDB is used to manage the page versions and locations.

OPFSPermutedVFS can trade durability for performance by setting `PRAGMA synchronous=normal`.

Changing the page size after the database is created is not supported. Not filesystem transparent except immediately after VACUUM.

## VFS Comparison

||MemoryVFS|MemoryAsyncVFS|IDBBatchAtomicVFS|OPFSAdaptiveVFS|AccessHandlePoolVFS|OPFSAnyContextVFS|OPFSCoopSyncVFS|OPFSPermutedVFS|
|-|-|-|-|-|-|-|-|-|
|Storage|RAM|RAM|IndexedDB|OPFS|OPFS|OPFS|OPFS|OPFS/IndexedDB|
|Synchronous build|✅|:x:|:x:|:x:|✅|:x:|✅|:x:|
|Asyncify build|✅|✅|✅|✅|✅|✅|✅|
|JSPI build|✅|✅|✅|✅|✅|✅|✅|✅|
|Contexts|All|All|All|Worker|Worker|All|Worker|Worker|
|Multiple connections|:x:|:x:|✅|✅|:x:|✅|✅|✅[^1]|
|Full durability|✅|✅|✅|✅|✅|✅|✅|✅|
|Relaxed durability|:x:|:x:|✅|:x:|:x:|:x:|:x:|✅|
|Filesystem transparency|:x:|:x:|:x:|✅|:x:|✅|✅|:x:[^2]|
|Write-ahead logging|:x:|:x:|:x:|:x:|:x:|:x:|:x:|✅[^3]|
|Multi-database transactions|✅|✅|✅|✅|✅|✅|:x:|✅|
|Change page size|✅|✅|:x:|✅|✅|✅|✅|:x:|
|No COOP/COEP requirements|✅|✅|✅|✅|✅|✅|✅|✅|

[^1]: Requires FileSystemSyncAccessHandle readwrite-unsafe locking mode support.
[^2]: Only filesystem transparent immediately after VACUUM.
[^3]: [Sort of](https://github.com/rhashimoto/wa-sqlite/discussions/152).
