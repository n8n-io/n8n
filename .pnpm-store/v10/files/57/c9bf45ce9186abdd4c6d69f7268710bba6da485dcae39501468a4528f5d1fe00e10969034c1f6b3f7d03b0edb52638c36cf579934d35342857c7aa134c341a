const { MessageChannel } = require('worker_threads')

if (!globalThis.DOMException) {
  const port = new MessageChannel().port1
  const ab = new ArrayBuffer()
  try { port.postMessage(ab, [ab, ab]) }
  catch (err) { globalThis.DOMException = err.constructor }
}
