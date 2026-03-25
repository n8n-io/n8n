const Logger = require('./logger');
const Errors = require('./errors');
const Util = require('./util');
const GlobalConfig = require('./global_config');
const LoggingUtil = require('./logger/logging_util');
const ErrorCodes = Errors.codes;

/**
 * @typedef {object} Proxy
 * @property {string} host - The host address of the proxy.
 * @property {string} protocol - The protocol used by the proxy (e.g., "http" or "https")
 * @property {string} user - The username for the proxy
 * @property {number} port - The port number.
 * @property {string} password - The password for the proxy
 * @property {string} noProxy -  Optional list of domains that should bypass the prox
 */

/**
* remove http:// or https:// from the input, e.g. used with proxy URL
* @param input
* @returns {string}
*/
exports.removeScheme = function (input) {
  return input.toString().replace(/(^\w+:|^)\/\//, '');
};

/**
 * Try to get the PROXY environmental variables
 * On Windows, envvar name is case-insensitive, but on *nix, it's case-sensitive
 *
 * Compare them with the proxy specified on the Connection, if any
 * Return with the log constructed from the components detection and comparison
 * If there's something to warn the user about, return that too
 *
 * @param {Proxy} agentOptions from agent creation
 * @returns {{messages: string, warnings: string}} log messages
 */
exports.getCompareAndLogEnvAndAgentProxies = function (agentOptions) {
  const envProxy = {};
  const logMessages = { 'messages': '', 'warnings': '' };
  envProxy.httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  envProxy.httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  envProxy.noProxy = process.env.no_proxy || process.env.NO_PROXY;
  
  envProxy.logHttpProxy = envProxy.httpProxy ?
    'HTTP_PROXY: ' + envProxy.httpProxy : 'HTTP_PROXY: <unset>';
  envProxy.logHttpsProxy = envProxy.httpsProxy ?
    'HTTPS_PROXY: ' + envProxy.httpsProxy : 'HTTPS_PROXY: <unset>';
  envProxy.logNoProxy = envProxy.noProxy ?
    'NO_PROXY: ' + envProxy.noProxy : 'NO_PROXY: <unset>';
  
  // log PROXY envvars
  if (envProxy.httpProxy || envProxy.httpsProxy) {
    logMessages.messages = logMessages.messages + ' // PROXY environment variables: '
        + `${envProxy.logHttpProxy} ${envProxy.logHttpsProxy} ${envProxy.logNoProxy}.`;
  }
  
  // log proxy config on Connection, if any set
  if (agentOptions.host) {
    const proxyHostAndPort = agentOptions.host + ':' + agentOptions.port;
    const proxyProtocolHostAndPort = agentOptions.protocol ?
      ' protocol=' + agentOptions.protocol + ' proxy=' + proxyHostAndPort
      : ' proxy=' + proxyHostAndPort;
    const proxyUsername = agentOptions.user ? ' user=' + agentOptions.user : '';
    const proxyString = `${Util.exists(agentOptions.user) ? `${agentOptions.user}:${agentOptions.password}@` : ''}${proxyHostAndPort}`.toLowerCase();
    logMessages.messages = logMessages.messages + ` // Proxy configured in Agent:${proxyProtocolHostAndPort}${proxyUsername}`;
  
    // check if both the PROXY envvars and Connection proxy config is set
    // generate warnings if they are, and are also different
    if (envProxy.httpProxy &&
            this.removeScheme(envProxy.httpProxy).toLowerCase() !== proxyString.toLowerCase()) {
      logMessages.warnings = logMessages.warnings + ` Using both the HTTP_PROXY (${this.describeProxy(this.getProxyFromEnv(false))})`
            + ` and the Connection proxy (${this.describeProxy(agentOptions)}), but with different values.`
            + ' If you experience connectivity issues, try unsetting one of them.';
    }
    if (envProxy.httpsProxy && this.removeScheme(envProxy.httpsProxy).toLowerCase() !== proxyString.toLowerCase()) {
      logMessages.warnings = logMessages.warnings + ` Using both the HTTPS_PROXY (${this.describeProxy(this.getProxyFromEnv(true))})`
            + ` and the Connection proxy (${this.describeProxy(agentOptions)}) settings to connect, but with different values.`
            + ' If you experience connectivity issues, try unsetting one of them.';
    }
  }
  logMessages.messages = logMessages.messages ? logMessages.messages : ' none.';
  
  return logMessages;
};

/**
 * Validate whether the proxy object has the appropriate information
 *
 * @param {Proxy} proxy
 * @returns {Proxy}
 */
exports.validateProxy = function (proxy) {
  const { host, port, noProxy, user, password } = proxy;
  // check for missing proxyHost
  Errors.checkArgumentExists(Util.exists(host),
    ErrorCodes.ERR_CONN_CREATE_MISSING_PROXY_HOST);
  
  // check for invalid proxyHost
  Errors.checkArgumentValid(Util.isString(host),
    ErrorCodes.ERR_CONN_CREATE_INVALID_PROXY_HOST);
  
  // check for missing proxyPort
  Errors.checkArgumentExists(Util.exists(port),
    ErrorCodes.ERR_CONN_CREATE_MISSING_PROXY_PORT);
  
  // check for invalid proxyPort
  Errors.checkArgumentValid(Util.isNumber(port),
    ErrorCodes.ERR_CONN_CREATE_INVALID_PROXY_PORT);
  
  if (Util.exists(noProxy)) {
    // check for invalid noProxy
    Errors.checkArgumentValid(Util.isString(noProxy),
      ErrorCodes.ERR_CONN_CREATE_INVALID_NO_PROXY);
  }
  
  if (Util.exists(user) || Util.exists(password)) {
    // check for missing proxyUser
    Errors.checkArgumentExists(Util.exists(user),
      ErrorCodes.ERR_CONN_CREATE_MISSING_PROXY_USER);
  
    // check for invalid proxyUser
    Errors.checkArgumentValid(Util.isString(user),
      ErrorCodes.ERR_CONN_CREATE_INVALID_PROXY_USER);
  
    // check for missing proxyPassword
    Errors.checkArgumentExists(Util.exists(password),
      ErrorCodes.ERR_CONN_CREATE_MISSING_PROXY_PASS);
  
    // check for invalid proxyPassword
    Errors.checkArgumentValid(Util.isString(password),
      ErrorCodes.ERR_CONN_CREATE_INVALID_PROXY_PASS);
  
  } else {
    delete proxy.user;
    delete proxy.password;
  }
};

/**
 * Obtain the proxy information from the environment variable.
 *
 * @param {boolean} isHttps 
 * @returns {Proxy}
 */
exports.getProxyFromEnv = function (isHttps = true) {
  const getDefaultPortIfNotSet = (proxyFromEnv) => {
    const isProxyProtocolHttps = proxyFromEnv.protocol === 'https:';
    if (!proxyFromEnv.port) {
      return isProxyProtocolHttps ? 443 : 80;
    } else {
      return proxyFromEnv.port;
    }
  };
  
  const protocol = isHttps ? 'https' : 'http';
  let proxyFromEnv = Util.getEnvVar(`${protocol}_proxy`);
  if (!proxyFromEnv){
    return null;
  }
  
  Logger.getInstance().debug(`Util.getProxyEnv: Using ${protocol.toUpperCase()}_PROXY from the environment variable`);
  if (proxyFromEnv.indexOf('://') === -1) {
    Logger.getInstance().info('Util.getProxyEnv: the protocol was missing from the environment proxy. Use the HTTP protocol.');
    proxyFromEnv = 'http' + '://' + proxyFromEnv;
  }
  proxyFromEnv = new URL(proxyFromEnv);
  const port = getDefaultPortIfNotSet(proxyFromEnv);
  const proxy = {
    host: Util.validateEmptyString(proxyFromEnv.hostname),
    port: Number(port),
    user: Util.validateEmptyString(proxyFromEnv.username),
    password: Util.validateEmptyString(proxyFromEnv.password),
    protocol: Util.validateEmptyString(proxyFromEnv.protocol),
    noProxy: this.getNoProxyEnv(),
  };
  this.validateProxy(proxy);
  return proxy;
};

/**
 * Obtain the no proxy information from the environment variable.
 * 
 * @returns {string | undefined}
 */  
exports.getNoProxyEnv = function () {
  const noProxy = Util.getEnvVar('no_proxy');
  if (noProxy) {
    return noProxy.split(',').join('|');
  }
  return undefined;
};

/**
 * Extract the host from the destination URL to check whether the same agent already exists or not.
 *
 * @param {string} destination
 * @returns {string} 
 */  
exports.getHostFromURL = function (destination) {
  if (destination.indexOf('://') === -1) {
    destination = 'https' + '://' + destination;
  }
  
  try {
    return new URL(destination).hostname;
  } catch (err) {
    Logger.getInstance().error(`Failed to parse the destination to URL with the error: ${err}. Return destination as the host: ${destination}`);
    return destination;
  }
};

/**
 * if proxy exists, return the proxy. If not and the useEnvProxy is true, return the proxy from the environment variable.
 * @param {Proxy} proxy
 * @param {string} moduleName
 * @param {string} isHttp
 *
 * @returns {Proxy}
 */ 
exports.getProxy = function (proxy, moduleName, isHttps) {
  if (!proxy && GlobalConfig.isEnvProxyActive()) {
    proxy = this.getProxyFromEnv(isHttps);
    if (proxy) {
      Logger.getInstance().debug(`${moduleName} loads the proxy info from the environment variable host: ${proxy.host}`);
    }
  }
  return proxy;
};

/**
 * The proxy configuration fields in Azure are different from the proxy fields in the snowflake node.js driver.
 * Because of that, this function converts the snowflake proxy info to the Azure proxy info.
 * @param {Proxy} proxy
 * @returns {{host:string, port:number, user?:string, password?:string}}}
 */ 
exports.getAzureProxy = function (proxy) {
  const AzureProxy = {
    ...proxy, host: `${proxy.protocol}${(proxy.protocol).endsWith(':') ? '' : ':'}//${proxy.host}`, 
  };
  delete AzureProxy.noProxy;
  delete AzureProxy.protocol;

  if (!Util.exists(AzureProxy.user) || !Util.exists(AzureProxy.password)) {
    delete AzureProxy.user;
    delete AzureProxy.password;
  }
  return AzureProxy;
};

/**
 * Currently, there is no way to disable loading the proxy information from the environment path in Azure/blob.
 * To control this proxy option on the driver side, A temporary workaround is hide(remove) the environment proxy from the process
 * when the client is created (At this time, the client loads the proxy from the environment variables internally). 
 * After the client is created, restore them with the 'restoreEnvironmentProxy' function.
 */
let envProxyList;
const proxyEnvList = ['http_proxy', 'https_proxy', 'no_proxy'];
exports.hideEnvironmentProxy = function () {
  if (GlobalConfig.isEnvProxyActive()) {
    return;
  }
  Logger.getInstance().debug('As the useEnvProxy option is disabled, the proxy environment variables are temporarily hidden during the creation of an Azure client');
  envProxyList = [];
  for (const envVar of proxyEnvList) {
    saveProxyInfoInList(envVar);
    if (!Util.isWindows()) {
      saveProxyInfoInList(envVar.toUpperCase());
    }
  }
};

function saveProxyInfoInList(envVar) {
  const proxyEnv = process.env[envVar];
  envProxyList.push(process.env[envVar]);
  delete process.env[envVar];

  if (Util.exists(proxyEnv)) {
    Logger.getInstance().debug(`Temporarily exclude ${envVar} from the environment variable value: ${proxyEnv}`);
  } else {
    Logger.getInstance().debug(`${envVar} was not defined, nothing to do`);
  }
}

exports.restoreEnvironmentProxy = function () {
  if (GlobalConfig.isEnvProxyActive()) {
    return;
  }

  const iterator = envProxyList[Symbol.iterator]();
  let nextValue = iterator.next().value;
  for (const envVar of proxyEnvList) {
    if (Util.exists(nextValue)) {
      Logger.getInstance().debug(`The ${envVar} value exists with the value: ${nextValue} Restore back the proxy environment variable values`);
      process.env[envVar] = nextValue;
    }
    nextValue = iterator.next().value;

    if (!Util.isWindows()) {
      if (Util.exists(nextValue)) {
        Logger.getInstance().debug(`The ${envVar.toUpperCase()} value exists with the value: ${nextValue} Restore back the proxy environment variable values (for Non-Windows machine)`);
        process.env[envVar.toUpperCase()] = nextValue;
      }
      nextValue = iterator.next().value;
    }
  }
  Logger.getInstance().debug('An Azure client has been created. Restore back the proxy environment variable values');
};

/**
 * Provide the details of the proxy info.
 * @param proxy
 * @returns {string} 
 */
exports.describeProxy = function (proxy) {
  if (Util.exists(proxy)) {
    return `proxyHost: ${proxy.host}, proxyPort: ${proxy.port}, ` +
  `${Util.exists(proxy.user) ? `proxyUser: ${proxy.user}, proxyPassword is ${LoggingUtil.describePresence(proxy.password)}, ` : ''}` + 
  `proxyProtocol: ${proxy.protocol}, noProxy: ${proxy.noProxy}`;
  } else {
    return 'proxy was not configured';
  }
};

/**
 * Make the proxy string with the proxy info (json format)
 * @param proxy
 * @returns {string} 
 */
exports.stringifyProxy = function (proxy) {
  if (Util.isEmptyObject(proxy)) {
    return null;
  }
  return `${(proxy.protocol).startsWith('https') ? 'https' : 'http'}://` + 
  `${Util.exists(proxy.user) ? `${proxy.user}:${proxy.password}@` : ''}` +
  `${proxy.host}:${proxy.port}`;
};