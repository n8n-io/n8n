/*! blob-to-buffer. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

if (!globalThis.DOMException) {
  const { MessageChannel } = require('worker_threads')
  const port = new MessageChannel().port1
  const ab = new ArrayBuffer()
  try { port.postMessage(ab, [ab, ab]) }
  catch (err) { globalThis.DOMException = err.constructor }
}

module.exports = globalThis.DOMException
