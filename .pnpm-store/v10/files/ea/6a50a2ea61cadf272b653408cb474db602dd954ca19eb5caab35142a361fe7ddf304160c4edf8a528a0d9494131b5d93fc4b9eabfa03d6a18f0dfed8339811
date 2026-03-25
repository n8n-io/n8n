'use strict'
const LRU = require('lru-cache')
const url = require('url')
const isLambda = require('is-lambda')

const AGENT_CACHE = new LRU({ max: 50 })
const HttpAgent = require('agentkeepalive')
const HttpsAgent = HttpAgent.HttpsAgent

module.exports = getAgent

const getAgentTimeout = timeout =>
  typeof timeout !== 'number' || !timeout ? 0 : timeout + 1

const getMaxSockets = maxSockets => maxSockets || 15

function getAgent (uri, opts) {
  const parsedUri = new url.URL(typeof uri === 'string' ? uri : uri.url)
  const isHttps = parsedUri.protocol === 'https:'
  const pxuri = getProxyUri(parsedUri.href, opts)

  // If opts.timeout is zero, set the agentTimeout to zero as well. A timeout
  // of zero disables the timeout behavior (OS limits still apply). Else, if
  // opts.timeout is a non-zero value, set it to timeout + 1, to ensure that
  // the node-fetch-npm timeout will always fire first, giving us more
  // consistent errors.
  const agentTimeout = getAgentTimeout(opts.timeout)
  const agentMaxSockets = getMaxSockets(opts.maxSockets)

  const key = [
    `https:${isHttps}`,
    pxuri
      ? `proxy:${pxuri.protocol}//${pxuri.host}:${pxuri.port}`
      : '>no-proxy<',
    `local-address:${opts.localAddress || '>no-local-address<'}`,
    `strict-ssl:${isHttps ? opts.rejectUnauthorized : '>no-strict-ssl<'}`,
    `ca:${(isHttps && opts.ca) || '>no-ca<'}`,
    `cert:${(isHttps && opts.cert) || '>no-cert<'}`,
    `key:${(isHttps && opts.key) || '>no-key<'}`,
    `timeout:${agentTimeout}`,
    `maxSockets:${agentMaxSockets}`,
  ].join(':')

  if (opts.agent != null) { // `agent: false` has special behavior!
    return opts.agent
  }

  // keep alive in AWS lambda makes no sense
  const lambdaAgent = !isLambda ? null
    : isHttps ? require('https').globalAgent
    : require('http').globalAgent

  if (isLambda && !pxuri)
    return lambdaAgent

  if (AGENT_CACHE.peek(key))
    return AGENT_CACHE.get(key)

  if (pxuri) {
    const pxopts = isLambda ? {
      ...opts,
      agent: lambdaAgent,
    } : opts
    const proxy = getProxy(pxuri, pxopts, isHttps)
    AGENT_CACHE.set(key, proxy)
    return proxy
  }

  const agent = isHttps ? new HttpsAgent({
    maxSockets: agentMaxSockets,
    ca: opts.ca,
    cert: opts.cert,
    key: opts.key,
    localAddress: opts.localAddress,
    rejectUnauthorized: opts.rejectUnauthorized,
    timeout: agentTimeout,
  }) : new HttpAgent({
    maxSockets: agentMaxSockets,
    localAddress: opts.localAddress,
    timeout: agentTimeout,
  })
  AGENT_CACHE.set(key, agent)
  return agent
}

function checkNoProxy (uri, opts) {
  const host = new url.URL(uri).hostname.split('.').reverse()
  let noproxy = (opts.noProxy || getProcessEnv('no_proxy'))
  if (typeof noproxy === 'string')
    noproxy = noproxy.split(/\s*,\s*/g)

  return noproxy && noproxy.some(no => {
    const noParts = no.split('.').filter(x => x).reverse()
    if (!noParts.length)
      return false
    for (let i = 0; i < noParts.length; i++) {
      if (host[i] !== noParts[i])
        return false
    }
    return true
  })
}

module.exports.getProcessEnv = getProcessEnv

function getProcessEnv (env) {
  if (!env)
    return

  let value

  if (Array.isArray(env)) {
    for (const e of env) {
      value = process.env[e] ||
        process.env[e.toUpperCase()] ||
        process.env[e.toLowerCase()]
      if (typeof value !== 'undefined')
        break
    }
  }

  if (typeof env === 'string') {
    value = process.env[env] ||
      process.env[env.toUpperCase()] ||
      process.env[env.toLowerCase()]
  }

  return value
}

module.exports.getProxyUri = getProxyUri
function getProxyUri (uri, opts) {
  const protocol = new url.URL(uri).protocol

  const proxy = opts.proxy ||
    (
      protocol === 'https:' &&
      getProcessEnv('https_proxy')
    ) ||
    (
      protocol === 'http:' &&
      getProcessEnv(['https_proxy', 'http_proxy', 'proxy'])
    )
  if (!proxy)
    return null

  const parsedProxy = (typeof proxy === 'string') ? new url.URL(proxy) : proxy

  return !checkNoProxy(uri, opts) && parsedProxy
}

const getAuth = u =>
  u.username && u.password ? decodeURIComponent(`${u.username}:${u.password}`)
  : u.username ? decodeURIComponent(u.username)
  : null

const getPath = u => u.pathname + u.search + u.hash

const HttpProxyAgent = require('http-proxy-agent')
const HttpsProxyAgent = require('https-proxy-agent')
const SocksProxyAgent = require('socks-proxy-agent')
module.exports.getProxy = getProxy
function getProxy (proxyUrl, opts, isHttps) {
  const popts = {
    host: proxyUrl.hostname,
    port: proxyUrl.port,
    protocol: proxyUrl.protocol,
    path: getPath(proxyUrl),
    auth: getAuth(proxyUrl),
    ca: opts.ca,
    cert: opts.cert,
    key: opts.key,
    timeout: getAgentTimeout(opts.timeout),
    localAddress: opts.localAddress,
    maxSockets: getMaxSockets(opts.maxSockets),
    rejectUnauthorized: opts.rejectUnauthorized,
  }

  if (proxyUrl.protocol === 'http:' || proxyUrl.protocol === 'https:') {
    if (!isHttps)
      return new HttpProxyAgent(popts)
    else
      return new HttpsProxyAgent(popts)
  } else if (proxyUrl.protocol.startsWith('socks'))
    return new SocksProxyAgent(popts)
  else {
    throw Object.assign(
      new Error(`unsupported proxy protocol: '${proxyUrl.protocol}'`),
      {
        url: proxyUrl.href,
      }
    )
  }
}
