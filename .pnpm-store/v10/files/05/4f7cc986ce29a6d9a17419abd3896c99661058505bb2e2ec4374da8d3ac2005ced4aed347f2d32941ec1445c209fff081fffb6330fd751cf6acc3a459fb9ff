# @tybys/wasm-util

WebAssembly related utils for browser environment

**The output code is ES2019**

## Features

All example code below need to be bundled by ES module bundlers like `webpack` / `rollup`, or specify import map in browser native ES module runtime.

### WASI polyfill for browser

The API is similar to the `require('wasi').WASI` in Node.js.

You can use `memfs-browser` to provide filesystem capability.

- Example: [https://github.com/toyobayashi/wasi-wabt](https://github.com/toyobayashi/wasi-wabt)
- Demo: [https://toyobayashi.github.io/wasi-wabt/](https://toyobayashi.github.io/wasi-wabt/)

```js
import { load, WASI } from '@tybys/wasm-util'
import { Volume, createFsFromVolume } from 'memfs-browser'

const fs = createFsFromVolume(Volume.fromJSON({
  '/home/wasi': null
}))

const wasi = new WASI({
  args: ['chrome', 'file.wasm'],
  env: {
    NODE_ENV: 'development',
    WASI_SDK_PATH: '/opt/wasi-sdk'
  },
  preopens: {
    '/': '/'
  },
  fs,

  // redirect stdout / stderr

  // print (text) { console.log(text) },
  // printErr (text) { console.error(text) }
})

const imports = {
  wasi_snapshot_preview1: wasi.wasiImport
}

const { module, instance } = await load('/path/to/file.wasm', imports)
wasi.start(instance)
// wasi.initialize(instance)
```

Implemented syscalls: [wasi_snapshot_preview1](#wasi_snapshot_preview1)

### `load` / `loadSync`

`loadSync` has 4KB wasm size limit in browser.

```js
// bundler
import { load, loadSync } from '@tybys/wasm-util'

const imports = { /* ... */ }

// using path
const { module, instance } = await load('/path/to/file.wasm', imports)
const { module, instance } = loadSync('/path/to/file.wasm', imports)

// using URL
const { module, instance } = await load(new URL('./file.wasm', import.meta.url), imports)
const { module, instance } = loadSync(new URL('./file.wasm', import.meta.url), imports)

// using Uint8Array
const buffer = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d,
  0x01, 0x00, 0x00, 0x00
])
const { module, instance } = await load(buffer, imports)
const { module, instance } = loadSync(buffer, imports)

// auto asyncify
const {
  module,
  instance: asyncifiedInstance
} = await load(buffer, imports, { /* asyncify options */})
asyncifiedInstance.exports.fn() // => return Promise
```

### Extend Memory instance

```js
import { Memory, extendMemory } from '@tybys/wasm-util'

const memory = new WebAssembly.Memory({ initial: 256 })
// const memory = instance.exports.memory

extendMemory(memory)
console.log(memory instanceof Memory)
console.log(memory instanceof WebAssembly.Memory)
// expose memory view getters like Emscripten
const { HEAPU8, HEAPU32, view } = memory
```

### Asyncify wrap

Build the C code using `clang`, `wasm-ld` and `wasm-opt`

```c
void async_sleep(int ms);

int main() {
  async_sleep(200);
  return 0;
}
```

```js
import { Asyncify } from '@tybys/wasm-util'

const asyncify = new Asyncify()

const imports = {
  env: {
    async_sleep: asyncify.wrapImportFunction(function (ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    })
  }
}

// async_sleep(200)
const bytes = await (await fetch('/asyncfied_by_wasm-opt.wasm')).arrayBuffer()
const { instance } = await WebAssembly.instantiate(bytes, imports)
const asyncifiedInstance = asyncify.init(instance.exports.memory, instance, {
  wrapExports: ['_start']
})

const p = asyncifedInstance._start()
console.log(typeof p.then === 'function')
const now = Date.now()
await p
console.log(Date.now() - now >= 200)
```

### wasi_snapshot_preview1

- [x] args_get
- [x] args_sizes_get
- [x] environ_get
- [x] environ_sizes_get
- [x] clock_res_get
- [x] clock_time_get
- [ ] ~~fd_advise~~
- [x] fd_allocate
- [x] fd_close
- [x] fd_datasync
- [x] fd_fdstat_get
- [ ] ~~fd_fdstat_set_flags~~
- [x] fd_fdstat_set_rights
- [x] fd_filestat_get
- [x] fd_filestat_set_size
- [x] fd_filestat_set_times
- [x] fd_pread
- [x] fd_prestat_get
- [x] fd_prestat_dir_name
- [x] fd_pwrite
- [x] fd_read
- [x] fd_readdir
- [x] fd_renumber
- [x] fd_seek
- [x] fd_sync
- [x] fd_tell
- [x] fd_write
- [x] path_create_directory
- [x] path_filestat_get
- [x] path_filestat_set_times
- [x] path_link
- [x] path_open
- [x] path_readlink
- [x] path_remove_directory
- [x] path_rename
- [x] path_symlink
- [x] path_unlink_file
- [x] poll_oneoff (timer only)
- [x] proc_exit
- [ ] ~~proc_raise~~
- [x] sched_yield
- [x] random_get
- [ ] ~~sock_recv~~
- [ ] ~~sock_send~~
- [ ] ~~sock_shutdown~~
