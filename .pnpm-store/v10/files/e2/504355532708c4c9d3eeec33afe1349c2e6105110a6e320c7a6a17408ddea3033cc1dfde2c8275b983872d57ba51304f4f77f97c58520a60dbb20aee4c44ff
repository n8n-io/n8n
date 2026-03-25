The `dist-raw` directory contains JS sources that are distributed verbatim, not compiled nor typechecked via TS.

To implement ESM support, we unfortunately must duplicate some of node's built-in functionality that is not
exposed via an API.  We have copy-pasted the necessary code from https://github.com/nodejs/node/tree/master/lib
then modified it to suite our needs.

Formatting may be intentionally bad to keep the diff as small as possible, to make it easier to merge
upstream changes and understand our modifications.  For example, when we need to wrap node's source code
in a factory function, we will not indent the function body, to avoid whitespace changes in the diff.

One obvious problem with this approach: the code has been pulled from one version of node, whereas users of ts-node
run multiple versions of node.
Users running node 12 may see that ts-node behaves like node 14, for example.

## `raw` directory

Within the `raw` directory, we keep unmodified copies of the node source files.  This allows us to use diffing tools to
compare files in `raw` to those in `dist-raw`, which will highlight all of the changes we have made.  Hopefully, these
changes are as minimal as possible.

## Naming convention

Not used consistently, but the idea is:

`node-<directory>(...-<directory>)-<filename>.js`

`node-internal-errors.js` -> `github.com/nodejs/node/blob/TAG/lib/internal/errors.js`

So, take the path within node's `lib/` directory, and replace slashes with hyphens.

In the `raw` directory, files are suffixed with the version number or revision from which
they were downloaded.

If they have a `stripped` suffix, this means they have large chunks of code deleted, but no other modifications.
This is useful when diffing.  Sometimes our `dist-raw` files only have a small part of a much larger node source file.
It is easier to diff `raw/*-stripped.js` against `dist-raw/*.js`.
