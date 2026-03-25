Helper scripts to build and test CodeMirror packages.

The exports (`build` and `watch`) from this package build packages
that conform to the conventions of the various `@codemirror` packages.
They do the following:

 - Mangle the code to convert our `///` doc comments to `/** */`
   comments, so that TypeScript will not strip them.

 - Run the TypeScript compiler, catching the output in memory.

 - Run rollup and rollup-plugin-dts on the result to emit the CommonJS
   and ES modules, as well as a bundled `.d.ts` file, to `dist/`.

There's also a `cm-buildhelper` binary which builds the main file
specified as its first argument. This is used by the individual
packages in their `prepare` scripts.

---

**NOTE**: This tool will add a `/*@__PURE__*/` annotation in front of
_every_ top-level function call, to allow tree-shaking of things like
`Facet.define(...)`. This is likely to break some styles of code
(which, say, uses a side-effecting helper function to build up some
top-level data structure), but I wasn't able to find another approach
for working with the crude current state of JS dead-code detection
tools.

---

The `cm-runtests` binary helps run tests. Given a list of directories,
it'll run `./test/test-*.js` as plain mocha tests, and
`./test/webtest-*.js` using a Selenium headless browser.

You can also pass it a `--server` argument to start a test server that
you can interact with in your browser.

In web tests, you can import `tempView(doc, extensions?)` from
`"@codemirror/buildhelper/lib/tempview"` to quickly create a temporary
hidden editor.
