/*! blob-to-buffer. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

if (!globalThis.DOMException) {
  const { MessageChannel } = require('worker_threads'),
  port = new MessageChannel().port1,
  ab = new ArrayBuffer()
  try { port.postMessage(ab, [ab, ab]) }
  catch (err) {
    err.constructor.name === 'DOMException' && (
      globalThis.DOMException = err.constructor
    )
  }
}

module.exports = globalThis.DOMException

const e1 = new DOMException("Something went wrong", "BadThingsError");
console.assert(e1.name === "BadThingsError");
console.assert(e1.code === 0);

const e2 = new DOMException("Another exciting error message", "NoModificationAllowedError");
console.assert(e2.name === "NoModificationAllowedError");
console.assert(e2.code === 2);
