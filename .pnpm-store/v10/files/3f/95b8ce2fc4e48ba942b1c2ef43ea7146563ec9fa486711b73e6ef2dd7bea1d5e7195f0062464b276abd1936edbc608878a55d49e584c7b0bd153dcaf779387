# Tracing Hooks
This repository contains a ESM loader for injecting tracing channel hooks into Node.js modules. It also has a patch for Module to be used to patch CJS modules.

## Usage

To load esm loader:

```js
// esm-loader.mjs
import { register } from 'node:module';
const instrumentations = [
  {
    channelName: 'channel1',
    module: { name: 'pkg1', verisonRange: '>=1.0.0', filePath: 'index.js' },
    functionQuery: {
      className: 'Class1',
      methodName: 'method1', 
      kind: 'Async'
    }
  },
  {
    channelName: 'channel2',
    module: { name: 'pkg2', verisonRange: '>=1.0.0', filePath: 'index.js' },
    functionQuery: {
      className: 'Class2,
      methodName: 'method2', 
      kind: 'Sync'
    }
  }
]

register('@apm-js-collab/tracing-hooks/hook.mjs', import.meta.url, {
  data: { instrumentations }
});
```

To use the loader, you can run your Node.js application with the `--import` flag:

```bash
node --import esm-loader.mjs your-app.js
```

To load CJS patch:

```js
// cjs-patch.js
const ModulePatch = require('@apm-js-collab/tracing-hooks')
const instrumentations = [
  {
    channelName: 'channel1',
    module: { name: 'pkg1', verisonRange: '>=1.0.0', filePath: 'index.js' },
    functionQuery: {
      className: 'Class1',
      methodName: 'method1', 
      kind: 'Async'
    }
  },
  {
    channelName: 'channel2',
    module: { name: 'pkg2', verisonRange: '>=1.0.0', filePath: 'index.js' },
    functionQuery: {
      className: 'Class2',
      methodName: 'method2', 
      kind: 'Sync'
    }
  }
]


const modulePatch = new ModulePatch({ instrumentations });
modulePatch.patch()
```

To use the CJS patch you can run your Node.js application with the `--require` flag:

```bash
node --require cjs-patch.js your-app.js
```

## Debugging

The [debug module](https://www.npmjs.com/package/debug) is used to provide
insight into the patching process. Set `DEBUG='@apm-js-collab*'` to view these
logs.

Additionally, any patched files can be written out by enabling dump mode. This
is done by setting the environment variable `TRACING_DUMP` to any value. By
default, it will write out file to the system's temporary directory as the
parent directory. The target parent directory can be configured by setting
the `TRACING_DUMP_DIR` environment variable to an absolute path. In either
case, the resolved filename of the module being patched is appended. For
example, if we are patching `lib/index.js` in the `foo` package, and we set
a base directory of `/tmp/dump/`, then the patched code will be written to
`/tmp/dump/foo/lib/index.js`.
