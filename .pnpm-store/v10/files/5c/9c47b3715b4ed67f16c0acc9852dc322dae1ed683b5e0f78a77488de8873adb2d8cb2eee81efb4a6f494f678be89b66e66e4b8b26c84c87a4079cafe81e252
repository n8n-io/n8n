# DOMException
An implementation of the DOMException class from NodeJS

NodeJS has DOMException built in, but it's not globally available, and you can't require/import it from somewhere.

This package exposes the [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) class that comes from NodeJS itself. (including all of the legacy codes)

<sub>(plz don't depend on this package in any other environment other than node >=10.5)</sub>

```js
import DOMException from 'node-domexception'
import { MessageChannel } from 'worker_threads'

async function hello() {
  const port = new MessageChannel().port1
  const ab = new ArrayBuffer()
  port.postMessage(ab, [ab, ab])
}

hello().catch(err => {
  console.assert(err.name === 'DataCloneError')
  console.assert(err.code === 25)
  console.assert(err instanceof DOMException)
})

const e1 = new DOMException('Something went wrong', 'BadThingsError')
console.assert(e1.name === 'BadThingsError')
console.assert(e1.code === 0)

const e2 = new DOMException('Another exciting error message', 'NoModificationAllowedError')
console.assert(e2.name === 'NoModificationAllowedError')
console.assert(e2.code === 7)

console.assert(DOMException.INUSE_ATTRIBUTE_ERR === 10)
```

# Background

The only possible way is to use some web-ish tools that have been introduced into NodeJS that throws a DOMException and catch the constructor. This is exactly what this package dose for you and exposes it.<br>
This way you will have the same class that NodeJS has and you can check if the error is a instance of DOMException.<br>
The instanceof check would not have worked with a custom class such as the DOMException provided by domenic which also is much larger in size since it has to re-construct the hole class from the ground up.

The DOMException is used in many places such as the Fetch API, File & Blobs, PostMessaging and more. <br>
Why they decided to call it **DOM**, I don't know

Please consider sponsoring if you find this helpful
