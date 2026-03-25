/**
 * http://www.ietf.org/rfc/rfc2595.txt
 *
 * The mechanism consists of a single message from the client to the
 * server.  The client sends the authorization identity (identity to
 * login as), followed by a US-ASCII NUL character, followed by the
 * authentication identity (identity whose password will be used),
 * followed by a US-ASCII NUL character, followed by the clear-text
 * password.  The client may leave the authorization identity empty to
 * indicate that it is the same as the authentication identity.
 *
 * The server will verify the authentication identity and password with
 * the system authentication database and verify that the authentication
 * credentials permit the client to login as the authorization identity.
 * If both steps succeed, the user is logged in.
 */

const Encoder = require('../../encoder')

const US_ASCII_NULL_CHAR = '\u0000'

module.exports = ({ authorizationIdentity = null, username, password }) => ({
  encode: async () => {
    return new Encoder().writeBytes(
      [authorizationIdentity, username, password].join(US_ASCII_NULL_CHAR)
    ).buffer
  },
})
