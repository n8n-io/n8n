const crc32C = require('./crc32C')
const unsigned = value => Uint32Array.from([value])[0]

module.exports = buffer => unsigned(crc32C(buffer))
