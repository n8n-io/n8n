# esmoduleserve

This is a shim HTTP server for directly running ES6 modules with
non-precise import targets in your browser (without a bundling step).

It acts as a regular file server for a given directory, but exposes an
extra top-level path, `/_m/`, to serve rewritten modules relative to
that directory. Any file requested through this path will have its
imports (and re-exports) rewritten to point at precise resolved
scripts paths, referenced through `/_m/`.

Resolution is done via the [node
algorithm](https://www.npmjs.com/package/resolve), but letting
`"module"` or `"jsnext"` fields in package.json take precedence over
`"main"`.

If some of the dependencies you load through this don't provide ES
module files, you are likely to find an error about a missing import
on your devtools console.

You can specify module files from parent directories of the served
directory using `/__` to stand in for `/..` in a `/_m/` path. By
default, to avoid accidentally serving things you don't want to
expose, this is only allowed one parent directory deep.

## Usage

You run the server for a given directory...

    esmoduleserve demo/ --port 8080

It will start up an HTTP server on the given port, serving the content
of the `demo` directory statically. If there's a module called
`demo.js` in this directory, you can load it in an HTML file with a
script tag like this:

    <script type="module" src="/_m/demo.js"></script>

The options recognized by the command-line server are:

 * **`--port`** to specify a TCP port to listen on. Defaults to 8080.

 * **`--host`** to specify a hostname to listen on. Defaults to
   `"localhost"`.

 * **`--depth`** to specify how many parent directories should be
   accessible. Defaults to 1.

 * **`--prefix`** to specify an alternative URL prefix for module
  script URLs. Defaults to `"_m"`.

The `moduleserver.js` file exports this functionality as HTTP
middleware. Usage looks something like:

    const {ModuleServer} = require("esmoduleserve/moduleserver")
    const moduleServer = new ModuleServer({root: "/some/path",
                                           maxDepth: 2,
                                           prefix: "_m"})
    
    // In a server function
    if (moduleServer.handleRequest(req, resp)) return

The `handleRequest` method handles only requests whose path starts
with the prefix. It returns true for such requests.

## Source

This code is open-source under an MIT license. If you want to
contribute, create pull requests
[on GitHub](https://github.com/marijnh/esmoduleserve/).
