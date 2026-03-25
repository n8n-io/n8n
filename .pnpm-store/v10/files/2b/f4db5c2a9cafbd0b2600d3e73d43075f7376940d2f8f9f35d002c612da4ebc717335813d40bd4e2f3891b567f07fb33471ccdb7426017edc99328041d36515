/*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

const escape = (str, filename) =>
  (filename ? str : str.replace(/\r?\n|\r/g, '\r\n'))
  .replace(/\n/g, '%0A')
  .replace(/\r/g, '%0D')
  .replace(/"/g, '%22')

/**
 * pure function to convert any formData instance to a Blob
 * instances synchronous without reading all of the files
 *
 * @param {FormData|*} formData an instance of a formData Class
 * @param {Blob|*} [BlobClass=Blob] the Blob class to use when constructing it
 */
export function formDataToBlob (formData, BlobClass = Blob) {
  const boundary = ('----formdata-polyfill-' + Math.random())
  const chunks = []
  const prefix = `--${boundary}\r\nContent-Disposition: form-data; name="`

  for (let [name, value] of formData) {
    if (typeof value === 'string') {
      chunks.push(prefix + escape(name) + `"\r\n\r\n${value.replace(/\r(?!\n)|(?<!\r)\n/g, '\r\n')}\r\n`)
    } else {
      chunks.push(
        prefix + escape(name) + `"; filename="${escape(value.name, 1)}"\r\n` +
        `Content-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`,
        value,
        '\r\n'
      )
    }
  }

  chunks.push(`--${boundary}--`)

  return new BlobClass(chunks, {
    type: 'multipart/form-data; boundary=' + boundary
  })
}
