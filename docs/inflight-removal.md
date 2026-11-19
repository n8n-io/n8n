# Removal of inflight

This reference records the dependency changes for DEVP-147.
The estimates include focused compatibility checks for each group.

| Dependency path | Change | Compatibility work | Estimated effort |
| --- | --- | --- | --- |
| CLI → Redocly → glob 7 | Update Redocly CLI to 2.76 | Check the existing `openapi bundle` command and generated specification. | 1–2 hours |
| CLI → shelljs → glob 7 | Update shelljs to 0.10 | Run the email, OpenAPI, and asset builds with the existing shell API. | 1 hour |
| SQL Agent → temp → rimraf 2 → glob 7 | Replace temp with the shared tmp-promise dependency. | Reserve a unique SQLite file. Close the temporary descriptor. Keep exit cleanup. Test binary input and database access. | 2–3 hours |
| SQLite → optional node-gyp 8 → glob 7 | Override only SQLite 5.1.7's node-gyp with 12.4. | Keep SQLite 5.1.7 and its prebuilt binaries. Test the node-gyp CLI source-build fallback. | 2–3 hours |
| cURL converter → yamljs → glob 7 | Override only YAMLJS 0.3.0's glob with 10.5. | Both YAMLJS CLI commands use only `glob.sync()`. Check recursive conversion and cURL import. Keep the parser API. | 1–2 hours |
| Vue test tools and MJML → js-beautify → glob 8 | Override js-beautify versions below 1.15.4 with 1.15.4. | Stay on js-beautify 1.x. Check email compilation and Vue rendering. | 1 hour |
| CodeMirror buildhelper and TypeORM → Mocha → glob 8 | Update Mocha to 11.8. Override the old buildhelper's Mocha dependency. | Keep the buildhelper build API. Run grammar tests with the new runner. | 1–2 hours |
| Madge → dependency-tree → module-lookup-amd → glob 7 | Update module-lookup-amd 9.0.5 to 9.1.3 through an override. | Stay on major 9. Run Madge against the builder entry point. | 1 hour |
| node-dev → replace-in-file → glob 7 | Update replace-in-file to 8.x. | Keep node-dev on master. Check template creation with the existing API on the supported Node.js version. | 1 hour |

The existing node-dev removal on `3.x` remains separate from this compatible master change.
There is no blanket glob override. Unrelated glob versions do not need to change.
The obsolete glob 7 pin is removed.

`pnpm check:dependencies` checks every tracked pnpm lockfile for the resolved package name.
The PR format job runs this check for PRs and merge groups.
The check includes development and optional dependencies.
It rejects aliases that resolve to inflight. It allows the separate package promise-inflight.
