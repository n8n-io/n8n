Change Log
====================================================================================================
All notable changes will be documented in this file.
EZ Spawn adheres to [Semantic Versioning](http://semver.org/).



[v3.0.0](https://github.com/JS-DevTools/ez-spawn/tree/v3.0.0) (2020-02-19)
----------------------------------------------------------------------------------------------------

- Moved EZ Spawn to the [@JSDevTools scope](https://www.npmjs.com/org/jsdevtools) on NPM

- The "ez-spawn" NPM package is now just a wrapper around the scoped "@jsdevtools/ez-spawn" package

[Full Changelog](https://github.com/JS-DevTools/ez-spawn/compare/v5.1.1...v3.0.0)



[v2.1.0](https://github.com/JS-DevTools/ez-spawn/tree/v2.1.0) (2018-12-21)
----------------------------------------------------------------------------------------------------

- If the process exits with a non-zero exit code, the error message now always includes the command, args, and exit code. If there was any stderr output, then that is appended to the error message as well.

[Full Changelog](https://github.com/JS-DevTools/ez-spawn/compare/v2.0.0...v2.1.0)



[v2.0.0](https://github.com/JS-DevTools/ez-spawn/tree/v2.0.0) (2018-12-16)
----------------------------------------------------------------------------------------------------

### Breaking Changes

- The [`encoding` option](https://github.com/JS-DevTools/ez-spawn/tree/8e62bedf1a8fb226b05f46de39ae4f9a9664ad21#options-object) now defaults to `"utf8"`, since most CLIs output UTF-8 text.  You can set the `encoding` option to a different encoding, or to `"buffer"` to get raw binary output.

- Errors (including non-zero exit codes) are now thrown, rather than returning an object with an `error` property.  See [Error Handling](https://github.com/JS-DevTools/ez-spawn/tree/8e62bedf1a8fb226b05f46de39ae4f9a9664ad21#error-handling) for more details.

### New Features

- EZ-Spawn now includes [TypeScript definitions](https://github.com/JS-DevTools/ez-spawn/blob/8e62bedf1a8fb226b05f46de39ae4f9a9664ad21/lib/index.d.ts).

- All releases are now [automatically tested](https://travis-ci.com/JS-DevTools/ez-spawn) on all active LTS versions of Node on Windows, Mac, and Linux.

[Full Changelog](https://github.com/JS-DevTools/ez-spawn/compare/v1.0.0...v2.0.0)
