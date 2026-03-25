const Util = require('../util');
const ProxyUtil = require('../proxy_util');
const Base = require('./base');
const HttpsAgent = require('../agent/https_ocsp_agent');
const HttpsProxyAgent = require('../agent/https_proxy_agent');
const HttpAgent = require('http').Agent;
const GlobalConfig = require('../../lib/global_config');
const Logger = require('../logger');
const RequestUtil = require('../http/request_util');

/**
 * Returns the delay time calculated by exponential backoff with
 * decorrelated jitter. For more details, check out:
 * http://www.awsarchitectureblog.com/2015/03/backoff.html
 * @return  {Number} number of milliseconds to wait before retrying again the request.
 */
NodeHttpClient.prototype.constructExponentialBackoffStrategy = function () {
  Logger.getInstance().trace('Calculating exponential backoff strategy');

  const previousSleepTime = this._connectionConfig.getRetrySfStartingSleepTime();
  // maximum seconds
  const cap = this._connectionConfig.getRetrySfMaxSleepTime();
  // minimum seconds
  const base = 1;
  const nextSleepTime = Util.nextSleepTime(base, cap, previousSleepTime);
  const nextSleepTimeInMilliseconds = nextSleepTime * 1000;
  Logger.getInstance().trace('Calculated exponential backoff strategy sleep time: %d', nextSleepTimeInMilliseconds);
  return nextSleepTimeInMilliseconds;
};

/**
 * Creates a client that can be used to make requests in Node.js.
 *
 * @param {ConnectionConfig} connectionConfig
 * @constructor
 */
function NodeHttpClient(connectionConfig) {
  Logger.getInstance().trace('Initializing NodeHttpClient with Connection Config[%s]',
    connectionConfig.describeIdentityAttributes());
  Base.apply(this, [connectionConfig]);
}

Util.inherits(NodeHttpClient, Base);

const httpsAgentCache = new Map();

function getFromCacheOrCreate(agentClass, options, agentId) {
  Logger.getInstance().trace('Agent[id: %s] - trying to retrieve from cache or create.', agentId);
  let agent = {};
  function createAgent(agentClass, agentOptions, agentId) {
    Logger.getInstance().trace('Agent[id: %s] - creating a new agent instance.', agentId);
    const agent = agentClass(agentOptions);
    httpsAgentCache.set(agentId, agent);
    Logger.getInstance().trace('Agent[id: %s] - new instance stored in cache.', agentId);

    // detect and log PROXY envvar + agent proxy settings
    const compareAndLogEnvAndAgentProxies = ProxyUtil.getCompareAndLogEnvAndAgentProxies(agentOptions);
    Logger.getInstance().debug('Agent[id: %s] - proxy settings used in requests: %s', agentId, compareAndLogEnvAndAgentProxies.messages);
    // if there's anything to warn on (e.g. both envvar + agent proxy used, and they are different)
    // log warnings on them
    if (compareAndLogEnvAndAgentProxies.warnings) {
      Logger.getInstance().warn('Agent[id: %s] - %s', agentId, compareAndLogEnvAndAgentProxies.warnings);
    }

    return agent;
  }

  if (httpsAgentCache.has(agentId)) {
    Logger.getInstance().trace('Agent[id: %s] - retrieving an agent instance from cache.', agentId);
    agent = httpsAgentCache.get(agentId);
  } else {
    agent = createAgent(agentClass, options, agentId);
  }
  return agent;
}

function enrichAgentOptionsWithProxyConfig(agentOptions, proxy) {
  agentOptions.host = proxy.host;
  agentOptions.port = proxy.port;
  agentOptions.protocol = proxy.protocol;
  if (proxy.user && proxy.password) {
    agentOptions.user = proxy.user;
    agentOptions.password = proxy.password;
  }
}

function isBypassProxy(proxy, destination, agentId) {
  if (proxy && proxy.noProxy) {
    const bypassList = proxy.noProxy.split('|');
    for (let i = 0; i < bypassList.length; i++) {
      let host = bypassList[i].trim();
      host = host.replace('*', '.*?');
      const matches = destination.match(host);
      if (matches) {
        Logger.getInstance().debug('Agent[id: %s] - bypassing proxy allowed for destination: %s', agentId, destination);
        return true;
      }
    }
  }
  return false;
}

/**
 * @inheritDoc
 */
NodeHttpClient.prototype.getAgent = function (parsedUrl, proxy, mock) {
  Logger.getInstance().trace('Agent[url: %s] - getting an agent instance.', RequestUtil.describeURL(parsedUrl.href));
  if (!proxy && GlobalConfig.isEnvProxyActive()) {
    const isHttps = parsedUrl.protocol === 'https:';
    proxy = ProxyUtil.getProxyFromEnv(isHttps);
    if (proxy) {
      Logger.getInstance().debug('Agent[url: %s] - proxy info loaded from the environment variable. Proxy host: %s', RequestUtil.describeURL(parsedUrl.href), proxy.host);
    }
  }
  return getProxyAgent(proxy, parsedUrl, parsedUrl.href, mock);
};

function getProxyAgent(proxyOptions, parsedUrl, destination, mock) {
  Logger.getInstance().trace('Agent[url: %s] - getting a proxy agent instance.', RequestUtil.describeURL(parsedUrl.href));
  const agentOptions = {
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    keepAlive: GlobalConfig.getKeepAlive()
  };

  if (mock) {
    const mockAgent = mock.agentClass(agentOptions);
    if (mockAgent.protocol === parsedUrl.protocol) {
      Logger.getInstance().debug('Agent[url: %s] - the mock agent will be used.', RequestUtil.describeURL(parsedUrl.href));
      return mockAgent;
    }
  }

  const destHost = ProxyUtil.getHostFromURL(destination);
  const agentId = createAgentId(agentOptions.protocol, agentOptions.hostname, destHost, agentOptions.keepAlive);
  Logger.getInstance().debug('Agent[id: %s] - the destination host is: %s.', agentId, destHost);

  const bypassProxy = isBypassProxy(proxyOptions, destination, agentId);
  let agent;
  const isHttps = agentOptions.protocol === 'https:';

  if (isHttps) {
    if (proxyOptions && !bypassProxy) {
      Logger.getInstance().trace('Agent[id: %s] - using HTTPS agent enriched with proxy options.', agentId);
      enrichAgentOptionsWithProxyConfig(agentOptions, proxyOptions);
      agent = getFromCacheOrCreate(HttpsProxyAgent, agentOptions, agentId);
    } else {
      Logger.getInstance().trace('Agent[id: %s] - using HTTPS agent without proxy.', agentId);
      agent = getFromCacheOrCreate(HttpsAgent, agentOptions, agentId);
    }
  } else if (proxyOptions && !bypassProxy) {
    Logger.getInstance().trace('Agent[id: %s] - using HTTP agent enriched with proxy options.', agentId);
    enrichAgentOptionsWithProxyConfig(agentOptions, proxyOptions);
    agent = getFromCacheOrCreate(HttpAgent, agentOptions, agentId);
  } else {
    Logger.getInstance().trace('Agent[id: %s] - using HTTP agent without proxy.', agentId);
    agent = getFromCacheOrCreate(HttpAgent, agentOptions, agentId);
  }
  return agent;
}

function createAgentId(protocol, hostname, destination, keepAlive) {
  return `${protocol}//${hostname}-${destination}-${keepAlive ? 'keepAlive' : 'noKeepAlive'}`;
}

//This is for the testing purpose.
function getAgentCacheSize() {
  return httpsAgentCache.size;
}

module.exports = { NodeHttpClient, getProxyAgent, getAgentCacheSize, isBypassProxy };