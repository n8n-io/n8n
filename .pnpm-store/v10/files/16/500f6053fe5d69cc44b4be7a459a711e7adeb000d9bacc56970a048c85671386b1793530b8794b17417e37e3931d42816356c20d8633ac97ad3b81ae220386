const toml = require('toml');
const os = require('os');
const fs = require('fs');
const { validateOnlyUserReadWritePermissionAndOwner, generateChecksum } = require('../file_util');
const path = require('path');
const Logger = require('../logger');
const AuthenticationTypes = require('../authentication/authentication_types');
const Util = require('../util');

function defaultIfNotSet(value, defaultValue) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return defaultValue;
  } else {
    return value;
  }
}

function shouldReadTokenFromFile(fixedConfiguration) {
  return fixedConfiguration && fixedConfiguration.authenticator &&
    fixedConfiguration.authenticator.toUpperCase() === AuthenticationTypes.OAUTH_AUTHENTICATOR &&
    !Util.string.isNotNullOrEmpty(fixedConfiguration.token);
}

function readTokenFromFile(fixedConfiguration) {
  const tokenFilePath = fixedConfiguration.token_file_path ? fixedConfiguration.token_file_path : '/snowflake/session/token';
  const resolvedPath = fs.realpathSync(tokenFilePath);
  Logger.getInstance().trace('Token file path is : %s', tokenFilePath);
  validateOnlyUserReadWritePermissionAndOwner(resolvedPath);
  fixedConfiguration.token = fs.readFileSync(resolvedPath, 'utf-8').trim();
  if (!fixedConfiguration.token) {
    Logger.getInstance().error('The token does not exist or has empty value.');
    throw new Error('The token does not exist or has empty value');
  }
  const tokenChecksum = generateChecksum(fixedConfiguration.token);
  Logger.getInstance().info('Token used in connection has been read from file: %s. Checksum: %s', resolvedPath, tokenChecksum);
}

function loadConnectionConfiguration() {
  Logger.getInstance().trace('Loading connection configuration from the local files...');
  const snowflakeConfigDir = defaultIfNotSet(process.env.SNOWFLAKE_HOME, path.join(os.homedir(), '.snowflake'));
  Logger.getInstance().trace('Looking for connection file in directory %s', snowflakeConfigDir);
  const filePath = path.join(snowflakeConfigDir, 'connections.toml');
  const resolvedPath = fs.realpathSync(filePath);
  Logger.getInstance().trace('Connection configuration file found under the path %s. Validating file access.', resolvedPath);

  validateOnlyUserReadWritePermissionAndOwner(resolvedPath);
  const str = fs.readFileSync(resolvedPath, { encoding: 'utf8' });
  const configurationChecksum = generateChecksum(str);
  Logger.getInstance().info('Connection configuration file is read from path: %s. Checksum: %s', resolvedPath, configurationChecksum);
  Logger.getInstance().trace('Trying to parse the config file');
  const parsingResult = toml.parse(str);

  const configurationName = defaultIfNotSet(process.env.SNOWFLAKE_DEFAULT_CONNECTION_NAME, 'default');

  if (parsingResult[configurationName] !== undefined) {
    const fixedConfiguration = fixUserKey(parsingResult[configurationName]);
    if (shouldReadTokenFromFile(fixedConfiguration)) {
      Logger.getInstance().info('Trying to read token from config file.');
      readTokenFromFile(fixedConfiguration);
    }
    return fixedConfiguration;
  } else {
    Logger.getInstance().error('Connection configuration with name %s does not exist in the file %s', configurationName, resolvedPath);
    throw new Error(`Connection configuration with name ${configurationName} does not exist`);
  }
}

function fixUserKey(parsingResult) {
  Logger.getInstance().trace('Empty Username field will be filled with \'User\' field value.');
  if (parsingResult['username'] === undefined && parsingResult['user'] !== undefined){
    parsingResult['username'] = parsingResult['user'];
  }
  return parsingResult;
}

exports.loadConnectionConfiguration = loadConnectionConfiguration;
