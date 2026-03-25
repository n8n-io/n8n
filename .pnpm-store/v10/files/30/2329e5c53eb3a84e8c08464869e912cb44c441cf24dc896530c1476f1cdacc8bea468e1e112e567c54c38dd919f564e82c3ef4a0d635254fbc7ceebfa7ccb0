# debuglog - backport of util.debuglog() from node v0.11

To facilitate using the `util.debuglog()` function that will be available when
node v0.12 is released now, this is a copy extracted from the source.

## require('debuglog')

Return `util.debuglog`, if it exists, otherwise it will return an internal copy
of the implementation from node v0.11.

## debuglog(section)

* `section` {String} The section of the program to be debugged
* Returns: {Function} The logging function

This is used to create a function which conditionally writes to stderr
based on the existence of a `NODE_DEBUG` environment variable.  If the
`section` name appears in that environment variable, then the returned
function will be similar to `console.error()`.  If not, then the
returned function is a no-op.

For example:

```javascript
var debuglog = util.debuglog('foo');

var bar = 123;
debuglog('hello from foo [%d]', bar);
```

If this program is run with `NODE_DEBUG=foo` in the environment, then
it will output something like:

    FOO 3245: hello from foo [123]

where `3245` is the process id.  If it is not run with that
environment variable set, then it will not print anything.

You may separate multiple `NODE_DEBUG` environment variables with a
comma.  For example, `NODE_DEBUG=fs,net,tls`.
