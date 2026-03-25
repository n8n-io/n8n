const assert = require('assert')
const {
  ResponseStatusCodeError
} = require('../core/errors')
const { toUSVString } = require('../core/util')

async function getResolveErrorBodyCallback ({ callback, body, contentType, statusCode, statusMessage, headers }) {
  assert(body)

  let chunks = []
  let limit = 0

  for await (const chunk of body) {
    chunks.push(chunk)
    limit += chunk.length
    if (limit > 128 * 1024) {
      chunks = null
      break
    }
  }

  if (statusCode === 204 || !contentType || !chunks) {
    process.nextTick(callback, new ResponseStatusCodeError(`Response status code ${statusCode}${statusMessage ? `: ${statusMessage}` : ''}`, statusCode, headers))
    return
  }

  try {
    if (contentType.startsWith('application/json')) {
      const payload = JSON.parse(toUSVString(Buffer.concat(chunks)))
      process.nextTick(callback, new ResponseStatusCodeError(`Response status code ${statusCode}${statusMessage ? `: ${statusMessage}` : ''}`, statusCode, headers, payload))
      return
    }

    if (contentType.startsWith('text/')) {
      const payload = toUSVString(Buffer.concat(chunks))
      process.nextTick(callback, new ResponseStatusCodeError(`Response status code ${statusCode}${statusMessage ? `: ${statusMessage}` : ''}`, statusCode, headers, payload))
      return
    }
  } catch (err) {
    // Process in a fallback if error
  }

  process.nextTick(callback, new ResponseStatusCodeError(`Response status code ${statusCode}${statusMessage ? `: ${statusMessage}` : ''}`, statusCode, headers))
}

module.exports = { getResolveErrorBodyCallback }
