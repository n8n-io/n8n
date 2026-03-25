const tls = require('tls');
const { HttpsProxyAgent } = require('https-proxy-agent');
const SocketUtil = require('./socket_util');
const Logger = require('../logger');

module.exports = createHttpsProxyAgent;

function createHttpsProxyAgent(opts) {
  // HttpsProxyAgent >= 6.x takes two arguments for its constructor
  // See: https://github.com/TooTallNate/proxy-agents/blob/main/packages/https-proxy-agent/CHANGELOG.md#600
  const { host: hostname, port, user: username, password, protocol: rawProtocol, ...agentOptions } = opts;
  const protocol = rawProtocol.endsWith(':') ? rawProtocol : `${rawProtocol}:`;
  return new SnowflakeHttpsProxyAgent({ hostname, port, username, password, protocol }, agentOptions);
}

class SnowflakeHttpsProxyAgent extends HttpsProxyAgent {
  constructor(proxy, opts) {
    super(proxy, opts);
  }

  async connect(req, opts) {
    Logger.getInstance().debug('Using proxy=%s for host %s', this.proxy.hostname, opts.host);
    const socket = await super.connect(req, opts);
    if (socket instanceof tls.TLSSocket) {
      SocketUtil.secureSocket(socket, opts.host, this);
    }
    return socket;
  }
}
