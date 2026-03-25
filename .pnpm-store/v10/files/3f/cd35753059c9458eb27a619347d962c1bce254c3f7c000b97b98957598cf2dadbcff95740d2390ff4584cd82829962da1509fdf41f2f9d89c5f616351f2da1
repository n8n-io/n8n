# readdir-scoped-modules

Like `fs.readdir` but handling `@org/module` dirs as if they were
a single entry.

Used by npm.

## USAGE

```javascript
var readdir = require('readdir-scoped-modules')

readdir('node_modules', function (er, entries) {
  // entries will be something like
  // ['a', '@org/foo', '@org/bar']
})
```
