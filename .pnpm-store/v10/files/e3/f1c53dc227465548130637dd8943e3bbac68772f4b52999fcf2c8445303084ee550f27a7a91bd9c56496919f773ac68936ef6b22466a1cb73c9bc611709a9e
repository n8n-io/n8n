### A `FormData` polyfill for the browser ...and a module for NodeJS (`New!`)

```bash
npm install formdata-polyfill
```

The browser polyfill will likely have done its part already, and i hope you stop supporting old browsers c",)<br>
But NodeJS still laks a proper FormData<br>The good old form-data package is a very old and isn't spec compatible and dose some abnormal stuff to construct and read FormData instances that other http libraries are not happy about when it comes to follow the spec.

### The NodeJS / ESM version
- The modular (~2.3 KiB minified uncompressed) version of this package is independent of any browser stuff and don't patch anything
- It's as pure/spec compatible as it possible gets the test are run by WPT.
- It's compatible with [node-fetch](https://github.com/node-fetch/node-fetch).
- It have higher platform dependencies as it uses classes, symbols, ESM & private fields
- Only dependency it has is [fetch-blob](https://github.com/node-fetch/fetch-blob)

```js
// Node example
import fetch from 'node-fetch'
import File from 'fetch-blob/file.js'
import { fileFromSync } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'

const file = fileFromSync('./README.md')
const fd = new FormData()

fd.append('file-upload', new File(['abc'], 'hello-world.txt'))
fd.append('file-upload', file)

// it's also possible to append file/blob look-a-like items
// if you have streams coming from other destinations
fd.append('file-upload', {
  size: 123,
  type: '',
  name: 'cat-video.mp4',
  stream() { return stream },
  [Symbol.toStringTag]: 'File'
})

fetch('https://httpbin.org/post', { method: 'POST', body: fd })
```

----

It also comes with way to convert FormData into Blobs - it's not something that every developer should have to deal with.
It's mainly for [node-fetch](https://github.com/node-fetch/node-fetch) and other http library to ease the process of serializing a FormData into a blob and just wish to deal with Blobs instead (Both Deno and Undici adapted a version of this [formDataToBlob](https://github.com/jimmywarting/FormData/blob/5ddea9e0de2fc5e246ab1b2f9d404dee0c319c02/formdata-to-blob.js) to the core and passes all WPT tests run by the browser itself)
```js
import { Readable } from 'node:stream'
import { FormData, formDataToBlob } from 'formdata-polyfill/esm.min.js'

const blob = formDataToBlob(new FormData())
fetch('https://httpbin.org/post', { method: 'POST', body: blob })

// node built in http and other similar http library have to do:
const stream = Readable.from(blob.stream())
const req = http.request('http://httpbin.org/post', {
  method: 'post',
  headers: {
    'Content-Length': blob.size,
    'Content-Type': blob.type
  }
})
stream.pipe(req)
```

PS: blob & file that are appended to the FormData will not be read until any of the serialized blob read-methods gets called
...so uploading very large files is no biggie

### Browser polyfill

usage:

```js
import 'formdata-polyfill' // that's it
```

The browser polyfill conditionally replaces the native implementation rather than fixing the missing functions,
since otherwise there is no way to get or delete existing values in the FormData object.
Therefore this also patches `XMLHttpRequest.prototype.send` and `fetch` to send the `FormData` as a blob,
and `navigator.sendBeacon` to send native `FormData`.

I was unable to patch the Response/Request constructor
so if you are constructing them with FormData then you need to call `fd._blob()` manually.

```js
new Request(url, {
  method: 'post',
  body: fd._blob ? fd._blob() : fd
})
```

Dependencies
---

If you need to support IE <= 9 then I recommend you to include eligrey's [blob.js]
(which i hope you don't - since IE is now dead)

<details>
    <summary>Updating from 2.x to 3.x</summary>

Previously you had to import the polyfill and use that,
since it didn't replace the global (existing) FormData implementation.
But now it transparently calls `_blob()` for you when you are sending something with fetch or XHR,
by way of monkey-patching the `XMLHttpRequest.prototype.send` and `fetch` functions.

So you maybe had something like this:

```javascript
var FormData = require('formdata-polyfill')
var fd = new FormData(form)
xhr.send(fd._blob())
```

There is no longer anything exported from the module
(though you of course still need to import it to install the polyfill),
so you can now use the FormData object as normal:

```javascript
require('formdata-polyfill')
var fd = new FormData(form)
xhr.send(fd)
```

</details>



Native Browser compatibility (as of 2021-05-08)
---
Based on this you can decide for yourself if you need this polyfill.

[![screenshot](https://user-images.githubusercontent.com/1148376/117550329-0993aa80-b040-11eb-976c-14e31f1a3ba4.png)](https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility)



This normalizes support for the FormData API:

 - `append` with filename
 - `delete()`, `get()`, `getAll()`, `has()`, `set()`
 - `entries()`, `keys()`, `values()`, and support for `for...of`
 - Available in web workers (just include the polyfill)

  [npm-image]: https://img.shields.io/npm/v/formdata-polyfill.svg
  [npm-url]: https://www.npmjs.com/package/formdata-polyfill
  [blob.js]: https://github.com/eligrey/Blob.js
