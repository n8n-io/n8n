const crypto = require('crypto')
const scram = require('../../protocol/sasl/scram')
const { KafkaJSSASLAuthenticationError, KafkaJSNonRetriableError } = require('../../errors')

const GS2_HEADER = 'n,,'

const EQUAL_SIGN_REGEX = /=/g
const COMMA_SIGN_REGEX = /,/g

const URLSAFE_BASE64_PLUS_REGEX = /\+/g
const URLSAFE_BASE64_SLASH_REGEX = /\//g
const URLSAFE_BASE64_TRAILING_EQUAL_REGEX = /=+$/

const HMAC_CLIENT_KEY = 'Client Key'
const HMAC_SERVER_KEY = 'Server Key'

const DIGESTS = {
  SHA256: {
    length: 32,
    type: 'sha256',
    minIterations: 4096,
  },
  SHA512: {
    length: 64,
    type: 'sha512',
    minIterations: 4096,
  },
}

const encode64 = str => Buffer.from(str).toString('base64')

class SCRAM {
  /**
   * From https://tools.ietf.org/html/rfc5802#section-5.1
   *
   * The characters ',' or '=' in usernames are sent as '=2C' and
   * '=3D' respectively.  If the server receives a username that
   * contains '=' not followed by either '2C' or '3D', then the
   * server MUST fail the authentication.
   *
   * @returns {String}
   */
  static sanitizeString(str) {
    return str.replace(EQUAL_SIGN_REGEX, '=3D').replace(COMMA_SIGN_REGEX, '=2C')
  }

  /**
   * In cryptography, a nonce is an arbitrary number that can be used just once.
   * It is similar in spirit to a nonce * word, hence the name. It is often a random or pseudo-random
   * number issued in an authentication protocol to * ensure that old communications cannot be reused
   * in replay attacks.
   *
   * @returns {String}
   */
  static nonce() {
    return crypto
      .randomBytes(16)
      .toString('base64')
      .replace(URLSAFE_BASE64_PLUS_REGEX, '-') // make it url safe
      .replace(URLSAFE_BASE64_SLASH_REGEX, '_')
      .replace(URLSAFE_BASE64_TRAILING_EQUAL_REGEX, '')
      .toString('ascii')
  }

  /**
   * Hi() is, essentially, PBKDF2 [RFC2898] with HMAC() as the
   * pseudorandom function (PRF) and with dkLen == output length of
   * HMAC() == output length of H()
   *
   * @returns {Promise<Buffer>}
   */
  static hi(password, salt, iterations, digestDefinition) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        digestDefinition.length,
        digestDefinition.type,
        (err, derivedKey) => (err ? reject(err) : resolve(derivedKey))
      )
    })
  }

  /**
   * Apply the exclusive-or operation to combine the octet string
   * on the left of this operator with the octet string on the right of
   * this operator.  The length of the output and each of the two
   * inputs will be the same for this use
   *
   * @returns {Buffer}
   */
  static xor(left, right) {
    const bufferA = Buffer.from(left)
    const bufferB = Buffer.from(right)
    const length = Buffer.byteLength(bufferA)

    if (length !== Buffer.byteLength(bufferB)) {
      throw new KafkaJSNonRetriableError('Buffers must be of the same length')
    }

    const result = []
    for (let i = 0; i < length; i++) {
      result.push(bufferA[i] ^ bufferB[i])
    }

    return Buffer.from(result)
  }

  /**
   * @param {SASLOptions} sasl
   * @param {Logger} logger
   * @param {Function} saslAuthenticate
   * @param {DigestDefinition} digestDefinition
   */
  constructor(sasl, host, port, logger, saslAuthenticate, digestDefinition) {
    this.sasl = sasl
    this.host = host
    this.port = port
    this.logger = logger
    this.saslAuthenticate = saslAuthenticate
    this.digestDefinition = digestDefinition

    const digestType = digestDefinition.type.toUpperCase()
    this.PREFIX = `SASL SCRAM ${digestType} authentication`

    this.currentNonce = SCRAM.nonce()
  }

  async authenticate() {
    const { PREFIX } = this
    const broker = `${this.host}:${this.port}`

    if (this.sasl.username == null || this.sasl.password == null) {
      throw new KafkaJSSASLAuthenticationError(`${this.PREFIX}: Invalid username or password`)
    }

    try {
      this.logger.debug('Exchanging first client message', { broker })
      const clientMessageResponse = await this.sendClientFirstMessage()

      this.logger.debug('Sending final message', { broker })
      const finalResponse = await this.sendClientFinalMessage(clientMessageResponse)

      if (finalResponse.e) {
        throw new Error(finalResponse.e)
      }

      const serverKey = await this.serverKey(clientMessageResponse)
      const serverSignature = this.serverSignature(serverKey, clientMessageResponse)

      if (finalResponse.v !== serverSignature) {
        throw new Error('Invalid server signature in server final message')
      }

      this.logger.debug(`${PREFIX} successful`, { broker })
    } catch (e) {
      const error = new KafkaJSSASLAuthenticationError(`${PREFIX} failed: ${e.message}`)
      this.logger.error(error.message, { broker })
      throw error
    }
  }

  /**
   * @private
   */
  async sendClientFirstMessage() {
    const clientFirstMessage = `${GS2_HEADER}${this.firstMessageBare()}`
    const request = scram.firstMessage.request({ clientFirstMessage })
    const response = scram.firstMessage.response

    return this.saslAuthenticate({
      request,
      response,
    })
  }

  /**
   * @private
   */
  async sendClientFinalMessage(clientMessageResponse) {
    const { PREFIX } = this
    const iterations = parseInt(clientMessageResponse.i, 10)
    const { minIterations } = this.digestDefinition

    if (!clientMessageResponse.r.startsWith(this.currentNonce)) {
      throw new KafkaJSSASLAuthenticationError(
        `${PREFIX} failed: Invalid server nonce, it does not start with the client nonce`
      )
    }

    if (iterations < minIterations) {
      throw new KafkaJSSASLAuthenticationError(
        `${PREFIX} failed: Requested iterations ${iterations} is less than the minimum ${minIterations}`
      )
    }

    const finalMessageWithoutProof = this.finalMessageWithoutProof(clientMessageResponse)
    const clientProof = await this.clientProof(clientMessageResponse)
    const finalMessage = `${finalMessageWithoutProof},p=${clientProof}`
    const request = scram.finalMessage.request({ finalMessage })
    const response = scram.finalMessage.response

    return this.saslAuthenticate({
      request,
      response,
    })
  }

  /**
   * @private
   */
  async clientProof(clientMessageResponse) {
    const clientKey = await this.clientKey(clientMessageResponse)
    const storedKey = this.H(clientKey)
    const clientSignature = this.clientSignature(storedKey, clientMessageResponse)
    return encode64(SCRAM.xor(clientKey, clientSignature))
  }

  /**
   * @private
   */
  async clientKey(clientMessageResponse) {
    const saltedPassword = await this.saltPassword(clientMessageResponse)
    return this.HMAC(saltedPassword, HMAC_CLIENT_KEY)
  }

  /**
   * @private
   */
  async serverKey(clientMessageResponse) {
    const saltedPassword = await this.saltPassword(clientMessageResponse)
    return this.HMAC(saltedPassword, HMAC_SERVER_KEY)
  }

  /**
   * @private
   */
  clientSignature(storedKey, clientMessageResponse) {
    return this.HMAC(storedKey, this.authMessage(clientMessageResponse))
  }

  /**
   * @private
   */
  serverSignature(serverKey, clientMessageResponse) {
    return encode64(this.HMAC(serverKey, this.authMessage(clientMessageResponse)))
  }

  /**
   * @private
   */
  authMessage(clientMessageResponse) {
    return [
      this.firstMessageBare(),
      clientMessageResponse.original,
      this.finalMessageWithoutProof(clientMessageResponse),
    ].join(',')
  }

  /**
   * @private
   */
  async saltPassword(clientMessageResponse) {
    const salt = Buffer.from(clientMessageResponse.s, 'base64')
    const iterations = parseInt(clientMessageResponse.i, 10)
    return SCRAM.hi(this.encodedPassword(), salt, iterations, this.digestDefinition)
  }

  /**
   * @private
   */
  firstMessageBare() {
    return `n=${this.encodedUsername()},r=${this.currentNonce}`
  }

  /**
   * @private
   */
  finalMessageWithoutProof(clientMessageResponse) {
    const rnonce = clientMessageResponse.r
    return `c=${encode64(GS2_HEADER)},r=${rnonce}`
  }

  /**
   * @private
   */
  encodedUsername() {
    const { username } = this.sasl
    return SCRAM.sanitizeString(username).toString('utf-8')
  }

  /**
   * @private
   */
  encodedPassword() {
    const { password } = this.sasl
    return password.toString('utf-8')
  }

  /**
   * @private
   */
  H(data) {
    return crypto
      .createHash(this.digestDefinition.type)
      .update(data)
      .digest()
  }

  /**
   * @private
   */
  HMAC(key, data) {
    return crypto
      .createHmac(this.digestDefinition.type, key)
      .update(data)
      .digest()
  }
}

module.exports = {
  DIGESTS,
  SCRAM,
}
