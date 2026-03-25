const path = require('path');
const Logger = require('../../logger');
const fs = require('node:fs/promises');
const Util = require('../../util');
const os = require('os');
const crypto = require('crypto');
const { getSecureHandle, closeHandle } = require('../../file_util');

const defaultJsonTokenCachePaths = {
  'win32': ['AppData', 'Local', 'Snowflake', 'Caches'],
  'linux': ['.cache', 'snowflake'],
  'darwin': ['Library', 'Caches', 'Snowflake']
};

function JsonCredentialManager(credentialCacheDir, timeoutMs = 60000) {
  const tokenMapKey = 'tokens';
  const retryInterval = 100;

  this.hashKey = function (key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  };

  this.getTokenDirCandidates = function () {
    const candidates = [];
    candidates.push({ folder: credentialCacheDir, subfolders: [] });

    candidates.push({ folder: process.env.SF_TEMPORARY_CREDENTIAL_CACHE_DIR, subfolders: [] });

    switch (process.platform) {
    case 'win32':
      candidates.push({ folder: os.homedir(), subfolders: defaultJsonTokenCachePaths['win32'] });
      break;
    case 'linux':
      candidates.push({ folder: process.env.XDG_CACHE_HOME, subfolders: ['snowflake'] });
      candidates.push({ folder: process.env.HOME, subfolders: defaultJsonTokenCachePaths['linux'] });
      break;
    case 'darwin':
      candidates.push({ folder: process.env.HOME, subfolders: defaultJsonTokenCachePaths['darwin'] });
    }
    return candidates;
  };

  this.createCacheDir = async function (cacheDir) {
    const options = { recursive: true };
    if (process.platform !== 'win32') {
      options.mode = 0o755;
    }
    await fs.mkdir(cacheDir, options);
    if (process.platform !== 'win32') {
      await fs.chmod(cacheDir, 0o700);
    }
  };

  this.tryTokenDir = async function (dir, subDirs) {
    if (!Util.exists(dir)) {
      return false;
    }
    const cacheDir = path.join(dir, ...subDirs);
    try {
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) {
        Logger.getInstance().info(`Path ${dir} is not a directory`);
        return false;
      }
      const cacheStat = await fs.stat(cacheDir).catch(async (err) => {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        await this.createCacheDir(cacheDir);
        return await fs.stat(cacheDir);
      });
      if (!cacheStat.isDirectory()) {
        return false;
      }
      if (process.platform === 'win32') {
        return true;
      }

      if (cacheStat.uid !== os.userInfo().uid) {
        Logger.getInstance().warn(`Token cache directory ${cacheDir} has insecure owner.`);
      } else if ((cacheStat.mode & 0o777) !== 0o700) {
        Logger.getInstance().warn(`Token cache directory ${cacheDir} has insecure permissions.`);
      }
      return true;
    } catch (err) {
      Logger.getInstance().warn(`The location ${cacheDir} is invalid. Please check this location is accessible or existing`);
      return false;
    }
  };

  this.getTokenDir = async function () {
    const candidates = this.getTokenDirCandidates();
    for (const candidate of candidates) {
      const { folder: dir, subfolders: subDirs } = candidate;
      if (await this.tryTokenDir(dir, subDirs)) {
        return path.join(dir, ...subDirs);
      }
    }
    return null;
  };

  this.getTokenFilePath = async function () {
    const tokenDir = await this.getTokenDir();

    if (!Util.exists(tokenDir)) {
      throw new Error(`Temporary credential cache directory is invalid, and the driver is unable to use the default location. 
      Please set 'credentialCacheDir' connection configuration option to enable the default credential manager.`);
    }

    return path.join(tokenDir, 'credential_cache_v1.json');
  };
   
  this.readJsonCredentialFile = async function (fileHandle) {
    if (!Util.exists(fileHandle)) {
      return null;
    }
    try {
      const cred = await fileHandle.readFile('utf8');
      return JSON.parse(cred);
    } catch (err) {
      Logger.getInstance().warn('Failed to read token data from the file. Err: %s', err.message);
      return null;
    }
  };

  this.removeStale = async function (file) {
    const stat = await fs.stat(file).catch(() => {
      return undefined;
    });
    if (!Util.exists(stat)) {
      return;
    }
    if (new Date().getTime() - stat.birthtimeMs > timeoutMs) {
      try {
        await fs.rmdir(file);
      } catch (err) {
        Logger.getInstance().warn('Failed to remove stale file. Error: %s', err.message);
      }
    }

  };

  this.lockFile = async function (filename) {
    const lckFile = filename + '.lck';
    await this.removeStale(lckFile);
    let attempts = 1;
    let locked = false;
    const options = {};
    if (process.platform !== 'win32') {
      options.mode = 0o600;
    }
    while (attempts <= 10) {
      Logger.getInstance().debug('Attempting to get a lock on file %s, attempt: %d', filename, attempts);
      attempts++;
      await fs.mkdir(lckFile, options).then(() => {
        locked = true;
      }, () => {});
      if (locked) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    if (!locked) {
      Logger.getInstance().warn('Could not acquire lock on cache file %s', filename);
    }
    return locked;
  };

  this.unlockFile = async function (filename) {
    const lckFile = filename + '.lck';
    await fs.rmdir(lckFile);
  };

  this.withFileLocked = async function (fun) {
    const filename = await this.getTokenFilePath();
    if (await this.lockFile(filename)) {
      const res = await fun(filename);
      await this.unlockFile(filename);
      return res;
    }
    return null;
  };
  
  this.write = async function (key, token) {
    if (!validateTokenCacheOption(key)) {
      return null;
    }
    const keyHash = this.hashKey(key);

    await this.withFileLocked(async (filename) => {
      const fileHandle = await getSecureHandle(filename, fs.constants.O_RDWR | fs.constants.O_CREAT, fs);
      const jsonCredential = await this.readJsonCredentialFile(fileHandle) || {};
      if (!Util.exists(jsonCredential[tokenMapKey])) {
        jsonCredential[tokenMapKey] = {};
      }
      jsonCredential[tokenMapKey][keyHash] = token;

      try {
        await fileHandle.truncate();
        await fileHandle.write(JSON.stringify(jsonCredential), 0);
        await closeHandle(fileHandle);
      } catch (err) {
        Logger.getInstance().warn(`Failed to write token data in ${filename}. Please check the permission or the file format of the token. ${err.message}`);
      }
    });
  };
  
  this.read = async function (key) {
    if (!validateTokenCacheOption(key)) {
      return null;
    }

    const keyHash = this.hashKey(key);

    return await this.withFileLocked(async (filename) => {
      const fileHandle = await getSecureHandle(filename, fs.constants.O_RDWR, fs);
      const jsonCredential = await this.readJsonCredentialFile(fileHandle);
      await closeHandle(fileHandle);
      if (!!jsonCredential && jsonCredential[tokenMapKey] && jsonCredential[tokenMapKey][keyHash]) {
        return jsonCredential[tokenMapKey][keyHash];
      } else {
        return null;
      }
    });
  };
  
  this.remove = async function (key) {
    if (!validateTokenCacheOption(key)) {
      return null;
    }

    const keyHash = this.hashKey(key);

    await this.withFileLocked(async (filename) => {
      const fileHandle = await getSecureHandle(filename, fs.constants.O_RDWR, fs);
      const jsonCredential = await this.readJsonCredentialFile(fileHandle);

      if (jsonCredential && jsonCredential[tokenMapKey] && jsonCredential[tokenMapKey][keyHash]) {
        try {
          jsonCredential[tokenMapKey][keyHash] = null;
          await fileHandle.truncate();
          await fileHandle.write(JSON.stringify(jsonCredential), 0);
          await closeHandle(fileHandle);
        } catch (err) {
          Logger.getInstance().warn(`Failed to remove token data from the file in ${filename}. Please check the permission or the file format of the token. ${err.message}`);
        }
      }
    });
  };

  function validateTokenCacheOption(key) {
    return Util.checkParametersDefined(key); 
  }
}

module.exports.defaultJsonTokenCachePaths = defaultJsonTokenCachePaths;
module.exports.JsonCredentialManager = JsonCredentialManager;