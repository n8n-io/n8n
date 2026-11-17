# The caches of the node verifier

`scripts/verify-compiled-nodes.ts` compares each operation of a compiled node with the v1 node. It keeps three
caches below `node_modules/.cache` of this package. Each key is made of hashes of content. No key has a path of
the machine, a file time or a file size. A cache is thus good on each machine that has the same files and the
same Node.js, and you can copy it.

| Cache | Directory | One entry | A hit skips |
|---|---|---|---|
| Recordings | `v1-recordings` | one case on the v1 node | the run of the v1 node |
| Cases | `verify-results/cases` | one case on the compiled node; one subset check | the run of the compiled node, the cost measurement, the subset check |
| Results | `verify-results/nodes` | all operations of one node type | the process of the node type |

`--no-cache` reads and writes none of them.

## The key of a result (one node type)

A node type takes its entries and its costs from the cache when each part below is equal. If one part changes,
the node type runs.

1. **The verifier and all that it imports** (`verifier`): the content of `scripts/verify-compiled-nodes.ts` and of
   each file that it imports by a relative path, to any depth, when the import runs. These files include
   `verify.ts`, the recorder, `equivalence.ts`, the case generator (`walk.ts`, `variants.ts`), `convert.ts`, the
   converter parts (`src/convert`), the helper prelude (`src/convert/helpers.ts`, `code-native`), the workflow
   compiler, the reference runner, the credential code and `node-identity.ts`.
2. **The node compiler** (`compiler`): the content of each file that the verifier reaches only through
   `src/node-compile/convert.ts` (`specialise.ts`, `routing.ts`, `lower-cost.ts`, `moment.ts`, and others), and
   each file that only an import of types reaches.
3. **The built code of the v1 node** (`v1 node`): the content of each `dist` file that the entry file of the node
   type loads through a `require` or an `import()` with a literal path, to any depth. If a file loads a path that
   has no name, or a path that is not there, the part is the whole `dist` of `n8n-nodes-base`. The start node of
   the recorder (`manualTrigger`) is a part too. The package file, `dist/known` and `dist/credentials` of the node
   package are parts.
4. **The built code below the v1 node** (`v1 packages`): the content of each built file in `dist` of each
   workspace package that `@n8n/workflow-fallback-host` depends on, to any depth (`n8n-core`, `n8n-workflow`,
   `@n8n/node-engine-compatibility`, `@n8n/engine`, `@n8n/expression-runtime`, and others). The lock file
   `pnpm-lock.yaml` stands for the packages that are not in the workspace.
5. **The credential types** (`credentials`): the package file, `dist/known` and `dist/credentials` of each node
   package.
6. **Node.js** (`node`): `process.version`, the platform, and `identityKey()` of `node-identity.ts` (ICU, CLDR,
   time zone rules, Unicode, V8, the URL parser, the zone of the process and the zone of the task runner), and
   the locale of the process.
7. **The environment** (`environment`): each variable with a name that starts with `N8N_`, `WF_`, `NODE_` or
   `LC_`, and `TZ`, `LANG` and `LANGUAGE`. `WF_TARGET_RUNNER_ZONE` is one of them.
8. **The signing key of the test credentials** (`signing key`), and the flag `--dist` (`dist`).
9. **The files that the check read**: the content of each source file that the node compiler read for this node
   type (the node, its imports, the credential files, the package sources), each path that the compiler asked for
   and that was not there, and the file that has the class of each version of the node. The cache keeps this
   list with the result and compares it before a hit.

The lists `verified.generated.ts` and `cost.generated.ts` are no part: the verifier writes them and does not read
them for a check. The flags `--detail`, `--all-blockers`, `--examples`, `--cost`, `--check-cost` and `--weights`
are no part: a node type gives the same result with each of them, and the main process makes the summary. A run
of one pattern and a run of all node types thus use the same entries.

A result that has a time limit of a case (`no result after … ms`) is not kept.

## The key of a case (one case on the compiled node)

The key has parts 1 and 3 to 8 above, the case (type, version, parameters, items, credential, responses,
settings), the form of the check (cache, pairing, one call for each item, paired items) and the hash of the
compiled output of the instance: the source text and each other member of the result of `compileNodeInstance`.
Part 2 and part 9 are no part: they change a case only through the compiled output. Thus, after a change in the
node compiler or in the source of a node, the verifier compiles each instance again and runs only the cases
whose compiled output changed. A subset check has the same parts and the compiled source as its key.

`verify-cache.test.ts` proves, for each part, that a change gives a new key, and that a change in a part that
is not in a key keeps it. It also proves that the verifier reaches the node compiler only through names of
`convert.ts` that are known: if a file imports a new name, the test fails and a person must check the rule
above.

## The key of a recording (one case on the v1 node)

The key has the case, the form of a recording, parts 3 and 4 above for each node type of the case, Node.js
(`process.version`, the platform, ICU, CLDR, time zone rules, Unicode, V8, the URL parser, `TZ`, the zone and the
locale), and the code of the recorder that the case runs. That code is each top-level declaration that
`recordV1` needs, in `v1-recorder.ts` and in the files that it imports, without comments and types. The cache
functions are no part. `recordInEngine` and what only it needs are a part only for a case with settings or
sub-nodes. `installFakeFetch` is a part only for a case with sub-nodes. `recording-key.test.ts` proves each of
these statements.

## Use

```bash
TZ=UTC WF_TARGET_RUNNER_ZONE=UTC VERIFY_PARALLEL=6 node scripts/verify-compiled-nodes.ts --status /tmp/verify.json
TZ=UTC WF_TARGET_RUNNER_ZONE=UTC node scripts/verify-compiled-nodes.ts --write '^(slack|hubspot)$'
```

- The standard error output has a line when a node type starts and a line when it ends: operations, verified
  operations, operations lost against the committed list, the time, `cache hit` or `run`, and the totals.
- `--status <file>` writes the progress as JSON after each event and each 15 seconds.
- A run of all node types writes the two lists. A run of a pattern writes them only with `--write`: it replaces
  the entries and the costs of the node types of the pattern, and keeps the others.
- A node type with more than 40 operations (`VERIFY_PART_OPERATIONS`) runs in parts, at most `VERIFY_PARALLEL`
  of them. Each part is a process with a range of the operations and its own time limit. The main process
  applies the entries of the parts in the order of the operations, so the result is the result of one process.
- A node type that gives no result in `VERIFY_NODE_TIMEOUT_MS` (45 minutes for each part), or that stops, is
  `stale`: the summary names it, its entries in the committed list stay, and the exit code is 2. Run it again
  with a longer limit: the cases that it completed are in the cache.
- To use the caches on another machine, copy `node_modules/.cache/v1-recordings` and
  `node_modules/.cache/verify-results` of this package. The other machine must have the same commit, the same
  build of the packages, the same Node.js and the same `TZ` and `WF_TARGET_RUNNER_ZONE`.
