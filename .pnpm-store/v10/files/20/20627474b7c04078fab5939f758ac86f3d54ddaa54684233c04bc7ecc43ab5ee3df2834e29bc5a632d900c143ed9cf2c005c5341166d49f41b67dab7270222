const EncryptionMetadata = require('./encrypt_util').EncryptionMetadata;
const FileHeader = require('../file_util').FileHeader;
const expandTilde = require('expand-tilde');
const resultStatus = require('../file_util').resultStatus;
const ProxyUtil = require('../proxy_util');
const { isBypassProxy } = require('../http/node');
const Logger = require('../logger');

const EXPIRED_TOKEN = 'ExpiredToken';

// Azure Location
function AzureLocation(containerName, path) {
  return {
    'containerName': containerName,
    'path': path
  };
}

/**
 * Creates an Azure utility object.
 *
 * @param {module} azure
 * @param {module} filestream
 *
 * @returns {Object}
 * @constructor
 */
function AzureUtil(connectionConfig, azure, filestream) {
  const AZURE = typeof azure !== 'undefined' ? azure : require('@azure/storage-blob');
  const fs = typeof filestream !== 'undefined' ? filestream : require('fs');

  /**
  * Create a blob service client using an Azure SAS token.
  *
  * @param {Object} stageInfo
  *
  * @returns {String}
  */
  this.createClient = function (stageInfo) {
    const stageCredentials = stageInfo['creds'];
    const sasToken = stageCredentials['AZURE_SAS_TOKEN'];

    const account = stageInfo['storageAccount'];
    const connectionString = `https://${account}.blob.core.windows.net${sasToken}`;
    let proxy = ProxyUtil.getProxy(connectionConfig.getProxy(), 'Azure Util');
    if (proxy && !isBypassProxy(proxy, connectionString)) {
      Logger.getInstance().debug(`The destination host is: ${ProxyUtil.getHostFromURL(connectionString)} and the proxy host is: ${proxy.host}`);
      Logger.getInstance().trace(`Initializing the proxy information for the Azure Client: ${ProxyUtil.describeProxy(proxy)}`);

      proxy = ProxyUtil.getAzureProxy(proxy);
    }
    ProxyUtil.hideEnvironmentProxy();
    const blobServiceClient = new AZURE.BlobServiceClient(
      connectionString, null,
      {
        proxyOptions: proxy,
      }
    );
    ProxyUtil.restoreEnvironmentProxy();
    return blobServiceClient;
  };

  /**
  * Extract the container name and path from the metadata's stage location.
  *
  * @param {String} stageLocation
  *
  * @returns {Object}
  */
  this.extractContainerNameAndPath = function (stageLocation) {
    // expand '~' and '~user' expressions
    if (process.platform !== 'win32') {
      stageLocation = expandTilde(stageLocation);
    }

    let containerName = stageLocation;
    let path;

    // split stage location as bucket name and path
    if (stageLocation.includes('/')) {
      containerName = stageLocation.substring(0, stageLocation.indexOf('/'));

      path = stageLocation.substring(stageLocation.indexOf('/') + 1, stageLocation.length);
      if (path && !path.endsWith('/')) {
        path += '/';
      }
    }

    return AzureLocation(containerName, path);
  };

  /**
  * Create file header based on file being uploaded or not.
  *
  * @param {Object} meta
  * @param {String} filename
  *
  * @returns {Object}
  */
  this.getFileHeader = async function (meta, filename) {
    const stageInfo = meta['stageInfo'];
    const client = this.createClient(stageInfo);
    const azureLocation = this.extractContainerNameAndPath(stageInfo['location']);

    const containerClient = client.getContainerClient(azureLocation.containerName);
    const blobClient = containerClient.getBlobClient(azureLocation.path + filename);

    let blobDetails;

    try {
      await blobClient.getProperties()
        .then(function (data) {
          blobDetails = data;
        });
    } catch (err) {
      if (err['code'] === EXPIRED_TOKEN) {
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
        return null;
      } else if (err['statusCode'] === 404) {
        meta['resultStatus'] = resultStatus.NOT_FOUND_FILE;
        return FileHeader(null, null, null);
      } else if (err['statusCode'] === 400) {
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
        return null;
      } else {
        meta['resultStatus'] = resultStatus.ERROR;
        return null;
      }
    }

    meta['resultStatus'] = resultStatus.UPLOADED;

    let encryptionMetadata = null;
    if (blobDetails.metadata['encryptiondata']) {
      const encryptionData = JSON.parse(blobDetails.metadata['encryptiondata']);
      encryptionMetadata = EncryptionMetadata(
        encryptionData['WrappedContentKey']['EncryptedKey'],
        encryptionData['ContentEncryptionIV'],
        blobDetails.metadata['matdesc']
      );
    }

    return FileHeader(
      blobDetails.metadata['sfcdigest'],
      blobDetails.contentLength,
      encryptionMetadata
    );
  };

  /**
  * Create the file metadata then upload the file.
  *
  * @param {String} dataFile
  * @param {Object} meta
  * @param {Object} encryptionMetadata
  * @param {Number} maxConcurrency
  *
  * @returns {null}
  */
  this.uploadFile = async function (dataFile, meta, encryptionMetadata, maxConcurrency) {
    const fileStream = fs.readFileSync(dataFile);
    await this.uploadFileStream(fileStream, meta, encryptionMetadata, maxConcurrency);
  };

  /**
  * Create the file metadata then upload the file stream.
  *
  * @param {String} fileStream
  * @param {Object} meta
  * @param {Object} encryptionMetadata
  *
  * @returns {null}
  */
  this.uploadFileStream = async function (fileStream, meta, encryptionMetadata) {
    const azureMetadata = {
      'sfcdigest': meta['SHA256_DIGEST']
    };

    if (encryptionMetadata) {
      azureMetadata['encryptiondata'] =
        JSON.stringify({
          'EncryptionMode': 'FullBlob',
          'WrappedContentKey': {
            'KeyId': 'symmKey1',
            'EncryptedKey': encryptionMetadata.key,
            'Algorithm': 'AES_CBC_256'
          },
          'EncryptionAgent': {
            'Protocol': '1.0',
            'EncryptionAlgorithm': 'AES_CBC_128',
          },
          'ContentEncryptionIV': encryptionMetadata.iv,
          'KeyWrappingMetadata': {
            'EncryptionLibrary': 'Java 5.3.0'
          }
        });
      azureMetadata['matdesc'] = encryptionMetadata.matDesc;
    }

    const stageInfo = meta['stageInfo'];
    const client = this.createClient(stageInfo);
    const azureLocation = this.extractContainerNameAndPath(stageInfo['location']);
    const blobName = azureLocation.path + meta['dstFileName'];

    const containerClient = client.getContainerClient(azureLocation.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.upload(fileStream, fileStream.length, {
        metadata: azureMetadata,
        blobHTTPHeaders:
        {
          blobContentEncoding: 'UTF-8',
          blobContentType: 'application/octet-stream'
        }
      });
    } catch (err) {
      if (err['statusCode'] === 403 && detectAzureTokenExpireError(err)) {
        meta['lastError'] = err;
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
        return;
      } else {
        meta['lastError'] = err;
        meta['resultStatus'] = resultStatus.NEED_RETRY;
      }
      return;
    }
    meta['dstFileSize'] = meta['uploadSize'];
    meta['resultStatus'] = resultStatus.UPLOADED;
  };

  /**
   * Download the file blob then write the file.
   *
   * @param {Object} meta
   * @param fullDstPath
   *
   * @returns {null}
   */
  this.nativeDownloadFile = async function (meta, fullDstPath) {
    const stageInfo = meta['stageInfo'];
    const client = this.createClient(stageInfo);
    const azureLocation = this.extractContainerNameAndPath(stageInfo['location']);
    const blobName = azureLocation.path + meta['srcFileName'];

    const containerClient = client.getContainerClient(azureLocation.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const downloadBlockBlobResponse  = await blockBlobClient.download(0);
      const readableStream = downloadBlockBlobResponse.readableStreamBody;

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(fullDstPath);
        readableStream.on('data', (data) => {
          writer.write(data);
        });
        readableStream.on('end', () => {
          writer.end(resolve);
        });
        readableStream.on('error', reject);
      });
    } catch (err) {
      if (err['statusCode'] === 403 && detectAzureTokenExpireError(err)) {
        meta['lastError'] = err;
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
        return;
      } else {
        meta['lastError'] = err;
        meta['resultStatus'] = resultStatus.NEED_RETRY;
      }
      return;
    }
    meta['resultStatus'] = resultStatus.DOWNLOADED;
  };

  /**
  * Detect if the Azure token has expired.
  *
  * @param {Object} err
  *
  * @returns {Boolean}
  */
  function detectAzureTokenExpireError(err) {
    if (err['statusCode'] !== 403) {
      return false;
    }
    const errstr = err.toString();
    return errstr.includes('Signature not valid in the specified time frame') ||
      errstr.includes('Server failed to authenticate the request.');
  }
}
module.exports = AzureUtil;
