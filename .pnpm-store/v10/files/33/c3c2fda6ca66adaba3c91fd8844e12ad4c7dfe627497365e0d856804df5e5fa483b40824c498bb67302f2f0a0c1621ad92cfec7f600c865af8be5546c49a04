const fs = require('fs')
const { Readable } = require('stream')
const { URL } = require('url')

const { Image } = require('./js-binding')

let http, https

const MAX_REDIRECTS = 20
const REDIRECT_STATUSES = new Set([301, 302])

/**
 * Loads the given source into canvas Image
 * @param {string|URL|Image|Buffer} source The image source to be loaded
 * @param {object} options Options passed to the loader
 */
module.exports = async function loadImage(source, options = {}) {
  // use the same buffer without copying if the source is a buffer
  if (Buffer.isBuffer(source) || source instanceof Uint8Array) return createImage(source, options.alt)
  // load readable stream as image
  if (source instanceof Readable) return createImage(await consumeStream(source), options.alt)
  // construct a Uint8Array if the source is ArrayBuffer or SharedArrayBuffer
  if (source instanceof ArrayBuffer || source instanceof SharedArrayBuffer)
    return createImage(new Uint8Array(source), options.alt)
  // construct a buffer if the source is buffer-like
  if (isBufferLike(source)) return createImage(Buffer.from(source), options.alt)
  // if the source is Image instance, copy the image src to new image
  if (source instanceof Image) return createImage(source.src, options.alt)
  // if source is string and in data uri format, construct image using data uri
  if (typeof source === 'string' && source.trimStart().startsWith('data:')) {
    const commaIdx = source.indexOf(',')
    const encoding = source.lastIndexOf('base64', commaIdx) < 0 ? 'utf-8' : 'base64'
    const data = Buffer.from(source.slice(commaIdx + 1), encoding)
    return createImage(data, options.alt)
  }
  // if source is a string or URL instance
  if (typeof source === 'string') {
    // if the source exists as a file, construct image from that file
    if (!source.startsWith('http') && !source.startsWith('https') && (await exists(source))) {
      return createImage(source, options.alt)
    } else {
      // the source is a remote url here
      source = new URL(source)
      // attempt to download the remote source and construct image
      const data = await new Promise((resolve, reject) =>
        makeRequest(
          source,
          resolve,
          reject,
          typeof options.maxRedirects === 'number' && options.maxRedirects >= 0 ? options.maxRedirects : MAX_REDIRECTS,
          options.requestOptions,
        ),
      )
      return createImage(data, options.alt)
    }
  }

  if (source instanceof URL) {
    if (source.protocol === 'file:') {
      // remove the leading slash on windows
      return createImage(process.platform === 'win32' ? source.pathname.substring(1) : source.pathname, options.alt)
    } else {
      const data = await new Promise((resolve, reject) =>
        makeRequest(
          source,
          resolve,
          reject,
          typeof options.maxRedirects === 'number' && options.maxRedirects >= 0 ? options.maxRedirects : MAX_REDIRECTS,
          options.requestOptions,
        ),
      )
      return createImage(data, options.alt)
    }
  }

  // throw error as don't support that source
  throw new TypeError('unsupported image source')
}

function makeRequest(url, resolve, reject, redirectCount, requestOptions) {
  const isHttps = url.protocol === 'https:'
  // lazy load the lib
  const lib = isHttps ? (!https ? (https = require('https')) : https) : !http ? (http = require('http')) : http

  lib
    .get(url.toString(), requestOptions || {}, (res) => {
      try {
        const shouldRedirect = REDIRECT_STATUSES.has(res.statusCode) && typeof res.headers.location === 'string'
        if (shouldRedirect && redirectCount > 0)
          return makeRequest(
            new URL(res.headers.location, url.origin),
            resolve,
            reject,
            redirectCount - 1,
            requestOptions,
          )
        if (typeof res.statusCode === 'number' && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`remote source rejected with status code ${res.statusCode}`))
        }

        consumeStream(res).then(resolve, reject)
      } catch (err) {
        reject(err)
      }
    })
    .on('error', reject)
}

// use stream/consumers in the future?
function consumeStream(res) {
  return new Promise((resolve, reject) => {
    const chunks = []

    res.on('data', (chunk) => chunks.push(chunk))
    res.on('end', () => resolve(Buffer.concat(chunks)))
    res.on('error', reject)
  })
}

async function createImage(src, alt) {
  const image = new Image()
  if (typeof alt === 'string') image.alt = alt

  return new Promise((resolve, reject) => {
    image.onload = () => {
      // Wait for bitmap decode before resolving
      image.decode().then(() => resolve(image), reject)
    }
    image.onerror = (e) => reject(e)
    image.src = src
  })
}

function isBufferLike(src) {
  return (src && src.type === 'Buffer') || Array.isArray(src)
}

async function exists(path) {
  try {
    await fs.promises.access(path, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}
