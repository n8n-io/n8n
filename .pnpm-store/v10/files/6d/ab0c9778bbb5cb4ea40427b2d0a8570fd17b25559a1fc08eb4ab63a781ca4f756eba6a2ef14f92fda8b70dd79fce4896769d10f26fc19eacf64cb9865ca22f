# Readdir-Glob
![Build Status](https://github.com/Yqnn/node-readdir-glob/actions/workflows/test.yml/badge.svg?branch=master) [![Coverage Status](https://coveralls.io/repos/github/Yqnn/node-readdir-glob/badge.svg?branch=master)](https://coveralls.io/github/Yqnn/node-readdir-glob?branch=master)

Recursive version of fs.readdir wih stream API and glob filtering.
Uses the `minimatch` library to do its matching.

Requires Node.js 10.0 or later.

## Performances

Compared to `glob`, `readdir-glob` is memory efficient: no matter the file system size, or the number of returned files, the memory usage is constant.

The CPU cost is proportional to the number of files in `root` folder, minus the number files in `options.skip` folders.

**Advice**: For better performances use `options.skip` to restrict the search as much as possible.

## Usage

Install with npm
```
npm i readdir-glob
```

```javascript
const readdirGlob = require('readdir-glob');
const globber = readdirGlob('.', {pattern: '**/*.js'});
globber.on('match', match => {
    // m.relative: relative path of the matched file
    // m.absolute: absolute path of the matched file
    // m.stat: stat of the matched file (only if stat:true option is used)
});
globber.on('error', err => {
    console.error('fatal error', err);
});
globber.on('end', (m) => {
    console.log('done');
});
```

## readdirGlob(root, [options])

* `root` `{String}` Path to be read recursively, *default*: `'.'`
* `options` `{Object}` Options, *default*: `{}`

Returns a EventEmitter reading given root recursively.

### Properties

* `options`: The options object passed in.
* `paused`: Boolean which is set to true when calling `pause()`.
* `aborted` Boolean which is set to true when calling `abort()`.  There is no way at this time to continue a glob search after aborting.

### Events

* `match`: Every time a match is found, this is emitted with the specific thing that matched.
* `end`: When the matching is finished, this is emitted with all the matches found. 
* `error`: Emitted when an unexpected error is encountered.

### Methods

* `pause()`: Temporarily stop the search
* `resume()`: Resume the search
* `abort()`: Stop the search forever

### Options

* `pattern`: Glob pattern or Array of Glob patterns to match the found files with. A file has to match at least one of the provided patterns to be returned.
* `ignore`: Glob pattern or Array of Glob patterns to exclude matches. If a file or a folder matches at least one of the provided patterns, it's not returned. It doesn't prevent files from folder content to be returned. Note: `ignore` patterns are *always* in `dot:true` mode.
* `skip`: Glob pattern or Array of Glob patterns to exclude folders. If a folder matches one of the provided patterns, it's not returned, and it's not explored: this prevents any of its children to be returned. Note: `skip` patterns are *always* in `dot:true` mode.
* `mark`: Add a `/` character to directory matches.
* `stat`: Set to true to stat *all* results.  This reduces performance.
* `silent`: When an unusual error is encountered when attempting to read a directory, a warning will be printed to stderr.  Set the `silent` option to true to suppress these warnings.
* `nodir`: Do not match directories, only files.
* `follow`: Follow symlinked directories. Note that requires to stat *all* results, and so reduces performance.

The following options apply only if `pattern` option is set, and are forwarded to `minimatch`:
* `dot`: Allow `pattern` to match filenames starting with a period, even if the pattern does not explicitly have a period in that spot.
* `noglobstar`: Disable `**` matching against multiple folder names.
* `nocase`: Perform a case-insensitive match.  Note: on case-insensitive filesystems, non-magic patterns will match by default, since `stat` and `readdir` will not raise errors.
* `matchBase`: Perform a basename-only match if the pattern does not  contain any slash characters.  That is, `*.js` would be treated as equivalent to `**/*.js`, matching all js files in all directories.


## References

Unit-test set is based on [node-glob](https://www.npmjs.com/package/glob) tests.
