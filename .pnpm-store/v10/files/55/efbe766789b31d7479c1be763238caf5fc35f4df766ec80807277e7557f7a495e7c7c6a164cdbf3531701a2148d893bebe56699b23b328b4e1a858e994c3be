const crypto = require('crypto');
const fs =  require('fs');
const fsPromises = require('node:fs/promises');
const path = require('path');
const struct = require('python-struct');
const zlib = require('zlib');
const os = require('os');
const glob = require('glob');
const Logger = require('./logger');

const resultStatus = {
  ERROR: 'ERROR',
  UPLOADED: 'UPLOADED',
  DOWNLOADED: 'DOWNLOADED',
  COLLISION: 'COLLISION',
  SKIPPED: 'SKIPPED',
  RENEW_TOKEN: 'RENEW_TOKEN',
  RENEW_PRESIGNED_URL: 'RENEW_PRESIGNED_URL',
  NOT_FOUND_FILE: 'NOT_FOUND_FILE',
  NEED_RETRY: 'NEED_RETRY',
  NEED_RETRY_WITH_LOWER_CONCURRENCY: 'NEED_RETRY_WITH_LOWER_CONCURRENCY'
};

exports.resultStatus = resultStatus;

// File Header
function FileHeader(digest, contentLength, encryptionMetadata) {
  return {
    'digest': digest,
    'contentLength': contentLength,
    'encryptionMetadata': encryptionMetadata
  };
}

exports.FileHeader = FileHeader;

/**
 * Creates a file utility object.
 *
 * @returns {Object}
 * @constructor
 */
function FileUtil() {
  /**
  * Compress file with GZIP.
  *
  * @param {String} fileName
  * @param {String} tmpDir
  *
  * @returns {Object}
  */
  this.compressFileWithGZIP = async function (fileName, tmpDir) {
    // Set file name and path for compressed file
    const baseName = path.basename(fileName);
    const gzipFileName = path.join(tmpDir, baseName + '_c.gz');

    await new Promise(function (resolve) {
      // Create gzip object
      const gzip = zlib.createGzip();
      // Create stream object for reader and writer
      const reader = fs.createReadStream(fileName);
      const writer = fs.createWriteStream(gzipFileName);
      // Write and compress file
      const result = reader.pipe(gzip).pipe(writer);
      result.on('finish', function () {
        resolve();
      });
    });

    await this.normalizeGzipHeader(gzipFileName);

    const fileInfo = fs.statSync(gzipFileName);

    return {
      name: gzipFileName,
      size: fileInfo.size
    };
  };

  /**
  * Normalize the header by removing the timestamp.
  * Note: GZIP in python includes the file name when compressing but
  * nodejs does not so there is no need to remove it here.
  * 
  * @param {String} gzipFileName
  *
  * @returns {null}
  */
  this.normalizeGzipHeader = async function (gzipFileName) {
    const fd = fs.openSync(gzipFileName, 'rs+');

    // Reset the timestamp in gzip header
    // Write at position 4
    fs.writeSync(fd, struct.pack('<L', 0), 0, 1, 4);

    fs.closeSync(fd);
  };

  /**
  * Get file digest and size.
  *
  * @param {String} fileName
  *
  * @returns {Object}
  */
  this.getDigestAndSizeForFile = async function (fileName) {
    const chunkSize = 16 * 4 * 1024;

    const fileInfo = fs.statSync(fileName);
    const bufferSize = fileInfo.size;

    let buffer = [];
    await new Promise(function (resolve) {
      // Create reader stream and set maximum chunk size
      const infile = fs.createReadStream(fileName, { highWaterMark: chunkSize });
      infile.on('data', function (chunk) {
        buffer.push(chunk);
      });
      infile.on('close', function () {
        buffer = Buffer.concat(buffer);
        resolve();
      });
    });

    const hash = crypto.createHash('sha256')
      .update(buffer)
      .digest('base64');

    return {
      digest: hash,
      size: bufferSize
    };
  };
}
exports.FileUtil = FileUtil;

exports.getMatchingFilePaths = function (dir, fileName) {
  const pathWithWildcard = path.join(dir, fileName);
  const pathWithWildcardDependsOnPlatform = os.platform() === 'win32'
    ? pathWithWildcard.replace(/\\/g, '/')
    : pathWithWildcard;
  return glob.sync(pathWithWildcardDependsOnPlatform);
};


/**
 * Checks if the provided file or directory is writable only by the user and os that file owner is the same as os user. FsPromises can be provided.
 * @param filePath
 * @param expectedMode
 * @param fsPromises
 * @returns {Promise<boolean>} resolves always to true for Windows
 */
exports.validateOnlyUserReadWritePermissionAndOwner = async function (filePath, fsPromises) {
  const fsp = fsPromises ? fsPromises : require('fs/promises');
  if (os.platform() === 'win32') {
    return;
  }
  try {
    const stats = await fsp.stat(filePath);
    const mode = stats.mode;
    const permission = mode & 0o777;

    //This should be 600 permission, which means the file permission has not been changed by others.
    const octalPermissions = permission.toString(8);
    if (octalPermissions === '600') {
      Logger.getInstance().debug(`Validated that the user has only read and write permission for file: ${filePath}, Permission: ${permission}`);
    } else {
      throw new Error(`Invalid file permissions (${octalPermissions} for file ${filePath}). Make sure you have read and write permissions and other users do not have access to it. Please remove the file and re-run the driver.`);
    }

    const userInfo = os.userInfo();
    if (stats.uid === userInfo.uid) {
      Logger.getInstance().debug('Validated file owner');
    } else {
      throw new Error(`Invalid file owner for file ${filePath}). Make sure the system user is the owner of the file otherwise please remove the file and re-run the driver.`);
    }
  } catch (err) {
    //When file doesn't exist - return
    if (err.code === 'ENOENT') {
      return;
    } else {
      throw err;
    }
  }
};

/**
 * Checks if the provided file is writable only by the user and os that file owner is the same as os user. FsPromises can be provided.
 * @param filePath
 * @param expectedMode
 * @param fsPromises
 * @returns {Promise<FileHandle>}
 */
exports.getSecureHandle = async function (filePath, flags, fsPromises) {
  const fsp = fsPromises ? fsPromises : require('fs/promises');
  try {
    const fileHandle = await fsp.open(filePath, flags, 0o600);
    if (os.platform() === 'win32') {
      return fileHandle;
    }
    const stats = await fileHandle.stat();
    const mode = stats.mode;
    const permission = mode & 0o777;

    //This should be 600 permission, which means the file permission has not been changed by others.
    if (permission === 0o600) {
      Logger.getInstance().debug(`Validated that the user has only read and write permission for file: ${filePath}, Permission: ${permission}`);
    } else {
      throw new Error(`Invalid file permissions (${permission.toString(8)} for file ${filePath}). Make sure you have read and write permissions and other users do not have access to it. Please remove the file and re-run the driver.`);
    }

    const userInfo = os.userInfo();
    if (stats.uid === userInfo.uid) {
      Logger.getInstance().debug('Validated file owner');
    } else {
      throw new Error(`Invalid file owner for file ${filePath}). Make sure the system user is the owner of the file otherwise please remove the file and re-run the driver.`);
    }
    return fileHandle;
  } catch (err) {
    //When file doesn't exist - return
    if (err.code === 'ENOENT') {
      return null;
    } else {
      throw err;
    }
  }
};

exports.closeHandle = async function (fileHandle) {
  if (fileHandle !== undefined && fileHandle !== null) {
    await fileHandle.close();
  }
};

/**
 * Checks if the provided file or directory permissions are correct.
 * @param filePath
 * @param expectedMode
 * @param fsPromises
 * @returns {Promise<boolean>} resolves always to true for Windows
 */
exports.isFileModeCorrect = async function (filePath, expectedMode, fsPromises) {
  if (os.platform() === 'win32') {
    return true;
  }
  return await fsPromises.stat(filePath).then((stats) => {
    // we have to limit the number of LSB bits to 9 with the mask, as the stats.mode starts with the file type,
    // e.g. the directory with permissions 755 will have stats.mask of 40755.
    const mask = (1 << 9) - 1;
    return (stats.mode & mask) === expectedMode;
  });
};

/**
 * Checks if the provided file or directory is writable only by the user.
 * @param configFilePath
 * @param fsPromises
 * @returns {Promise<boolean>} resolves always to true for Windows
 */
exports.isFileNotWritableByGroupOrOthers = async function (configFilePath, fsPromises) {
  if (os.platform() === 'win32') {
    return true;
  }
  const stats = await fsPromises.stat(configFilePath);
  return (stats.mode & (1 << 4)) === 0 && (stats.mode & (1 << 1)) === 0;
};

/**
 * Generate checksum for given text. The algorithm and encoding can be provided.
 * @param text
 * @param algorithm
 * @param encoding
 * @returns {Promise<String>} resolves always to true for Windows
 */
exports.generateChecksum = function (text, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'sha256')
    .update(text, 'utf8')
    .digest(encoding || 'hex')
    .substring(0, 32); 
};

exports.IsFileExisted = async function (filePath) {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};