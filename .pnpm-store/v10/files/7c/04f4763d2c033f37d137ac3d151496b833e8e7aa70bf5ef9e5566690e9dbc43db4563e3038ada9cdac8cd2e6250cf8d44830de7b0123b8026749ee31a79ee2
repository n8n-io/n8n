const Encoder = require('../../../encoder')

module.exports = ({ finalMessage }) => ({
  encode: async () => new Encoder().writeBytes(finalMessage).buffer,
})
