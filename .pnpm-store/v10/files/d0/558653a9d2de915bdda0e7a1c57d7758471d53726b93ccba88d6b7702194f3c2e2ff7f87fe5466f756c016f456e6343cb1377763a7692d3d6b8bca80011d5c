import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';

const unsafePorts = /* @__PURE__ */ new Set([
  1,
  7,
  9,
  11,
  13,
  15,
  17,
  19,
  20,
  21,
  22,
  23,
  25,
  37,
  42,
  43,
  53,
  69,
  77,
  79,
  87,
  95,
  101,
  102,
  103,
  104,
  109,
  110,
  111,
  113,
  115,
  117,
  119,
  123,
  135,
  137,
  139,
  143,
  161,
  179,
  389,
  427,
  465,
  512,
  513,
  514,
  515,
  526,
  530,
  531,
  532,
  540,
  548,
  554,
  556,
  563,
  587,
  601,
  636,
  989,
  990,
  993,
  995,
  1719,
  1720,
  1723,
  2049,
  3659,
  4045,
  5060,
  5061,
  6e3,
  6566,
  6665,
  6666,
  6667,
  6668,
  6669,
  6697,
  10080
]);
function isUnsafePort(port) {
  return unsafePorts.has(port);
}
function isSafePort(port) {
  return !isUnsafePort(port);
}

function log(...arguments_) {
  console.log("[get-port]", ...arguments_);
}
async function getPort(config = {}) {
  if (typeof config === "number" || typeof config === "string") {
    config = { port: Number.parseInt(config + "") || 0 };
  }
  const options = {
    name: "default",
    random: false,
    ports: [],
    portRange: [],
    alternativePortRange: config.port ? [] : [3e3, 3100],
    host: void 0,
    verbose: false,
    ...config,
    port: config.port || Number.parseInt(process.env.PORT || "") || 3e3
  };
  if (options.random) {
    return getRandomPort(options.host);
  }
  const portsToCheck = [
    options.port,
    ...options.ports,
    ...generateRange(...options.portRange)
  ].filter((port) => {
    if (!port) {
      return false;
    }
    if (!isSafePort(port)) {
      if (options.verbose) {
        log("Ignoring unsafe port:", port);
      }
      return false;
    }
    return true;
  });
  let availablePort = await findPort(
    portsToCheck,
    options.host,
    options.verbose,
    false
  );
  if (!availablePort) {
    availablePort = await findPort(
      generateRange(...options.alternativePortRange),
      options.host,
      options.verbose
    );
    if (options.verbose) {
      log(
        `Unable to find an available port (tried ${portsToCheck.join(", ") || "-"}). Using alternative port:`,
        availablePort
      );
    }
  }
  return availablePort;
}
async function getRandomPort(host) {
  const port = await checkPort(0, host);
  if (port === false) {
    throw new Error("Unable to obtain an available random port number!");
  }
  return port;
}
async function waitForPort(port, options = {}) {
  const delay = options.delay || 500;
  const retries = options.retries || 4;
  for (let index = retries; index > 0; index--) {
    if (await checkPort(port, options.host) === false) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(
    `Timeout waiting for port ${port} after ${retries} retries with ${delay}ms interval.`
  );
}
async function checkPort(port, host = process.env.HOST, _verbose) {
  if (!host) {
    host = getLocalHosts([void 0, "0.0.0.0"]);
  }
  if (!Array.isArray(host)) {
    return _checkPort(port, host);
  }
  for (const _host of host) {
    const _port = await _checkPort(port, _host);
    if (_port === false) {
      if (port < 1024 && _verbose) {
        log("Unable to listen to priviliged port:", `${_host}:${port}`);
      }
      return false;
    }
    if (port === 0 && _port !== 0) {
      port = _port;
    }
  }
  return port;
}
function generateRange(from, to) {
  if (to < from) {
    return [];
  }
  const r = [];
  for (let index = from; index < to; index++) {
    r.push(index);
  }
  return r;
}
function _checkPort(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.on("error", (error) => {
      if (error.code === "EINVAL" || error.code === "EADDRNOTAVAIL") {
        resolve(port !== 0 && isSafePort(port) && port);
      } else {
        resolve(false);
      }
    });
    server.listen({ port, host }, () => {
      const { port: port2 } = server.address();
      server.close(() => {
        resolve(isSafePort(port2) && port2);
      });
    });
  });
}
function getLocalHosts(additional) {
  const hosts = new Set(additional);
  for (const _interface of Object.values(networkInterfaces())) {
    for (const config of _interface || []) {
      hosts.add(config.address);
    }
  }
  return [...hosts];
}
async function findPort(ports, host, _verbose = false, _random = true) {
  for (const port of ports) {
    const r = await checkPort(port, host, _verbose);
    if (r) {
      return r;
    }
  }
  if (_random) {
    const randomPort = await getRandomPort(host);
    if (_verbose) {
      log(
        `Unable to find an available port (tried ${ports.join(", ") || "-"}). Using random port:`,
        randomPort
      );
    }
    return randomPort;
  } else {
    return 0;
  }
}

export { checkPort, getPort, getRandomPort, isSafePort, isUnsafePort, waitForPort };
