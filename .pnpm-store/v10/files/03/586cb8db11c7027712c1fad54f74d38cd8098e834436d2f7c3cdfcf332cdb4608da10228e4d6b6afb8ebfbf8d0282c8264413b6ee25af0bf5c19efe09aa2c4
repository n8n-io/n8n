These tests are organized as follows:

* Located in the `hook` directory if they use the `Hook` class.
* Located in the `low-level` directory if they use the "low-level" API,
  `addHook` and `removeHook`.
* Other tests are in other adjacent directories.

The tests can be run individually as Node.js programs with non-zero exit codes
upon failures. They should be run with the following Node.js command-line
options (assuming they're run from the project root):

```
--require ./test/version-check.js
--experimental-loader ./test/generic-loader.mjs
```

The entire test suite can be run with `npm test`.
