/**
 * http://www.ietf.org/rfc/rfc5801.txt
 *
 * See org.apache.kafka.common.security.oauthbearer.internals.OAuthBearerClientInitialResponse
 * for official Java client implementation.
 *
 * The mechanism consists of a message from the client to the server.
 * The client sends the "n,"" GS header, followed by the authorizationIdentitty
 * prefixed by "a=" (if present), followed by ",", followed by a US-ASCII SOH
 * character, followed by "auth=Bearer ", followed by the token value, followed
 * by US-ASCII SOH character, followed by SASL extensions in OAuth "friendly"
 * format and then closed by two additionals US-ASCII SOH characters.
 *
 * SASL extensions are optional an must be expressed as key-value pairs in an
 * object. Each expression is converted as, the extension entry key, followed
 * by "=", followed by extension entry value. Each extension is separated by a
 * US-ASCII SOH character. If extensions are not present, their relative part
 * in the message, including the US-ASCII SOH character, is omitted.
 *
 * The client may leave the authorization identity empty to
 * indicate that it is the same as the authentication identity.
 *
 * The server will verify the authentication token and verify that the
 * authentication credentials permit the client to login as the authorization
 * identity. If both steps succeed, the user is logged in.
 */

const Encoder = require('../../encoder')

const SEPARATOR = '\u0001' // SOH - Start Of Header ASCII

function formatExtensions(extensions) {
  let msg = ''

  if (extensions == null) {
    return msg
  }

  let prefix = ''
  for (const k in extensions) {
    msg += `${prefix}${k}=${extensions[k]}`
    prefix = SEPARATOR
  }

  return msg
}

module.exports = async ({ authorizationIdentity = null }, oauthBearerToken) => {
  const authzid = authorizationIdentity == null ? '' : `"a=${authorizationIdentity}`
  let ext = formatExtensions(oauthBearerToken.extensions)
  if (ext.length > 0) {
    ext = `${SEPARATOR}${ext}`
  }

  const oauthMsg = `n,${authzid},${SEPARATOR}auth=Bearer ${oauthBearerToken.value}${ext}${SEPARATOR}${SEPARATOR}`

  return {
    encode: async () => {
      return new Encoder().writeBytes(Buffer.from(oauthMsg)).buffer
    },
  }
}
