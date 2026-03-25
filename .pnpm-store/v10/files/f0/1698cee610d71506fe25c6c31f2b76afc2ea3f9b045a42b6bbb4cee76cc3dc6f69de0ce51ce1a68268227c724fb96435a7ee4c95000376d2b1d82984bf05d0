'use strict'

const {
  staticPropertyDescriptors,
  readOperation,
  fireAProgressEvent
} = require('./util')
const {
  kState,
  kError,
  kResult,
  kEvents,
  kAborted
} = require('./symbols')
const { webidl } = require('../fetch/webidl')
const { kEnumerableProperty } = require('../core/util')

class FileReader extends EventTarget {
  constructor () {
    super()

    this[kState] = 'empty'
    this[kResult] = null
    this[kError] = null
    this[kEvents] = {
      loadend: null,
      error: null,
      abort: null,
      load: null,
      progress: null,
      loadstart: null
    }
  }

  /**
   * @see https://w3c.github.io/FileAPI/#dfn-readAsArrayBuffer
   * @param {import('buffer').Blob} blob
   */
  readAsArrayBuffer (blob) {
    webidl.brandCheck(this, FileReader)

    webidl.argumentLengthCheck(arguments, 1, { header: 'FileReader.readAsArrayBuffer' })

    blob = webidl.converters.Blob(blob, { strict: false })

    // The readAsArrayBuffer(blob) method, when invoked,
    // must initiate a read operation for blob with ArrayBuffer.
    readOperation(this, blob, 'ArrayBuffer')
  }

  /**
   * @see https://w3c.github.io/FileAPI/#readAsBinaryString
   * @param {import('buffer').Blob} blob
   */
  readAsBinaryString (blob) {
    webidl.brandCheck(this, FileReader)

    webidl.argumentLengthCheck(arguments, 1, { header: 'FileReader.readAsBinaryString' })

    blob = webidl.converters.Blob(blob, { strict: false })

    // The readAsBinaryString(blob) method, when invoked,
    // must initiate a read operation for blob with BinaryString.
    readOperation(this, blob, 'BinaryString')
  }

  /**
   * @see https://w3c.github.io/FileAPI/#readAsDataText
   * @param {import('buffer').Blob} blob
   * @param {string?} encoding
   */
  readAsText (blob, encoding = undefined) {
    webidl.brandCheck(this, FileReader)

    webidl.argumentLengthCheck(arguments, 1, { header: 'FileReader.readAsText' })

    blob = webidl.converters.Blob(blob, { strict: false })

    if (encoding !== undefined) {
      encoding = webidl.converters.DOMString(encoding)
    }

    // The readAsText(blob, encoding) method, when invoked,
    // must initiate a read operation for blob with Text and encoding.
    readOperation(this, blob, 'Text', encoding)
  }

  /**
   * @see https://w3c.github.io/FileAPI/#dfn-readAsDataURL
   * @param {import('buffer').Blob} blob
   */
  readAsDataURL (blob) {
    webidl.brandCheck(this, FileReader)

    webidl.argumentLengthCheck(arguments, 1, { header: 'FileReader.readAsDataURL' })

    blob = webidl.converters.Blob(blob, { strict: false })

    // The readAsDataURL(blob) method, when invoked, must
    // initiate a read operation for blob with DataURL.
    readOperation(this, blob, 'DataURL')
  }

  /**
   * @see https://w3c.github.io/FileAPI/#dfn-abort
   */
  abort () {
    // 1. If this's state is "empty" or if this's state is
    //    "done" set this's result to null and terminate
    //    this algorithm.
    if (this[kState] === 'empty' || this[kState] === 'done') {
      this[kResult] = null
      return
    }

    // 2. If this's state is "loading" set this's state to
    //    "done" and set this's result to null.
    if (this[kState] === 'loading') {
      this[kState] = 'done'
      this[kResult] = null
    }

    // 3. If there are any tasks from this on the file reading
    //    task source in an affiliated task queue, then remove
    //    those tasks from that task queue.
    this[kAborted] = true

    // 4. Terminate the algorithm for the read method being processed.
    // TODO

    // 5. Fire a progress event called abort at this.
    fireAProgressEvent('abort', this)

    // 6. If this's state is not "loading", fire a progress
    //    event called loadend at this.
    if (this[kState] !== 'loading') {
      fireAProgressEvent('loadend', this)
    }
  }

  /**
   * @see https://w3c.github.io/FileAPI/#dom-filereader-readystate
   */
  get readyState () {
    webidl.brandCheck(this, FileReader)

    switch (this[kState]) {
      case 'empty': return this.EMPTY
      case 'loading': return this.LOADING
      case 'done': return this.DONE
    }
  }

  /**
   * @see https://w3c.github.io/FileAPI/#dom-filereader-result
   */
  get result () {
    webidl.brandCheck(this, FileReader)

    // The result attribute’s getter, when invoked, must return
    // this's result.
    return this[kResult]
  }

  /**
   * @see https://w3c.github.io/FileAPI/#dom-filereader-error
   */
  get error () {
    webidl.brandCheck(this, FileReader)

    // The error attribute’s getter, when invoked, must return
    // this's error.
    return this[kError]
  }

  get onloadend () {
    webidl.brandCheck(this, FileReader)

    return this[kEvents].loadend
  }

  set onloadend (fn) {
    webidl.brandCheck(this, FileReader)

    if (this[kEvents].loadend) {
      this.removeEventListener('loadend', this[kEvents].loadend)
    }

    if (typeof fn === 'function') {
      this[kEvents].loadend = fn
      this.addEventListener('loadend', fn)
    } else {
      this[kEvents].loadend = null
    }
  }

  get onerror () {
    webidl.brandCheck(this, FileReader)

    return this[kEvents].error
  }

  set onerror (fn) {
    webidl.brandCheck(this, FileReader)

    if (this[kEvents].error) {
      this.removeEventListener('error', this[kEvents].error)
    }

    if (typeof fn === 'function') {
      this[kEvents].error = fn
      this.addEventListener('error', fn)
    } else {
      this[kEvents].error = null
    }
  }

  get onloadstart () {
    webidl.brandCheck(this, FileReader)

    return this[kEvents].loadstart
  }

  set onloadstart (fn) {
    webidl.brandCheck(this, FileReader)

    if (this[kEvents].loadstart) {
      this.removeEventListener('loadstart', this[kEvents].loadstart)
    }

    if (typeof fn === 'function') {
      this[kEvents].loadstart = fn
      this.addEventListener('loadstart', fn)
    } else {
      this[kEvents].loadstart = null
    }
  }

  get onprogress () {
    webidl.brandCheck(this, FileReader)

    return this[kEvents].progress
  }

  set onprogress (fn) {
    webidl.brandCheck(this, FileReader)

    if (this[kEvents].progress) {
      this.removeEventListener('progress', this[kEvents].progress)
    }

    if (typeof fn === 'function') {
      this[kEvents].progress = fn
      this.addEventListener('progress', fn)
    } else {
      this[kEvents].progress = null
    }
  }

  get onload () {
    webidl.brandCheck(this, FileReader)

    return this[kEvents].load
  }

  set onload (fn) {
    webidl.brandCheck(this, FileReader)

    if (this[kEvents].load) {
      this.removeEventListener('load', this[kEvents].load)
    }

    if (typeof fn === 'function') {
      this[kEvents].load = fn
      this.addEventListener('load', fn)
    } else {
      this[kEvents].load = null
    }
  }

  get onabort () {
    webidl.brandCheck(this, FileReader)

    return this[kEvents].abort
  }

  set onabort (fn) {
    webidl.brandCheck(this, FileReader)

    if (this[kEvents].abort) {
      this.removeEventListener('abort', this[kEvents].abort)
    }

    if (typeof fn === 'function') {
      this[kEvents].abort = fn
      this.addEventListener('abort', fn)
    } else {
      this[kEvents].abort = null
    }
  }
}

// https://w3c.github.io/FileAPI/#dom-filereader-empty
FileReader.EMPTY = FileReader.prototype.EMPTY = 0
// https://w3c.github.io/FileAPI/#dom-filereader-loading
FileReader.LOADING = FileReader.prototype.LOADING = 1
// https://w3c.github.io/FileAPI/#dom-filereader-done
FileReader.DONE = FileReader.prototype.DONE = 2

Object.defineProperties(FileReader.prototype, {
  EMPTY: staticPropertyDescriptors,
  LOADING: staticPropertyDescriptors,
  DONE: staticPropertyDescriptors,
  readAsArrayBuffer: kEnumerableProperty,
  readAsBinaryString: kEnumerableProperty,
  readAsText: kEnumerableProperty,
  readAsDataURL: kEnumerableProperty,
  abort: kEnumerableProperty,
  readyState: kEnumerableProperty,
  result: kEnumerableProperty,
  error: kEnumerableProperty,
  onloadstart: kEnumerableProperty,
  onprogress: kEnumerableProperty,
  onload: kEnumerableProperty,
  onabort: kEnumerableProperty,
  onerror: kEnumerableProperty,
  onloadend: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'FileReader',
    writable: false,
    enumerable: false,
    configurable: true
  }
})

Object.defineProperties(FileReader, {
  EMPTY: staticPropertyDescriptors,
  LOADING: staticPropertyDescriptors,
  DONE: staticPropertyDescriptors
})

module.exports = {
  FileReader
}
