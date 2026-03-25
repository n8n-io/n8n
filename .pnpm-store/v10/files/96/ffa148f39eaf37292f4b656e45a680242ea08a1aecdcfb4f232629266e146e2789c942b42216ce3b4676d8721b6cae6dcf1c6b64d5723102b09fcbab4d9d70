# hello demo
This is a simpler demo program that may be easier to read for those
who want to see how set up and query the database.

The file hello.js can be loaded either in a Window or Worker context.
By default the Window context will be used. Add the query parameter
"worker" to the URL to use a Worker.

By default the hello.js script loads the Asyncify build and uses
the IDBBatchAtomicVFS filesystem. Modify the imports at the top of
the script to try other combinations. Note that not all combinations
are valid:

* As of May 2024, the JSPI build works only on recent Chromium browsers
behind an experiment flag.
* As of May 2024, OPFSPermutedVFS works only on recent Chromium browsers
as it requires FileSystemSyncAccessHandle "readwrite-unsafe" locking.
* Some VFS classes work only with an asynchronous build (Asyncify or JSPI).
* OPFS VFS classes work only within a Worker.
