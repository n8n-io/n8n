# istanbul-lib-processinfo

A utility for managing the `processinfo` folder that NYC uses.

This is intended to be used along with [NYC](https://npm.im/nyc), but can also
be used by other tools that wish to consume NYC's processinfo data.

## API

### class ProcessInfo

A representation of information about a single process.

#### constructor(fields)

Pass in fields that will be printed to the processinfo file.  Several defaults
will be provided if not specified.

#### async processInfo.save()

Write this process info to disk.  This works by passing the ProcessInfo object
to JSON.stringify, and writing to `${this.directory}/${this.uuid}.json`.

#### processInfo.saveSync()

The synchronous version of `.save()`.

#### async processInfo.getCoverageMap(nyc)

Get a merged coverage map of the current process, as well as any child
processes.  This should only be called during tree rendering, as it depends on
child nodes being present in the `nodes` array.

The `nyc` instance is required to load the report information and apply
sourcemaps properly.

### processInfo.label

A read-only string for when archy prints the process tree.

### processInfo.nodes

A list of the child nodes used during tree rendering.

### processInfo.directory

If a process will be saved, it must have a `directory` included
in the list of fields.  This property is not saved to the processinfo file.

## class ProcessDB

A utility for interacting with the collection of ProcessInfo files in the
processinfo folder.

### constructor(directory)

Supply the directory where processinfo files are found.  This should be the
full path, something like `${cwd}/.nyc_output/processinfo`.

### processDB.directory

A read-only property showing the directory where this object is working.

### processDB.nodes

A list of child ProcessInfo nodes used in tree printing.

### processDB.label

The string `'nyc'`, used as the default root node in the archy tree rendering.

### async processDB.writeIndex()

Create the `index.json` file in the processinfo folder, which is required for
tree generation and expunging.

WARNING: Index writing is non-atomic, and should not be performed by multiple
processes.

### async processDB.readIndex()

Read and return the contents of the `index.json` file.  If the `index.json` is
not present or not valid, then it will attempt to generate one.

### async processDB.readProcessInfos()

Read all the data files in the processinfo folder, and return an object mapping
the file basename to the resulting object.  Used in tree generation.

### async processDB.renderTree(nyc)

Render the tree as a string using archy, suitable for printing to the terminal.

### async processDB.buildProcessTree()

Build the hierarchical tree of nodes for tree rendering.  Populates the `nodes`
array of this object and all `ProcessInfo` objects in the tree.

### async processDB.getCoverageMap(nyc)

Used in tree rendering, to show the total coverage of all the processinfo files
in the data folder.

### async processDB.spawn(name, file, args, options)

Spawn a child process with a unique name provided by the caller.  This name is
stored as the `externalId` property in the child process's `ProcessInfo` data,
and is tracked in the `externalIds` section of the index.

Note that if the current process is not already wrapped by nyc, then you must
prefix the spawned program with nyc, in order for this to take effect.  For
example, instead of `processDB.spawn('foo', 'node', ['foo.js'])`, you would run
`processDB.spawn('foo', 'nyc', ['node', 'foo.js'])`.

If a process with that name already exists in the index, then it will be
expunged.

Unlike `child_process.spawn` this function returns a Promise which resolves to
the `ChildProcess` object.

WARNING: Calling `expunge` (which this method does) will result in the index
being out of date.  It is the caller's responsibility to call
`processDB.writeIndex()` when all named processes are completed.

### async processDB.expunge(name)

If a process exists in the process info data folder with the specified name
(ie, it had previously been run with `processDB.spawn(name, ...)`) then the
coverage and processinfo files for it and all of its children are removed.

This allows for a test harness to re-run or resume test suites, without
spurious coverage results.

WARNING: Calling `expunge` will result in the index being out of date.  It is
the caller's responsibility to call `processDB.writeIndex()` when all named
processes are completed.

## DATA STRUCTURES and FILES

ProcessInfo files MUST match the following structure:

```
{
  "uuid": "UUID of the process itself",
  "parent": "UUID of the parent process, or null",
  "pid": Number,
  "ppid": Number (pid of parent process),
  "argv": Array<String>,
  "execArgv": Array<String>,
  "cwd": path,
  "time": Number (timestamp in ms),
  "coverageFilename": "Path to NYC coverage info for this process",
  "externalId": "The externally specified name for this process, or null",
}
```

The index file is saved to `${this.directory}/index.json`.  It has
the following structure:

```
{
  "processes": {
    "<uuid>": {
      "parent": "parent uuid, or null",
      "children": ["children", "uuids", "or empty array"],
      "externalId": "externally specified name, if provided"
    },
    ...
  },
  "files": {
    "/path/to/covered/file.js": [
      "<uuids of processes that covered this file>",
      ...
    ],
    ...
  },
  "externalIds": {
    "externally specified name": {
      "root": "<uuid of process run under this name>",
      "children": [
        "<uuids of all descendant processes from this point in the tree>",
        ...
      ]
    },
    ...
  }
}
```
