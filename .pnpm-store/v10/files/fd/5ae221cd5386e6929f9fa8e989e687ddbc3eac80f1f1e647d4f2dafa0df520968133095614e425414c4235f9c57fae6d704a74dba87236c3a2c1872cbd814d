const { NodeHttpHandler } = require('@smithy/node-http-handler');
const EncryptionMetadata = require('./encrypt_util').EncryptionMetadata;
const FileHeader = require('../file_util').FileHeader;
const expandTilde = require('expand-tilde');
const getProxyAgent = require('../http/node').getProxyAgent;
const ProxyUtil = require('../proxy_util');

const AMZ_IV = 'x-amz-iv';
const AMZ_KEY = 'x-amz-key';
const AMZ_MATDESC = 'x-amz-matdesc';
const SFC_DIGEST = 'sfc-digest';

const EXPIRED_TOKEN = 'ExpiredToken';
const NO_SUCH_KEY = 'NoSuchKey';
const SNOWFLAKE_S3_DESTINATION = 's3.amazonaws.com';

const ERRORNO_WSAECONNABORTED = 10053;  // network connection was aborted
const DATA_SIZE_THRESHOLD = 67108864; // magic number, given from  error message.

const resultStatus = require('../file_util').resultStatus;

const HTTP_HEADER_VALUE_OCTET_STREAM = 'application/octet-stream';

// S3 Location: S3 bucket name + path
function S3Location(bucketName, s3path) {
  return {
    'bucketName': bucketName, // S3 bucket name
    's3path': s3path // S3 path name
  };
}

/**
 * Creates an S3 utility object.
 *
 * @param connectionConfig
 *
 * @param s3 - used for tests, mock can be supplied
 * @param filestream - used for tests, mock can be supplied
 * @returns {Object}
 * @constructor
 */
function S3Util(connectionConfig, s3, filestream) {
  const AWS = typeof s3 !== 'undefined' ? s3 : require('@aws-sdk/client-s3');
  const fs = typeof filestream !== 'undefined' ? filestream : require('fs');
  /**
   * Create an AWS S3 client using an AWS token.
   */
  this.createClient = function (stageInfo, useAccelerateEndpoint) {
    const stageCredentials = stageInfo['creds'];
    const securityToken = stageCredentials['AWS_TOKEN'];
    const isRegionalUrlEnabled = stageInfo.useRegionalUrl || stageInfo.useS3RegionalUrl;
    
    // if GS sends us an endpoint, it's likely for FIPS. Use it.
    let endPoint = null;
    if (stageInfo['endPoint']) {
      endPoint = `https://${stageInfo['endPoint']}`;
    } else {
      if (stageInfo.region && isRegionalUrlEnabled) {
        const domainSuffixForRegionalUrl = (stageInfo.region).toLowerCase().startsWith('cn-') ? 'amazonaws.com.cn' : 'amazonaws.com';
        endPoint = `https://s3.${stageInfo.region}.${domainSuffixForRegionalUrl}`;
      }
    }
  
    const config = {
      apiVersion: '2006-03-01',
      region: stageInfo['region'],
      credentials: {
        accessKeyId: stageCredentials['AWS_KEY_ID'],
        secretAccessKey: stageCredentials['AWS_SECRET_KEY'],
        sessionToken: securityToken,
      },
      endpoint: endPoint,
      useAccelerateEndpoint: useAccelerateEndpoint
    };

    const proxy = ProxyUtil.getProxy(connectionConfig.getProxy(), 'S3 Util');
    if (proxy) {
      const proxyAgent = getProxyAgent(proxy, new URL(connectionConfig.accessUrl), endPoint || SNOWFLAKE_S3_DESTINATION);
      config.requestHandler = new NodeHttpHandler({
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent
      });
    }

    return new AWS.S3(config);
  };

  /**
   * Get file header based on file being uploaded or not.
   *
   * @param {Object} meta
   * @param {String} filename
   *
   * @returns {Object}
   */
  this.getFileHeader = async function (meta, filename) {
    const stageInfo = meta['stageInfo'];
    const client = this.createClient(stageInfo);
    const s3location = extractBucketNameAndPath(stageInfo['location']);

    const params = {
      Bucket: s3location.bucketName,
      Key: s3location.s3path + filename
    };

    let akey;

    try {
      await client.getObject(params)
        .then(function (data) {
          akey = data;
        });
    } catch (err) {
      if (err['Code'] === EXPIRED_TOKEN) {
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
        return null;
      } else if (err['Code'] === NO_SUCH_KEY) {
        meta['resultStatus'] = resultStatus.NOT_FOUND_FILE;
        return FileHeader(null, null, null);
      } else if (err['Code'] === '400') {
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
        return null;
      } else {
        meta['resultStatus'] = resultStatus.ERROR;
        return null;
      }
    }

    meta['resultStatus'] = resultStatus.UPLOADED;

    let encryptionMetadata;
    if (akey && akey.Metadata[AMZ_KEY]) {
      encryptionMetadata = EncryptionMetadata(
        akey.Metadata[AMZ_KEY],
        akey.Metadata[AMZ_IV],
        akey.Metadata[AMZ_MATDESC]
      );
    }

    return FileHeader(
      akey.Metadata[SFC_DIGEST],
      akey.ContentLength,
      encryptionMetadata
    );
  };

  /**
   * Create the file metadata then upload the file.
   *
   * @param {String} dataFile
   * @param {Object} meta
   * @param {Object} encryptionMetadata
   */
  this.uploadFile = async function (dataFile, meta, encryptionMetadata) {
    const fileStream = fs.readFileSync(dataFile);
    await this.uploadFileStream(fileStream, meta, encryptionMetadata);
  };

  /**
   * Create the file metadata then upload the file stream.
   *
   * @param {String} fileStream
   * @param {Object} meta
   * @param {Object} encryptionMetadata
   */
  this.uploadFileStream = async function (fileStream, meta, encryptionMetadata) {
    const s3Metadata = {
      HTTP_HEADER_CONTENT_TYPE: HTTP_HEADER_VALUE_OCTET_STREAM,
      SFC_DIGEST: meta['SHA256_DIGEST']
    };

    if (encryptionMetadata) {
      s3Metadata[AMZ_IV] = encryptionMetadata.iv;
      s3Metadata[AMZ_KEY] = encryptionMetadata.key;
      s3Metadata[AMZ_MATDESC] = encryptionMetadata.matDesc;
    }

    const stageInfo = meta['stageInfo'];
    const client = this.createClient(stageInfo);

    const s3location = extractBucketNameAndPath(meta['stageInfo']['location']);

    const params = {
      Bucket: s3location.bucketName,
      Body: fileStream,
      Key: s3location.s3path + meta['dstFileName'],
      Metadata: s3Metadata
    };

    // call S3 to upload file to specified bucket
    try {
      await client.putObject(params);
    } catch (err) {
      if (err['Code'] === EXPIRED_TOKEN) {
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
      } else {
        meta['lastError'] = err;
        if (err['Code'] === ERRORNO_WSAECONNABORTED.toString()) {
          meta['resultStatus'] = resultStatus.NEED_RETRY_WITH_LOWER_CONCURRENCY;
        } else {
          meta['resultStatus'] = resultStatus.NEED_RETRY;
        }
      }
      return;
    }

    meta['dstFileSize'] = meta['uploadSize'];
    meta['resultStatus'] = resultStatus.UPLOADED;
  };

  /**
   * Download the file.
   *
   * @param {String} dataFile
   * @param {Object} meta
   * @param {Object} encryptionMetadata
   */
  this.nativeDownloadFile = async function (meta, fullDstPath) {
    const stageInfo = meta['stageInfo'];
    const client = this.createClient(stageInfo);

    const s3location = extractBucketNameAndPath(meta['stageInfo']['location']);

    const params = {
      Bucket: s3location.bucketName,
      Key: s3location.s3path + meta['dstFileName'],
    };

    // call S3 to download file to specified bucket
    try {
      await client.getObject(params)
        .then(data => data.Body.transformToByteArray())
        .then((data) => {
          return new Promise((resolve, reject) => {
            fs.writeFile(fullDstPath, data, 'binary', (err) => {
              if (err) {
                reject(err);
              }
              resolve();
            });
          });
        });
    } catch (err) {
      if (err['Code'] === EXPIRED_TOKEN) {
        meta['resultStatus'] = resultStatus.RENEW_TOKEN;
      } else {
        meta['lastError'] = err;
        if (err['Code'] === ERRORNO_WSAECONNABORTED.toString()) {
          meta['resultStatus'] = resultStatus.NEED_RETRY_WITH_LOWER_CONCURRENCY;
        } else {
          meta['resultStatus'] = resultStatus.NEED_RETRY;
        }
      }
      return;
    }
    meta['resultStatus'] = resultStatus.DOWNLOADED;
  };
}

/**
 * Extract the bucket name and path from the metadata's stage location.
 *
 * @param {String} stageLocation
 *
 * @returns {Object}
 */
function extractBucketNameAndPath(stageLocation) {
  // expand '~' and '~user' expressions
  if (process.platform !== 'win32') {
    stageLocation = expandTilde(stageLocation);
  }

  let bucketName = stageLocation;
  let s3path;

  // split stage location as bucket name and path
  if (stageLocation.includes('/')) {
    bucketName = stageLocation.substring(0, stageLocation.indexOf('/'));

    s3path = stageLocation.substring(stageLocation.indexOf('/') + 1, stageLocation.length);
    if (s3path && !s3path.endsWith('/')) {
      s3path += '/';
    }
  }
  return S3Location(bucketName, s3path);
}

module.exports = { S3Util, SNOWFLAKE_S3_DESTINATION, DATA_SIZE_THRESHOLD, extractBucketNameAndPath };
