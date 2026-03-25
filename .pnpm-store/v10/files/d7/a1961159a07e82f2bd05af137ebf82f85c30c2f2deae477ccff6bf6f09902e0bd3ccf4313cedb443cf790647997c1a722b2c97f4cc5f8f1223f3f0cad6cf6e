const { promisify } = require('util')
const zlib = require('zlib')

const gzip = promisify(zlib.gzip)
const unzip = promisify(zlib.unzip)

module.exports = {
  /**
   * @param {Encoder} encoder
   * @returns {Promise}
   */
  async compress(encoder) {
    return await gzip(encoder.buffer)
  },

  /**
   * @param {Buffer} buffer
   * @returns {Promise}
   */
  async decompress(buffer) {
    return await unzip(buffer)
  },
}
