const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');
const Errors = require('./errors');
const ErrorCodes = Errors.codes;
const Util = require('./util');
const Logger = require('./logger');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

let disableOCSPChecks = false;

/**
 * Updates the value of the 'disableOCSPChecks' parameter.
 *
 * @param {boolean} value
 */
exports.setDisableOCSPChecks = function (value) {
  // validate input
  Errors.assertInternal(Util.isBoolean(value));

  disableOCSPChecks = value;
};

/**
 * Returns the value of the 'disableOCSPChecks' parameter.
 *
 * @returns {boolean}
 */
exports.isOCSPChecksDisabled = function () {
  return disableOCSPChecks;
};

let ocspFailOpen = true;
exports.ocspFailOpen = ocspFailOpen;

/**
 * Updates the value of the 'ocspFailOpen' parameter.
 *
 * @param {boolean} value
 */
exports.setOcspFailOpen = function (value) {
  // validate input
  Errors.assertInternal(Util.isBoolean(value));

  ocspFailOpen = value;
};

/**
 * Returns the value of the 'ocspFailOpen' parameter.
 *
 * @param {boolean} value
 */
exports.getOcspFailOpen = function () {
  return ocspFailOpen;
};

const ocspModes = {
  FAIL_CLOSED: 'FAIL_CLOSED',
  FAIL_OPEN: 'FAIL_OPEN',
  INSECURE: 'INSECURE'
};
exports.ocspModes = ocspModes;

/**
 * Returns the OCSP mode
 *
 * @returns {string}
 */
exports.getOcspMode = function () {
  if (disableOCSPChecks) {
    return ocspModes.INSECURE;
  } else if (!ocspFailOpen) {
    return ocspModes.FAIL_CLOSED;
  }
  return ocspModes.FAIL_OPEN;
};

/**
 * Returns the upper limit for number of entries we can have in the OCSP response cache.
 *
 * @returns {number}
 */
exports.getOcspResponseCacheSizeLimit = function () {
  return 1000;
};

/**
 * Returns the maximum time in seconds that entries can live in the OCSP
 * response cache.
 *
 * @returns {number}
 */
exports.getOcspResponseCacheMaxAge = function () {
  // 24 hours, in seconds
  // It was in millionseconds before but the timestamp we save in
  // cache file was in seconds. Compare that with max age in millionseconds
  // would makes the cache never expire.
  // change max age here because customer would have local cache file exist
  // already and we need to keep that valid with new version of the driver.
  // use small value for test only
  let maxage = Number(process.env.SF_OCSP_TEST_CACHE_MAXAGE) || 86400;
  if ((maxage > 86400) || (maxage <= 0)) {
    maxage = 86400;
  }
  return maxage;
};

/**
 * Creates a cache directory.
 *
 * @returns {string}
 */
exports.mkdirCacheDir = function () {
  let cacheRootDir = process.env.SF_OCSP_RESPONSE_CACHE_DIR;
  if (!Util.exists(cacheRootDir)) {
    cacheRootDir = os.homedir();
  }
  if (!Util.exists(cacheRootDir)) {
    cacheRootDir = os.tmpdir(); // fallback to TMP if user home doesn't exist.
  }

  let cacheDir;
  const platform = os.platform();
  if (platform === 'darwin') {
    cacheDir = path.join(cacheRootDir, 'Library', 'Caches', 'Snowflake');
  } else if (platform === 'win32') {
    cacheDir = path.join(cacheRootDir, 'AppData', 'Local', 'Snowflake', 'Caches');
  } else {
    // linux
    cacheDir = path.join(cacheRootDir, '.cache', 'snowflake');
  }
  try {
    mkdirp.sync(cacheDir);
  } catch (e) {
    Logger.getInstance().debug('Failed to create a cache directory %s, err: %s', cacheDir, e);
  }
  return cacheDir;
};

const rest = {
  HTTPS_PORT: 443,
  HTTPS_PROTOCOL: 'https'
};
exports.rest = rest;

// The default JSON parser
exports.jsonColumnVariantParser = rawColumnValue => new Function(`return (${rawColumnValue});`)();

/**
 * Updates the value of the 'jsonColumnVariantParser' parameter.
 *
 * @param {function: (rawColumnValue: string) => any} value
 */
exports.setJsonColumnVariantParser = function (value){
  // validate input
  Errors.assertInternal(Util.isFunction(value));

  exports.jsonColumnVariantParser = value;
};

/**
 * As a default we set parameters values identical like in fast-xml-parser lib defaults
 * thus preserving backward compatibility if customer doesn't set custom configuration
 * and give possibility to set only part of parameters
 */
const defaultXmlParserConfiguration = {
  ignoreAttributes: true,
  alwaysCreateTextNode: false,
  attributeNamePrefix: '@_',
  attributesGroupName: false
};

// The default XML parser
exports.xmlColumnVariantParser = createXmlColumnVariantParser(defaultXmlParserConfiguration);

/**
 * Updates the value of the 'xmlColumnVariantParser' parameter.
 * Return fucntion with custom XmlParser configuration or default if not set.
 *
 * @param {function: (rawColumnValue: string) => any} value
 */
exports.setXmlColumnVariantParser = function (value){
  // validate input
  Errors.assertInternal(Util.isFunction(value));

  exports.xmlColumnVariantParser = value;
};
/**
 * Create and update the 'xmlColumnVariantParser' parameter using custom parser configuration.
 *
 * @param {function: (rawColumnValue: string) => any} params
 */
exports.createXmlColumnVariantParserWithParameters = function (params){
  exports.xmlColumnVariantParser = createXmlColumnVariantParser(params);
};

/**
 * Create function to parse XML using XMlParser with custom configuration.
 * Parametrs that you can override:
 *  ignoreAttributes: true,
 *  attributeNamePrefix: '@_',
 *  attributesGroupName: false,
 *  alwaysCreateTextNode: false
 *
 * @param {object} config
 */
function createXmlColumnVariantParser(config) {
  let parserConfiguration;
  if (!Util.isObject(config)) {
    parserConfiguration = defaultXmlParserConfiguration;
  } else {
    parserConfiguration = {
      ignoreAttributes: Util.exists(config.ignoreAttributes) ? config.ignoreAttributes : defaultXmlParserConfiguration.ignoreAttributes,
      attributeNamePrefix: Util.exists(config.attributeNamePrefix) ? config.attributeNamePrefix : defaultXmlParserConfiguration.attributeNamePrefix,
      //For attributesGroupName null value is acceptable and mean no grouping
      attributesGroupName: config.attributesGroupName !== undefined ? config.attributesGroupName : defaultXmlParserConfiguration.attributesGroupName,
      alwaysCreateTextNode: Util.exists(config.alwaysCreateTextNode) ? config.alwaysCreateTextNode : defaultXmlParserConfiguration.alwaysCreateTextNode,
    };
  }
  return rawColumnValue => {
    // check if raw string is in XML format
    // ensure each tag is enclosed and all attributes and elements are valid
    // XMLValidator.validate returns true if valid, returns an error if invalid
    const validateResult = XMLValidator.validate(rawColumnValue);
    if (validateResult === true) {
      // use XML parser
      return new XMLParser(parserConfiguration).parse(rawColumnValue);
    } else {
      throw new Error(validateResult.err.msg);
    }
  };
}

let keepAlive = true;

/**
 * Updates the value of the 'keepAlive' parameter.
 *
 * @param {boolean} value
 */
exports.setKeepAlive = function (value) {
  Errors.assertInternal(Util.isBoolean(value));
  keepAlive = value;
};

/**
 * Returns the overriden value of 'keepAlive' or default if not set. Default value is true
 *
 * @param {boolean} value
 */
exports.getKeepAlive = function () {
  return keepAlive;
};

let credentialManager = null;

exports.setCustomCredentialManager = function (customCredentialManager) {
  Errors.checkArgumentValid(Util.checkValidCustomCredentialManager(customCredentialManager),
    ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_CUSTOM_CREDENTIAL_MANAGER);
  
  credentialManager =  customCredentialManager;
  Logger.getInstance().info('Custom credential manager is set by a user.');
};

exports.getCredentialManager = function () { 
  return credentialManager;  
};

let envProxy = true;
exports.setEnvProxy = function (value) {
  Errors.assertInternal(Util.isBoolean(value));
  envProxy = value;
};

exports.isEnvProxyActive = function () {
  return envProxy;
};

let customRedirectingClient;
exports.setCustomRedirectingClient = function (value) {
  customRedirectingClient = value;
};

exports.getCustomRedirectingClient = function () {
  return customRedirectingClient;
};