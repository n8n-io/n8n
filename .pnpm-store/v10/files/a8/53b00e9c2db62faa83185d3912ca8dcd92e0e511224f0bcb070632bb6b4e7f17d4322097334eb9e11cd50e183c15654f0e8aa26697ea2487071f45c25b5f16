const Encoder = require('../../../encoder')

/**
 * v0
 * Header => Key Value
 *   Key => varInt|string
 *   Value => varInt|bytes
 */

module.exports = ({ key, value }) => {
  return new Encoder().writeVarIntString(key).writeVarIntBytes(value)
}
