const path = require('path');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const Logger = require('../logger');
const AES_BLOCK_SIZE = 128;
const blockSize = parseInt(AES_BLOCK_SIZE / 8);  // in bytes

const QUERY_STAGE_MASTER_KEY = 'queryStageMasterKey';
const BASE64 = 'base64';
const DEFAULT_AAD = Buffer.from('');
const AUTH_TAG_LENGTH_IN_BYTES = 16;

const AES_CBC = {
  cipherName: function (keySizeInBytes) {
    return `aes-${keySizeInBytes * 8}-cbc`;
  },
  ivSize: 16
};

const AES_ECB = {
  cipherName: function (keySizeInBytes) {
    return `aes-${keySizeInBytes * 8}-ecb`;
  }
};

const AES_GCM = {
  cipherName: function (keySizeInBytes) {
    return `aes-${keySizeInBytes * 8}-gcm`;
  },
  ivSize: 12
};

// Material Descriptor
function MaterialDescriptor(smkId, queryId, keySize) {
  return {
    'smkId': smkId,
    'queryId': queryId,
    'keySize': keySize
  };
}

// Encryption Material
function EncryptionMetadata(key, dataIv, matDesc, keyIv, dataAad, keyAad) {
  return {
    'key': key,
    'iv': dataIv,
    'matDesc': matDesc,
    'keyIv': keyIv,
    'dataAad': dataAad,
    'keyAad': keyAad
  };
}

exports.EncryptionMetadata = EncryptionMetadata;

function TempFileGenerator() {

  this.fileSync = function (option = { dir: os.tmpdir(), prefix: '', postfix: '', extension: '' }) {
    const randomName = crypto.randomUUID();
    const fileName = `${option.prefix || ''}${randomName}${option.postfix || ''}${'.' + option.extension || ''}`;

    if (!this.checkDirInTemp(option.dir)) {
      option.dir = os.tmpdir();
    }

    const fullpath = path.join(option.dir, fileName);
    
    fs.writeFileSync(fullpath, '');
    const fileDescriptor = fs.openSync(fullpath);
    return { name: fullpath, fd: fileDescriptor };
  };
  
  this.file = function (option = { dir: os.tmpdir(), prefix: '', postfix: '', extension: '' }, callback) {
    try {
      const { name, fd } = this.fileSync(option);
      callback(null, name, fd);
    } catch (err) {
      callback(err);
    }
  };
  
  this.checkDirInTemp = function (directoryPath) {
    if (!directoryPath || directoryPath.length === 0) {
      return false;
    }
  
    if (directoryPath.includes(os.tmpdir())) {
      if (fs.existsSync(directoryPath)) {
        return true;
      } else {
        Logger.getInstance().warn(`no such file or directory, open ${directoryPath}`);
      }
    } else {
      Logger.getInstance().warn(`dir option must be relative to ${os.tmpdir()}, found ${directoryPath}`);
    }
    return false;
  };
}

/**
 * Creates an encryption utility object.
 *
 * @param {module} encrypt
 * @param {module} filestream
 * @param {module} temp
 * 
 * @returns {Object}
 * @constructor
 */
function EncryptUtil(encrypt, filestream, temp) {
  const crypto = typeof encrypt !== 'undefined' ? encrypt : require('crypto');
  // TODO: SNOW-1814883: Replace 'fs' with 'fs/promises'
  const fs = typeof filestream !== 'undefined' ? filestream : require('fs');
  const tmp = typeof temp !== 'undefined' ? temp : new TempFileGenerator();

  /**
   * Generate a buffer with random bytes given a size.
   *
   * @param {Number} byteLength
   *
   * @returns {Buffer} of size byteLength
   */
  function getSecureRandom(byteLength) {
    return crypto.randomBytes(byteLength);
  }

  /**
  * Convert a material descriptor object's values to unicode.
  *
  * @param {Object} matDesc
  *
  * @returns {Object}
  */
  function matDescToUnicode(matDesc) {
    matDesc['smkId'] = matDesc['smkId'].toString();
    matDesc['keySize'] = matDesc['keySize'].toString();
    const newMatDesc = JSON.stringify(matDesc);
    return newMatDesc;
  }

  function createEncryptionMetadata(encryptionMaterial, keySize, encryptedKey, dataIv, keyIv = null, dataAad = null, keyAad = null) {
    const matDesc = new MaterialDescriptor(
      encryptionMaterial.smkId,
      encryptionMaterial.queryId,
      keySize * 8
    );

    return new EncryptionMetadata(
      encryptedKey.toString(BASE64),
      dataIv.toString(BASE64),
      matDescToUnicode(matDesc),
      keyIv ? keyIv.toString(BASE64) : null,
      dataAad ? dataAad.toString(BASE64) : null,
      keyAad ? keyAad.toString(BASE64) : null
    );
  }

  /**
   * Encrypt content using AES-CBC algorithm.
   */
  this.encryptFileStream = async function (encryptionMaterial, content) {
    return this.encryptDataCBC(encryptionMaterial, content);
  };

  this.encryptDataCBC = function (encryptionMaterial, data) {
    const decodedKek = Buffer.from(encryptionMaterial[QUERY_STAGE_MASTER_KEY], BASE64);
    const keySize = decodedKek.length;

    const dataIv = getSecureRandom(AES_CBC.ivSize);
    const fileKey = getSecureRandom(keySize);

    const dataCipher = crypto.createCipheriv(AES_CBC.cipherName(keySize), fileKey, dataIv);
    const encryptedData = performCrypto(dataCipher, data);

    const keyCipher = crypto.createCipheriv(AES_ECB.cipherName(keySize), decodedKek, null);
    const encryptedKey = performCrypto(keyCipher, fileKey);

    return {
      encryptionMetadata: createEncryptionMetadata(encryptionMaterial, keySize, encryptedKey, dataIv),
      dataStream: encryptedData
    };
  };

  //TODO: SNOW-940981: Add proper usage when feature is ready
  this.encryptDataGCM = function (encryptionMaterial, data) {
    const decodedKek = Buffer.from(encryptionMaterial[QUERY_STAGE_MASTER_KEY], BASE64);
    const keySize = decodedKek.length;

    const dataIv = getSecureRandom(AES_GCM.ivSize);
    const fileKey = getSecureRandom(keySize);

    const encryptedData = this.encryptGCM(data, fileKey, dataIv, DEFAULT_AAD);

    const keyIv = getSecureRandom(AES_GCM.ivSize);
    const encryptedKey = this.encryptGCM(fileKey, decodedKek, keyIv, DEFAULT_AAD);
    return {
      encryptionMetadata: createEncryptionMetadata(encryptionMaterial, keySize, encryptedKey, dataIv, keyIv, DEFAULT_AAD, DEFAULT_AAD),
      dataStream: encryptedData
    };
  };

  this.encryptGCM = function (data, key, iv, aad) {
    const cipher = crypto.createCipheriv(AES_GCM.cipherName(key.length), key, iv, { authTagLength: AUTH_TAG_LENGTH_IN_BYTES });
    if (aad) {
      cipher.setAAD(aad);
    }
    const encryptedData = performCrypto(cipher, data);
    return Buffer.concat([encryptedData, cipher.getAuthTag()]);
  };

  this.decryptGCM = function (data, key, iv, aad) {
    const decipher = crypto.createDecipheriv(AES_GCM.cipherName(key.length), key, iv, { authTagLength: AUTH_TAG_LENGTH_IN_BYTES });
    if (aad) {
      decipher.setAAD(aad);
    }
    // last 16 bytes of data is the authentication tag
    const authTag = data.slice(data.length - AUTH_TAG_LENGTH_IN_BYTES, data.length);
    const cipherText = data.slice(0, data.length - AUTH_TAG_LENGTH_IN_BYTES);
    decipher.setAuthTag(authTag);
    return performCrypto(decipher, cipherText);
  };
  
  /**
   * Encrypt file using AES algorithm.
   */
  this.encryptFile = async function (encryptionMaterial, inputFilePath,
    tmpDir = null, chunkSize = blockSize * 4 * 1024) {
    return await this.encryptFileCBC(encryptionMaterial, inputFilePath, tmpDir, chunkSize);
  };

  this.encryptFileCBC = async function (encryptionMaterial, inputFilePath,
    tmpDir = null, chunkSize = blockSize * 4 * 1024) {
    const decodedKek = Buffer.from(encryptionMaterial[QUERY_STAGE_MASTER_KEY], BASE64);
    const keySize = decodedKek.length;

    const dataIv = getSecureRandom(AES_CBC.ivSize);
    const fileKey = getSecureRandom(keySize);
    const dataCipher = crypto.createCipheriv(AES_CBC.cipherName(keySize), fileKey, dataIv);
    const encryptedFilePath = await performFileStreamCrypto(dataCipher, tmpDir, inputFilePath, chunkSize);

    const keyCipher = crypto.createCipheriv(AES_ECB.cipherName(keySize), decodedKek, null);
    const encryptedKey = performCrypto(keyCipher, fileKey);

    return {
      encryptionMetadata: createEncryptionMetadata(encryptionMaterial, keySize, encryptedKey, dataIv),
      dataFile: encryptedFilePath
    };
  };

  //TODO: SNOW-940981: Add proper usage when feature is ready
  this.encryptFileGCM = async function (encryptionMaterial, inputFilePath, tmpDir = null) {
    const decodedKek = Buffer.from(encryptionMaterial[QUERY_STAGE_MASTER_KEY], BASE64);

    const dataIv = getSecureRandom(AES_GCM.ivSize);
    const fileKey = getSecureRandom(decodedKek.length);

    const fileContent = await new Promise((resolve, reject) => {
      fs.readFile(inputFilePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const encryptedData = this.encryptGCM(fileContent, fileKey, dataIv, DEFAULT_AAD);
    const encryptedFilePath = await writeContentToFile(tmpDir, path.basename(inputFilePath) + '#', encryptedData);

    const keyIv = getSecureRandom(AES_GCM.ivSize);
    const encryptedKey = this.encryptGCM(fileKey, decodedKek, keyIv, DEFAULT_AAD);

    return {
      encryptionMetadata: createEncryptionMetadata(encryptionMaterial, fileKey.length, encryptedKey, dataIv, keyIv, DEFAULT_AAD, DEFAULT_AAD),
      dataFile: encryptedFilePath
    };
  };

  /**
   * Decrypt file using AES algorithm.
   */
  this.decryptFile = async function (metadata, encryptionMaterial, inputFilePath,
    tmpDir = null, chunkSize = blockSize * 4 * 1024) {
    return await this.decryptFileCBC(metadata, encryptionMaterial, inputFilePath, tmpDir, chunkSize);
  };

  this.decryptFileCBC = async function (metadata, encryptionMaterial, inputFilePath,
    tmpDir = null, chunkSize = blockSize * 4 * 1024) {
    const decodedKek = Buffer.from(encryptionMaterial[QUERY_STAGE_MASTER_KEY], BASE64);
    const keyBytes = new Buffer.from(metadata.key, BASE64);
    const ivBytes = new Buffer.from(metadata.iv, BASE64);
    const keyDecipher = crypto.createDecipheriv(AES_ECB.cipherName(decodedKek.length), decodedKek, null);
    const fileKey = performCrypto(keyDecipher, keyBytes);

    const dataDecipher = crypto.createDecipheriv(AES_CBC.cipherName(fileKey.length), fileKey, ivBytes);
    return await performFileStreamCrypto(dataDecipher, tmpDir, inputFilePath, chunkSize);
  };

  //TODO: SNOW-940981: Add proper usage when feature is ready
  this.decryptFileGCM = async function (metadata, encryptionMaterial, inputFilePath, tmpDir = null) {
    const decodedKek = Buffer.from(encryptionMaterial[QUERY_STAGE_MASTER_KEY], BASE64);
    const keyBytes = new Buffer.from(metadata.key, BASE64);
    const keyIvBytes = new Buffer.from(metadata.keyIv, BASE64);
    const dataIvBytes = new Buffer.from(metadata.iv, BASE64);
    const dataAadBytes = new Buffer.from(metadata.dataAad, BASE64);
    const keyAadBytes = new Buffer.from(metadata.keyAad, BASE64);

    const fileKey = this.decryptGCM(keyBytes, decodedKek, keyIvBytes, keyAadBytes);

    const fileContent = await new Promise((resolve, reject) => {
      fs.readFile(inputFilePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const decryptedData = this.decryptGCM(fileContent, fileKey, dataIvBytes, dataAadBytes);
    return await writeContentToFile(tmpDir, path.basename(inputFilePath) + '#', decryptedData);
  };
  
  function performCrypto(cipherOrDecipher, data) {
    const encryptedOrDecrypted = cipherOrDecipher.update(data);
    const final = cipherOrDecipher.final();
    return Buffer.concat([encryptedOrDecrypted, final]);
  }

  async function performFileStreamCrypto(cipherOrDecipher, tmpDir, inputFilePath, chunkSize) {
    const outputFile = await new Promise((resolve, reject) => {
      tmp.file({ dir: tmpDir, prefix: path.basename(inputFilePath) + '#' }, (err, path, fd) => {
        if (err) {
          reject(err);
        } else {
          resolve({ path, fd });
        }
      });
    });
    await new Promise(function (resolve) {
      const inputStream = fs.createReadStream(inputFilePath, { highWaterMark: chunkSize });
      const outputStream = fs.createWriteStream(outputFile.path);

      inputStream.on('data', function (chunk) {
        const encrypted = cipherOrDecipher.update(chunk);
        outputStream.write(encrypted);
      });
      inputStream.on('close', function () {
        outputStream.write(cipherOrDecipher.final());
        outputStream.close(resolve);
      });
    });

    await new Promise((resolve, reject) => {
      fs.close(outputFile.fd, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    return outputFile.path;
  }

  async function writeContentToFile(tmpDir, prefix, content,) {
    const outputFile = await new Promise((resolve, reject) => {
      tmp.file({ dir: tmpDir, prefix: prefix }, (err, path, fd) => {
        if (err) {
          reject(err);
        } else {
          resolve({ path, fd });
        }
      });
    });
    await new Promise((resolve, reject) => {
      fs.writeFile(outputFile.path, content, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      fs.close(outputFile.fd, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    return outputFile.path;
  }
}

exports.EncryptUtil = EncryptUtil;
