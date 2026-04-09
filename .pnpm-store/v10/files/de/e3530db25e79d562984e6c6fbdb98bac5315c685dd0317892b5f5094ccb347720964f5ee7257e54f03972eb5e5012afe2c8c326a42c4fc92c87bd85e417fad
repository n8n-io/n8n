# @emnapi/wasi-threads

This package makes [wasi-threads proposal](https://github.com/WebAssembly/wasi-threads) based WASI modules work in Node.js and browser.

## Quick Start

`index.html`

```html
<script src="./node_modules/@tybys/wasm-util/dist/wasm-util.js"></script>
<script src="./node_modules/@emnapi/wasi-threads/dist/wasi-threads.js"></script>
<script src="./index.js"></script>
```

If your application will block browser main thread (for example `pthread_join`), please run it in worker instead.

```html
<script>
  // pthread_join (Atomics.wait) cannot be called in browser main thread
  new Worker('./index.js')
</script>
```

`index.js`

```js
const ENVIRONMENT_IS_NODE =
  typeof process === 'object' && process !== null &&
  typeof process.versions === 'object' && process.versions !== null &&
  typeof process.versions.node === 'string';

(function (main) {
  if (ENVIRONMENT_IS_NODE) {
    main(require)
  } else {
    if (typeof importScripts === 'function') {
      importScripts('./node_modules/@tybys/wasm-util/dist/wasm-util.js')
      importScripts('./node_modules/@emnapi/wasi-threads/dist/wasi-threads.js')
    }
    const nodeWasi = { WASI: globalThis.wasmUtil.WASI }
    const nodeWorkerThreads = {
      Worker: globalThis.Worker
    }
    const _require = function (request) {
      if (request === 'node:wasi' || request === 'wasi') return nodeWasi
      if (request === 'node:worker_threads' || request === 'worker_threads') return nodeWorkerThreads
      if (request === '@emnapi/wasi-threads') return globalThis.wasiThreads
      throw new Error('Can not find module: ' + request)
    }
    main(_require)
  }
})(async function (require) {
  const { WASI } = require('wasi')
  const { Worker } = require('worker_threads')
  const { WASIThreads } = require('@emnapi/wasi-threads')

  const wasi = new WASI({
    version: 'preview1'
  })
  const wasiThreads = new WASIThreads({
    wasi,

    /**
     * avoid Atomics.wait() deadlock during thread creation in browser
     * see https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size
     */
    reuseWorker: ENVIRONMENT_IS_NODE
      ? false
      : {
          size: 4 /** greater than actual needs (2) */,
          strict: true
        },

    /**
     * Synchronous thread creation
     * pthread_create will not return until thread worker actually starts
     */
    waitThreadStart: typeof window === 'undefined' ? 1000 : false,

    onCreateWorker: () => {
      return new Worker('./worker.js', {
        execArgv: ['--experimental-wasi-unstable-preview1']
      })
    }
  })
  const memory = new WebAssembly.Memory({
    initial: 16777216 / 65536,
    maximum: 2147483648 / 65536,
    shared: true
  })
  let input
  const file = 'path/to/your/wasi-module.wasm'
  try {
    input = require('fs').readFileSync(require('path').join(__dirname, file))
  } catch (err) {
    const response = await fetch(file)
    input = await response.arrayBuffer()
  }
  let { module, instance } = await WebAssembly.instantiate(input, {
    env: { memory },
    wasi_snapshot_preview1: wasi.wasiImport,
    ...wasiThreads.getImportObject()
  })

  wasiThreads.setup(instance, module, memory)
  await wasiThreads.preloadWorkers()

  if (typeof instance.exports._start === 'function') {
    return wasi.start(instance)
  } else {
    wasi.initialize(instance)
    // instance.exports.exported_wasm_function()
  }
})
```

`worker.js`

```js
(function (main) {
  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const _require = function (request) {
      return require(request)
    }

    const _init = function () {
      const nodeWorkerThreads = require('worker_threads')
      const parentPort = nodeWorkerThreads.parentPort

      parentPort.on('message', (data) => {
        globalThis.onmessage({ data })
      })

      Object.assign(globalThis, {
        self: globalThis,
        require,
        Worker: nodeWorkerThreads.Worker,
        importScripts: function (f) {
          (0, eval)(require('fs').readFileSync(f, 'utf8') + '//# sourceURL=' + f)
        },
        postMessage: function (msg) {
          parentPort.postMessage(msg)
        }
      })
    }

    main(_require, _init)
  } else {
    importScripts('./node_modules/@tybys/wasm-util/dist/wasm-util.js')
    importScripts('./node_modules/@emnapi/wasi-threads/dist/wasi-threads.js')

    const nodeWasi = { WASI: globalThis.wasmUtil.WASI }
    const _require = function (request) {
      if (request === '@emnapi/wasi-threads') return globalThis.wasiThreads
      if (request === 'node:wasi' || request === 'wasi') return nodeWasi
      throw new Error('Can not find module: ' + request)
    }
    const _init = function () {}
    main(_require, _init)
  }
})(function main (require, init) {
  init()

  const { WASI } = require('wasi')
  const { ThreadMessageHandler, WASIThreads } = require('@emnapi/wasi-threads')

  const handler = new ThreadMessageHandler({
    async onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        version: 'preview1'
      })

      const wasiThreads = new WASIThreads({
        wasi,
        childThread: true
      })

      const originalInstance = await WebAssembly.instantiate(wasmModule, {
        env: {
          memory: wasmMemory,
        },
        wasi_snapshot_preview1: wasi.wasiImport,
        ...wasiThreads.getImportObject()
      })

      // must call `initialize` instead of `start` in child thread
      const instance = wasiThreads.initialize(originalInstance, wasmModule, wasmMemory)

      return { module: wasmModule, instance }
    }
  })

  globalThis.onmessage = function (e) {
    handler.handle(e)
    // handle other messages
  }
})
```
