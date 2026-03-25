/**
 * https://tools.ietf.org/html/rfc5802
 *
 * First, the client sends the "client-first-message" containing:
 *
 *  -> a GS2 header consisting of a flag indicating whether channel
 * binding is supported-but-not-used, not supported, or used, and an
 * optional SASL authorization identity;
 *
 *  -> SCRAM username and a random, unique nonce attributes.
 *
 * Note that the client's first message will always start with "n", "y",
 * or "p"; otherwise, the message is invalid and authentication MUST
 * fail.  This is important, as it allows for GS2 extensibility (e.g.,
 * to add support for security layers).
 */

const Encoder = require('../../../encoder')

module.exports = ({ clientFirstMessage }) => ({
  encode: async () => new Encoder().writeBytes(clientFirstMessage).buffer,
})
