'use strict';

const node_net = require('node:net');
const node_os = require('node:os');

const unsafePorts = /* @__PURE__ */ new Set([
  1,
  // tcpmux
  7,
  // echo
  9,
  // discard
  11,
  // systat
  13,
  // daytime
  15,
  // netstat
  17,
  // qotd
  19,
  // chargen
  20,
  // ftp data
  21,
  // ftp access
  22,
  // ssh
  23,
  // telnet
  25,
  // smtp
  37,
  // time
  42,
  // name
  43,
  // nicname
  53,
  // domain
  69,
  // tftp
  77,
  // priv-rjs
  79,
  // finger
  87,
  // ttylink
  95,
  // supdup
  101,
  // hostriame
  102,
  // iso-tsap
  103,
  // gppitnp
  104,
  // acr-nema
  109,
  // pop2
  110,
  // pop3
  111,
  // sunrpc
  113,
  // auth
  115,
  // sftp
  117,
  // uucp-path
  119,
  // nntp
  123,
  // NTP
  135,
  // loc-srv /epmap
  137,
  // netbios
  139,
  // netbios
  143,
  // imap2
  161,
  // snmp
  179,
  // BGP
  389,
  // ldap
  427,
  // SLP (Also used by Apple Filing Protocol)
  465,
  // smtp+ssl
  512,
  // print / exec
  513,
  // login
  514,
  // shell
  515,
  // printer
  526,
  // tempo
  530,
  // courier
  531,
  // chat
  532,
  // netnews
  540,
  // uucp
  548,
  // AFP (Apple Filing Protocol)
  554,
  // rtsp
  556,
  // remotefs
  563,
  // nntp+ssl
  587,
  // smtp (rfc6409)
  601,
  // syslog-conn (rfc3195)
  636,
  // ldap+ssl
  989,
  // ftps-data
  990,
  // ftps
  993,
  // ldap+ssl
  995,
  // pop3+ssl
  1719,
  // h323gatestat
  1720,
  // h323hostcall
  1723,
  // pptp
  2049,
  // nfs
  3659,
  // apple-sasl / PasswordServer
  4045,
  // lockd
  5060,
  // sip
  5061,
  // sips
  6e3,
  // X11
  6566,
  // sane-port
  6665,
  // Alternate IRC [Apple addition]
  6666,
  // Alternate IRC [Apple addition]
  6667,
  // Standard IRC [Apple addition]
  6668,
  // Alternate IRC [Apple addition]
  6669,
  // Alternate IRC [Apple addition]
  6697,
  // IRC + TLS
  10080
  // Amanda
]);
function isUnsafePort(port) {
  return unsafePorts.has(port);
}
function isSafePort(port) {
  return !isUnsafePort(port);
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class GetPortError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.message = message;
    __publicField(this, "name", "GetPortError");
  }
}
function _log(verbose, message) {
  if (verbose) {
    console.log(`[get-port] ${message}`);
  }
}
function _generateRange(from, to) {
  if (to < from) {
    return [];
  }
  const r = [];
  for (let index = from; index <= to; index++) {
    r.push(index);
  }
  return r;
}
function _tryPort(port, host) {
  return new Promise((resolve) => {
    const server = node_net.createServer();
    server.unref();
    server.on("error", () => {
      resolve(false);
    });
    server.listen({ port, host }, () => {
      const { port: port2 } = server.address();
      server.close(() => {
        resolve(isSafePort(port2) && port2);
      });
    });
  });
}
function _getLocalHosts(additional) {
  const hosts = new Set(additional);
  for (const _interface of Object.values(node_os.networkInterfaces())) {
    for (const config of _interface || []) {
      if (config.address && !config.internal && !config.address.startsWith("fe80::")) {
        hosts.add(config.address);
      }
    }
  }
  return [...hosts];
}
async function _findPort(ports, host) {
  for (const port of ports) {
    const r = await _tryPort(port, host);
    if (r) {
      return r;
    }
  }
}
function _fmtOnHost(hostname) {
  return hostname ? `on host ${JSON.stringify(hostname)}` : "on any host";
}
const HOSTNAME_RE = /^(?!-)[\d.:A-Za-z-]{1,63}(?<!-)$/;
function _validateHostname(hostname, _public, verbose) {
  if (hostname && !HOSTNAME_RE.test(hostname)) {
    const fallbackHost = _public ? "0.0.0.0" : "127.0.0.1";
    _log(
      verbose,
      `Invalid hostname: ${JSON.stringify(hostname)}. Using ${JSON.stringify(
        fallbackHost
      )} as fallback.`
    );
    return fallbackHost;
  }
  return hostname;
}

async function getPort(_userOptions = {}) {
  if (typeof _userOptions === "number" || typeof _userOptions === "string") {
    _userOptions = { port: Number.parseInt(_userOptions + "") || 0 };
  }
  const _port = Number(_userOptions.port ?? process.env.PORT);
  const _userSpecifiedAnyPort = Boolean(
    _userOptions.port || _userOptions.ports?.length || _userOptions.portRange?.length
  );
  const options = {
    name: "default",
    random: _port === 0,
    ports: [],
    portRange: [],
    alternativePortRange: _userSpecifiedAnyPort ? [] : [3e3, 3100],
    verbose: false,
    ..._userOptions,
    port: _port,
    host: _validateHostname(
      _userOptions.host ?? process.env.HOST,
      _userOptions.public,
      _userOptions.verbose
    )
  };
  if (options.random && !_userSpecifiedAnyPort) {
    return getRandomPort(options.host);
  }
  const portsToCheck = [
    options.port,
    ...options.ports,
    ..._generateRange(...options.portRange)
  ].filter((port) => {
    if (!port) {
      return false;
    }
    if (!isSafePort(port)) {
      _log(options.verbose, `Ignoring unsafe port: ${port}`);
      return false;
    }
    return true;
  });
  if (portsToCheck.length === 0) {
    portsToCheck.push(3e3);
  }
  let availablePort = await _findPort(portsToCheck, options.host);
  if (!availablePort && options.alternativePortRange.length > 0) {
    availablePort = await _findPort(
      _generateRange(...options.alternativePortRange),
      options.host
    );
    if (portsToCheck.length > 0) {
      let message = `Unable to find an available port (tried ${portsToCheck.join(
        "-"
      )} ${_fmtOnHost(options.host)}).`;
      if (availablePort) {
        message += ` Using alternative port ${availablePort}.`;
      }
      _log(options.verbose, message);
    }
  }
  if (!availablePort && _userOptions.random !== false) {
    availablePort = await getRandomPort(options.host);
    if (availablePort) {
      _log(options.verbose, `Using random port ${availablePort}`);
    }
  }
  if (!availablePort) {
    const triedRanges = [
      options.port,
      options.portRange.join("-"),
      options.alternativePortRange.join("-")
    ].filter(Boolean).join(", ");
    throw new GetPortError(
      `Unable to find an available port ${_fmtOnHost(
        options.host
      )} (tried ${triedRanges})`
    );
  }
  return availablePort;
}
async function getRandomPort(host) {
  const port = await checkPort(0, host);
  if (port === false) {
    throw new GetPortError(`Unable to find a random port ${_fmtOnHost(host)}`);
  }
  return port;
}
async function waitForPort(port, options = {}) {
  const delay = options.delay || 500;
  const retries = options.retries || 4;
  for (let index = retries; index > 0; index--) {
    if (await _tryPort(port, options.host) === false) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new GetPortError(
    `Timeout waiting for port ${port} after ${retries} retries with ${delay}ms interval.`
  );
}
async function checkPort(port, host = process.env.HOST, verbose) {
  if (!host) {
    host = _getLocalHosts([void 0, "0.0.0.0"]);
  }
  if (!Array.isArray(host)) {
    return _tryPort(port, host);
  }
  for (const _host of host) {
    const _port = await _tryPort(port, _host);
    if (_port === false) {
      if (port < 1024 && verbose) {
        _log(
          verbose,
          `Unable to listen to the privileged port ${port} ${_fmtOnHost(
            _host
          )}`
        );
      }
      return false;
    }
    if (port === 0 && _port !== 0) {
      port = _port;
    }
  }
  return port;
}

exports.checkPort = checkPort;
exports.getPort = getPort;
exports.getRandomPort = getRandomPort;
exports.isSafePort = isSafePort;
exports.isUnsafePort = isUnsafePort;
exports.waitForPort = waitForPort;
