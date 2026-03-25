# DOMException
An implementation of the DOMException class from NodeJS

This package exposes the [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) class that comes from NodeJS itself. (including all of the deprecated legacy codes)
NodeJS has it built in, but it's not globally available, and you can't require/import it from somewhere.

The only possible way is to use some web-ish tools that have been introduced into NodeJS that throws an error and catch the constructor.
This way you will have the same class that NodeJS has and you can check if the error is a instance of DOMException.
The instanceof check would not have worked with a custom class such as the DOMException provided by domenic which also is much larger in size since it has to re-construct the hole class from the ground up.

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
