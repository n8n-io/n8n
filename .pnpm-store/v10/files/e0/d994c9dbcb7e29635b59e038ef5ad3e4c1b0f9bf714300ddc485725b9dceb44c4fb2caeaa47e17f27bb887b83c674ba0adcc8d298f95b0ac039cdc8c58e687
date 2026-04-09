// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _File_instances, _File_validateIntegrity;
import { ServiceObject, util, } from './nodejs-common/index.js';
import { promisifyAll } from '@google-cloud/promisify';
import * as crypto from 'crypto';
import * as fs from 'fs';
import mime from 'mime';
import * as resumableUpload from './resumable-upload.js';
import { Writable, pipeline } from 'stream';
import * as zlib from 'zlib';
import { ExceptionMessages, IdempotencyStrategy, } from './storage.js';
import { AvailableServiceObjectMethods, Bucket } from './bucket.js';
import { Acl } from './acl.js';
import { SigningError, URLSigner, } from './signer.js';
import { GCCL_GCS_CMD_KEY, } from './nodejs-common/util.js';
import duplexify from 'duplexify';
import { normalize, objectKeyToLowercase, unicodeJSONStringify, formatAsUTCISO, PassThroughShim, } from './util.js';
import { CRC32C } from './crc32c.js';
import { HashStreamValidator } from './hash-stream-validator.js';
import AsyncRetry from 'async-retry';
export var ActionToHTTPMethod;
(function (ActionToHTTPMethod) {
    ActionToHTTPMethod["read"] = "GET";
    ActionToHTTPMethod["write"] = "PUT";
    ActionToHTTPMethod["delete"] = "DELETE";
    ActionToHTTPMethod["resumable"] = "POST";
})(ActionToHTTPMethod || (ActionToHTTPMethod = {}));
/**
 * @deprecated - no longer used
 */
export const STORAGE_POST_POLICY_BASE_URL = 'https://storage.googleapis.com';
/**
 * @private
 */
const GS_URL_REGEXP = /^gs:\/\/([a-z0-9_.-]+)\/(.+)$/;
/**
 * @private
 * This regex will match compressible content types. These are primarily text/*, +json, +text, +xml content types.
 * This was based off of mime-db and may periodically need to be updated if new compressible content types become
 * standards.
 */
const COMPRESSIBLE_MIME_REGEX = new RegExp([
    /^text\/|application\/ecmascript|application\/javascript|application\/json/,
    /|application\/postscript|application\/rtf|application\/toml|application\/vnd.dart/,
    /|application\/vnd.ms-fontobject|application\/wasm|application\/x-httpd-php|application\/x-ns-proxy-autoconfig/,
    /|application\/x-sh(?!ockwave-flash)|application\/x-tar|application\/x-virtualbox-hdd|application\/x-virtualbox-ova|application\/x-virtualbox-ovf/,
    /|^application\/x-virtualbox-vbox$|application\/x-virtualbox-vdi|application\/x-virtualbox-vhd|application\/x-virtualbox-vmdk/,
    /|application\/xml|application\/xml-dtd|font\/otf|font\/ttf|image\/bmp|image\/vnd.adobe.photoshop|image\/vnd.microsoft.icon/,
    /|image\/vnd.ms-dds|image\/x-icon|image\/x-ms-bmp|message\/rfc822|model\/gltf-binary|\+json|\+text|\+xml|\+yaml/,
]
    .map(r => r.source)
    .join(''), 'i');
export class RequestError extends Error {
}
const SEVEN_DAYS = 7 * 24 * 60 * 60;
const GS_UTIL_URL_REGEX = /(gs):\/\/([a-z0-9_.-]+)\/(.+)/g;
const HTTPS_PUBLIC_URL_REGEX = /(https):\/\/(storage\.googleapis\.com)\/([a-z0-9_.-]+)\/(.+)/g;
export var FileExceptionMessages;
(function (FileExceptionMessages) {
    FileExceptionMessages["EXPIRATION_TIME_NA"] = "An expiration time is not available.";
    FileExceptionMessages["DESTINATION_NO_NAME"] = "Destination file should have a name.";
    FileExceptionMessages["INVALID_VALIDATION_FILE_RANGE"] = "Cannot use validation with file ranges (start/end).";
    FileExceptionMessages["MD5_NOT_AVAILABLE"] = "MD5 verification was specified, but is not available for the requested object. MD5 is not available for composite objects.";
    FileExceptionMessages["EQUALS_CONDITION_TWO_ELEMENTS"] = "Equals condition must be an array of 2 elements.";
    FileExceptionMessages["STARTS_WITH_TWO_ELEMENTS"] = "StartsWith condition must be an array of 2 elements.";
    FileExceptionMessages["CONTENT_LENGTH_RANGE_MIN_MAX"] = "ContentLengthRange must have numeric min & max fields.";
    FileExceptionMessages["DOWNLOAD_MISMATCH"] = "The downloaded data did not match the data from the server. To be sure the content is the same, you should download the file again.";
    FileExceptionMessages["UPLOAD_MISMATCH_DELETE_FAIL"] = "The uploaded data did not match the data from the server.\n    As a precaution, we attempted to delete the file, but it was not successful.\n    To be sure the content is the same, you should try removing the file manually,\n    then uploading the file again.\n    \n\nThe delete attempt failed with this message:\n\n  ";
    FileExceptionMessages["UPLOAD_MISMATCH"] = "The uploaded data did not match the data from the server.\n    As a precaution, the file has been deleted.\n    To be sure the content is the same, you should try uploading the file again.";
    FileExceptionMessages["MD5_RESUMED_UPLOAD"] = "MD5 cannot be used with a continued resumable upload as MD5 cannot be extended from an existing value";
    FileExceptionMessages["MISSING_RESUME_CRC32C_FINAL_UPLOAD"] = "The CRC32C is missing for the final portion of a resumed upload, which is required for validation. Please provide `resumeCRC32C` if validation is required, or disable `validation`.";
})(FileExceptionMessages || (FileExceptionMessages = {}));
/**
 * A File object is created from your {@link Bucket} object using
 * {@link Bucket#file}.
 *
 * @class
 */
class File extends ServiceObject {
    /**
     * Cloud Storage uses access control lists (ACLs) to manage object and
     * bucket access. ACLs are the mechanism you use to share objects with other
     * users and allow other users to access your buckets and objects.
     *
     * An ACL consists of one or more entries, where each entry grants permissions
     * to an entity. Permissions define the actions that can be performed against
     * an object or bucket (for example, `READ` or `WRITE`); the entity defines
     * who the permission applies to (for example, a specific user or group of
     * users).
     *
     * The `acl` object on a File instance provides methods to get you a list of
     * the ACLs defined on your bucket, as well as set, update, and delete them.
     *
     * See {@link http://goo.gl/6qBBPO| About Access Control lists}
     *
     * @name File#acl
     * @mixes Acl
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * //-
     * // Make a file publicly readable.
     * //-
     * const options = {
     *   entity: 'allUsers',
     *   role: storage.acl.READER_ROLE
     * };
     *
     * file.acl.add(options, function(err, aclObject) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.acl.add(options).then(function(data) {
     *   const aclObject = data[0];
     *   const apiResponse = data[1];
     * });
     * ```
     */
    /**
     * The API-formatted resource description of the file.
     *
     * Note: This is not guaranteed to be up-to-date when accessed. To get the
     * latest record, call the `getMetadata()` method.
     *
     * @name File#metadata
     * @type {object}
     */
    /**
     * The file's name.
     * @name File#name
     * @type {string}
     */
    /**
     * @callback Crc32cGeneratorToStringCallback
     * A method returning the CRC32C as a base64-encoded string.
     *
     * @returns {string}
     *
     * @example
     * Hashing the string 'data' should return 'rth90Q=='
     *
     * ```js
     * const buffer = Buffer.from('data');
     * crc32c.update(buffer);
     * crc32c.toString(); // 'rth90Q=='
     * ```
     **/
    /**
     * @callback Crc32cGeneratorValidateCallback
     * A method validating a base64-encoded CRC32C string.
     *
     * @param {string} [value] base64-encoded CRC32C string to validate
     * @returns {boolean}
     *
     * @example
     * Should return `true` if the value matches, `false` otherwise
     *
     * ```js
     * const buffer = Buffer.from('data');
     * crc32c.update(buffer);
     * crc32c.validate('DkjKuA=='); // false
     * crc32c.validate('rth90Q=='); // true
     * ```
     **/
    /**
     * @callback Crc32cGeneratorUpdateCallback
     * A method for passing `Buffer`s for CRC32C generation.
     *
     * @param {Buffer} [data] data to update CRC32C value with
     * @returns {undefined}
     *
     * @example
     * Hashing buffers from 'some ' and 'text\n'
     *
     * ```js
     * const buffer1 = Buffer.from('some ');
     * crc32c.update(buffer1);
     *
     * const buffer2 = Buffer.from('text\n');
     * crc32c.update(buffer2);
     *
     * crc32c.toString(); // 'DkjKuA=='
     * ```
     **/
    /**
     * @typedef {object} CRC32CValidator
     * @property {Crc32cGeneratorToStringCallback}
     * @property {Crc32cGeneratorValidateCallback}
     * @property {Crc32cGeneratorUpdateCallback}
     */
    /**
     * @callback Crc32cGeneratorCallback
     * @returns {CRC32CValidator}
     */
    /**
     * @typedef {object} FileOptions Options passed to the File constructor.
     * @property {string} [encryptionKey] A custom encryption key.
     * @property {number} [generation] Generation to scope the file to.
     * @property {string} [kmsKeyName] Cloud KMS Key used to encrypt this
     *     object, if the object is encrypted by such a key. Limited availability;
     *     usable only by enabled projects.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for all requests made from File object.
     * @property {Crc32cGeneratorCallback} [callback] A function that generates a CRC32C Validator. Defaults to {@link CRC32C}
     */
    /**
     * Constructs a file object.
     *
     * @param {Bucket} bucket The Bucket instance this file is
     *     attached to.
     * @param {string} name The name of the remote file.
     * @param {FileOptions} [options] Configuration options.
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * ```
     */
    constructor(bucket, name, options = {}) {
        var _a, _b;
        const requestQueryObject = {};
        let generation;
        if (options.generation !== null) {
            if (typeof options.generation === 'string') {
                generation = Number(options.generation);
            }
            else {
                generation = options.generation;
            }
            if (!isNaN(generation)) {
                requestQueryObject.generation = generation;
            }
        }
        Object.assign(requestQueryObject, options.preconditionOpts);
        const userProject = options.userProject || bucket.userProject;
        if (typeof userProject === 'string') {
            requestQueryObject.userProject = userProject;
        }
        const methods = {
            /**
             * @typedef {array} DeleteFileResponse
             * @property {object} 0 The full API response.
             */
            /**
             * @callback DeleteFileCallback
             * @param {?Error} err Request error, if any.
             * @param {object} apiResponse The full API response.
             */
            /**
             * Delete the file.
             *
             * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/delete| Objects: delete API Documentation}
             *
             * @method File#delete
             * @param {object} [options] Configuration options.
             * @param {boolean} [options.ignoreNotFound = false] Ignore an error if
             *     the file does not exist.
             * @param {string} [options.userProject] The ID of the project which will be
             *     billed for the request.
             * @param {DeleteFileCallback} [callback] Callback function.
             * @returns {Promise<DeleteFileResponse>}
             *
             * @example
             * ```
             * const {Storage} = require('@google-cloud/storage');
             * const storage = new Storage();
             * const myBucket = storage.bucket('my-bucket');
             *
             * const file = myBucket.file('my-file');
             * file.delete(function(err, apiResponse) {});
             *
             * //-
             * // If the callback is omitted, we'll return a Promise.
             * //-
             * file.delete().then(function(data) {
             *   const apiResponse = data[0];
             * });
             *
             * ```
             * @example <caption>include:samples/files.js</caption>
             * region_tag:storage_delete_file
             * Another example:
             */
            delete: {
                reqOpts: {
                    qs: requestQueryObject,
                },
            },
            /**
             * @typedef {array} FileExistsResponse
             * @property {boolean} 0 Whether the {@link File} exists.
             */
            /**
             * @callback FileExistsCallback
             * @param {?Error} err Request error, if any.
             * @param {boolean} exists Whether the {@link File} exists.
             */
            /**
             * Check if the file exists.
             *
             * @method File#exists
             * @param {options} [options] Configuration options.
             * @param {string} [options.userProject] The ID of the project which will be
             *     billed for the request.
             * @param {FileExistsCallback} [callback] Callback function.
             * @returns {Promise<FileExistsResponse>}
             *
             * @example
             * ```
             * const {Storage} = require('@google-cloud/storage');
             * const storage = new Storage();
             * const myBucket = storage.bucket('my-bucket');
             *
             * const file = myBucket.file('my-file');
             *
             * file.exists(function(err, exists) {});
             *
             * //-
             * // If the callback is omitted, we'll return a Promise.
             * //-
             * file.exists().then(function(data) {
             *   const exists = data[0];
             * });
             * ```
             */
            exists: {
                reqOpts: {
                    qs: requestQueryObject,
                },
            },
            /**
             * @typedef {array} GetFileResponse
             * @property {File} 0 The {@link File}.
             * @property {object} 1 The full API response.
             */
            /**
             * @callback GetFileCallback
             * @param {?Error} err Request error, if any.
             * @param {File} file The {@link File}.
             * @param {object} apiResponse The full API response.
             */
            /**
             * Get a file object and its metadata if it exists.
             *
             * @method File#get
             * @param {options} [options] Configuration options.
             * @param {string} [options.userProject] The ID of the project which will be
             *     billed for the request.
             * @param {number} [options.generation] The generation number to get
             * @param {string} [options.restoreToken] If this is a soft-deleted object in an HNS-enabled bucket, returns the restore token which will
             *    be necessary to restore it if there's a name conflict with another object.
             * @param {boolean} [options.softDeleted] If true, returns the soft-deleted object.
                  Object `generation` is required if `softDeleted` is set to True.
             * @param {GetFileCallback} [callback] Callback function.
             * @returns {Promise<GetFileResponse>}
             *
             * @example
             * ```
             * const {Storage} = require('@google-cloud/storage');
             * const storage = new Storage();
             * const myBucket = storage.bucket('my-bucket');
             *
             * const file = myBucket.file('my-file');
             *
             * file.get(function(err, file, apiResponse) {
             *   // file.metadata` has been populated.
             * });
             *
             * //-
             * // If the callback is omitted, we'll return a Promise.
             * //-
             * file.get().then(function(data) {
             *   const file = data[0];
             *   const apiResponse = data[1];
             * });
             * ```
             */
            get: {
                reqOpts: {
                    qs: requestQueryObject,
                },
            },
            /**
             * @typedef {array} GetFileMetadataResponse
             * @property {object} 0 The {@link File} metadata.
             * @property {object} 1 The full API response.
             */
            /**
             * @callback GetFileMetadataCallback
             * @param {?Error} err Request error, if any.
             * @param {object} metadata The {@link File} metadata.
             * @param {object} apiResponse The full API response.
             */
            /**
             * Get the file's metadata.
             *
             * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/get| Objects: get API Documentation}
             *
             * @method File#getMetadata
             * @param {object} [options] Configuration options.
             * @param {string} [options.userProject] The ID of the project which will be
             *     billed for the request.
             * @param {GetFileMetadataCallback} [callback] Callback function.
             * @returns {Promise<GetFileMetadataResponse>}
             *
             * @example
             * ```
             * const {Storage} = require('@google-cloud/storage');
             * const storage = new Storage();
             * const myBucket = storage.bucket('my-bucket');
             *
             * const file = myBucket.file('my-file');
             *
             * file.getMetadata(function(err, metadata, apiResponse) {});
             *
             * //-
             * // If the callback is omitted, we'll return a Promise.
             * //-
             * file.getMetadata().then(function(data) {
             *   const metadata = data[0];
             *   const apiResponse = data[1];
             * });
             *
             * ```
             * @example <caption>include:samples/files.js</caption>
             * region_tag:storage_get_metadata
             * Another example:
             */
            getMetadata: {
                reqOpts: {
                    qs: requestQueryObject,
                },
            },
            /**
             * @typedef {object} SetFileMetadataOptions Configuration options for File#setMetadata().
             * @param {string} [userProject] The ID of the project which will be billed for the request.
             */
            /**
             * @callback SetFileMetadataCallback
             * @param {?Error} err Request error, if any.
             * @param {object} apiResponse The full API response.
             */
            /**
             * @typedef {array} SetFileMetadataResponse
             * @property {object} 0 The full API response.
             */
            /**
             * Merge the given metadata with the current remote file's metadata. This
             * will set metadata if it was previously unset or update previously set
             * metadata. To unset previously set metadata, set its value to null.
             *
             * You can set custom key/value pairs in the metadata key of the given
             * object, however the other properties outside of this object must adhere
             * to the {@link https://goo.gl/BOnnCK| official API documentation}.
             *
             *
             * See the examples below for more information.
             *
             * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/patch| Objects: patch API Documentation}
             *
             * @method File#setMetadata
             * @param {object} [metadata] The metadata you wish to update.
             * @param {SetFileMetadataOptions} [options] Configuration options.
             * @param {SetFileMetadataCallback} [callback] Callback function.
             * @returns {Promise<SetFileMetadataResponse>}
             *
             * @example
             * ```
             * const {Storage} = require('@google-cloud/storage');
             * const storage = new Storage();
             * const myBucket = storage.bucket('my-bucket');
             *
             * const file = myBucket.file('my-file');
             *
             * const metadata = {
             *   contentType: 'application/x-font-ttf',
             *   metadata: {
             *     my: 'custom',
             *     properties: 'go here'
             *   }
             * };
             *
             * file.setMetadata(metadata, function(err, apiResponse) {});
             *
             * // Assuming current metadata = { hello: 'world', unsetMe: 'will do' }
             * file.setMetadata({
             *   metadata: {
             *     abc: '123', // will be set.
             *     unsetMe: null, // will be unset (deleted).
             *     hello: 'goodbye' // will be updated from 'world' to 'goodbye'.
             *   }
             * }, function(err, apiResponse) {
             *   // metadata should now be { abc: '123', hello: 'goodbye' }
             * });
             *
             * //-
             * // Set a temporary hold on this file from its bucket's retention period
             * // configuration.
             * //
             * file.setMetadata({
             *   temporaryHold: true
             * }, function(err, apiResponse) {});
             *
             * //-
             * // Alternatively, you may set a temporary hold. This will follow the
             * // same behavior as an event-based hold, with the exception that the
             * // bucket's retention policy will not renew for this file from the time
             * // the hold is released.
             * //-
             * file.setMetadata({
             *   eventBasedHold: true
             * }, function(err, apiResponse) {});
             *
             * //-
             * // If the callback is omitted, we'll return a Promise.
             * //-
             * file.setMetadata(metadata).then(function(data) {
             *   const apiResponse = data[0];
             * });
             * ```
             */
            setMetadata: {
                reqOpts: {
                    qs: requestQueryObject,
                },
            },
        };
        super({
            parent: bucket,
            baseUrl: '/o',
            id: encodeURIComponent(name),
            methods,
        });
        _File_instances.add(this);
        this.bucket = bucket;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.storage = bucket.parent;
        // @TODO Can this duplicate code from above be avoided?
        if (options.generation !== null) {
            let generation;
            if (typeof options.generation === 'string') {
                generation = Number(options.generation);
            }
            else {
                generation = options.generation;
            }
            if (!isNaN(generation)) {
                this.generation = generation;
            }
        }
        this.kmsKeyName = options.kmsKeyName;
        this.userProject = userProject;
        this.name = name;
        if (options.encryptionKey) {
            this.setEncryptionKey(options.encryptionKey);
        }
        this.acl = new Acl({
            request: this.request.bind(this),
            pathPrefix: '/acl',
        });
        this.crc32cGenerator =
            options.crc32cGenerator || this.bucket.crc32cGenerator;
        this.instanceRetryValue = (_b = (_a = this.storage) === null || _a === void 0 ? void 0 : _a.retryOptions) === null || _b === void 0 ? void 0 : _b.autoRetry;
        this.instancePreconditionOpts = options === null || options === void 0 ? void 0 : options.preconditionOpts;
    }
    /**
     * The object's Cloud Storage URI (`gs://`)
     *
     * @example
     * ```ts
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const file = bucket.file('image.png');
     *
     * // `gs://my-bucket/image.png`
     * const href = file.cloudStorageURI.href;
     * ```
     */
    get cloudStorageURI() {
        const uri = this.bucket.cloudStorageURI;
        uri.pathname = this.name;
        return uri;
    }
    /**
     * A helper method for determining if a request should be retried based on preconditions.
     * This should only be used for methods where the idempotency is determined by
     * `ifGenerationMatch`
     * @private
     *
     * A request should not be retried under the following conditions:
     * - if precondition option `ifGenerationMatch` is not set OR
     * - if `idempotencyStrategy` is set to `RetryNever`
     */
    shouldRetryBasedOnPreconditionAndIdempotencyStrat(options) {
        var _a;
        return !(((options === null || options === void 0 ? void 0 : options.ifGenerationMatch) === undefined &&
            ((_a = this.instancePreconditionOpts) === null || _a === void 0 ? void 0 : _a.ifGenerationMatch) === undefined &&
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryConditional) ||
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryNever);
    }
    /**
     * @typedef {array} CopyResponse
     * @property {File} 0 The copied {@link File}.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback CopyCallback
     * @param {?Error} err Request error, if any.
     * @param {File} copiedFile The copied {@link File}.
     * @param {object} apiResponse The full API response.
     */
    /**
     * @typedef {object} CopyOptions Configuration options for File#copy(). See an
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects#resource| Object resource}.
     * @property {string} [cacheControl] The cacheControl setting for the new file.
     * @property {string} [contentEncoding] The contentEncoding setting for the new file.
     * @property {string} [contentType] The contentType setting for the new file.
     * @property {string} [destinationKmsKeyName] Resource name of the Cloud
     *     KMS key, of the form
     *     `projects/my-project/locations/location/keyRings/my-kr/cryptoKeys/my-key`,
     *     that will be used to encrypt the object. Overwrites the object
     * metadata's `kms_key_name` value, if any.
     * @property {Metadata} [metadata] Metadata to specify on the copied file.
     * @property {string} [predefinedAcl] Set the ACL for the new file.
     * @property {string} [token] A previously-returned `rewriteToken` from an
     *     unfinished rewrite request.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     */
    /**
     * Copy this file to another file. By default, this will copy the file to the
     * same bucket, but you can choose to copy it to another Bucket by providing
     * a Bucket or File object or a URL starting with "gs://".
     * The generation of the file will not be preserved.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/rewrite| Objects: rewrite API Documentation}
     *
     * @throws {Error} If the destination file is not provided.
     *
     * @param {string|Bucket|File} destination Destination file.
     * @param {CopyOptions} [options] Configuration options. See an
     * @param {CopyCallback} [callback] Callback function.
     * @returns {Promise<CopyResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     *
     * //-
     * // You can pass in a variety of types for the destination.
     * //
     * // For all of the below examples, assume we are working with the following
     * // Bucket and File objects.
     * //-
     * const bucket = storage.bucket('my-bucket');
     * const file = bucket.file('my-image.png');
     *
     * //-
     * // If you pass in a string for the destination, the file is copied to its
     * // current bucket, under the new name provided.
     * //-
     * file.copy('my-image-copy.png', function(err, copiedFile, apiResponse) {
     *   // `my-bucket` now contains:
     *   // - "my-image.png"
     *   // - "my-image-copy.png"
     *
     *   // `copiedFile` is an instance of a File object that refers to your new
     *   // file.
     * });
     *
     * //-
     * // If you pass in a string starting with "gs://" for the destination, the
     * // file is copied to the other bucket and under the new name provided.
     * //-
     * const newLocation = 'gs://another-bucket/my-image-copy.png';
     * file.copy(newLocation, function(err, copiedFile, apiResponse) {
     *   // `my-bucket` still contains:
     *   // - "my-image.png"
     *   //
     *   // `another-bucket` now contains:
     *   // - "my-image-copy.png"
     *
     *   // `copiedFile` is an instance of a File object that refers to your new
     *   // file.
     * });
     *
     * //-
     * // If you pass in a Bucket object, the file will be copied to that bucket
     * // using the same name.
     * //-
     * const anotherBucket = storage.bucket('another-bucket');
     * file.copy(anotherBucket, function(err, copiedFile, apiResponse) {
     *   // `my-bucket` still contains:
     *   // - "my-image.png"
     *   //
     *   // `another-bucket` now contains:
     *   // - "my-image.png"
     *
     *   // `copiedFile` is an instance of a File object that refers to your new
     *   // file.
     * });
     *
     * //-
     * // If you pass in a File object, you have complete control over the new
     * // bucket and filename.
     * //-
     * const anotherFile = anotherBucket.file('my-awesome-image.png');
     * file.copy(anotherFile, function(err, copiedFile, apiResponse) {
     *   // `my-bucket` still contains:
     *   // - "my-image.png"
     *   //
     *   // `another-bucket` now contains:
     *   // - "my-awesome-image.png"
     *
     *   // Note:
     *   // The `copiedFile` parameter is equal to `anotherFile`.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.copy(newLocation).then(function(data) {
     *   const newFile = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * ```
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_copy_file
     * Another example:
     */
    copy(destination, optionsOrCallback, callback) {
        var _a, _b;
        const noDestinationError = new Error(FileExceptionMessages.DESTINATION_NO_NAME);
        if (!destination) {
            throw noDestinationError;
        }
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = { ...optionsOrCallback };
        }
        callback = callback || util.noop;
        let destBucket;
        let destName;
        let newFile;
        if (typeof destination === 'string') {
            const parsedDestination = GS_URL_REGEXP.exec(destination);
            if (parsedDestination !== null && parsedDestination.length === 3) {
                destBucket = this.storage.bucket(parsedDestination[1]);
                destName = parsedDestination[2];
            }
            else {
                destBucket = this.bucket;
                destName = destination;
            }
        }
        else if (destination instanceof Bucket) {
            destBucket = destination;
            destName = this.name;
        }
        else if (destination instanceof File) {
            destBucket = destination.bucket;
            destName = destination.name;
            newFile = destination;
        }
        else {
            throw noDestinationError;
        }
        const query = {};
        if (this.generation !== undefined) {
            query.sourceGeneration = this.generation;
        }
        if (options.token !== undefined) {
            query.rewriteToken = options.token;
        }
        if (options.userProject !== undefined) {
            query.userProject = options.userProject;
            delete options.userProject;
        }
        if (options.predefinedAcl !== undefined) {
            query.destinationPredefinedAcl = options.predefinedAcl;
            delete options.predefinedAcl;
        }
        newFile = newFile || destBucket.file(destName);
        const headers = {};
        if (this.encryptionKey !== undefined) {
            headers['x-goog-copy-source-encryption-algorithm'] = 'AES256';
            headers['x-goog-copy-source-encryption-key'] = this.encryptionKeyBase64;
            headers['x-goog-copy-source-encryption-key-sha256'] =
                this.encryptionKeyHash;
        }
        if (newFile.encryptionKey !== undefined) {
            this.setEncryptionKey(newFile.encryptionKey);
        }
        else if (options.destinationKmsKeyName !== undefined) {
            query.destinationKmsKeyName = options.destinationKmsKeyName;
            delete options.destinationKmsKeyName;
        }
        else if (newFile.kmsKeyName !== undefined) {
            query.destinationKmsKeyName = newFile.kmsKeyName;
        }
        if (query.destinationKmsKeyName) {
            this.kmsKeyName = query.destinationKmsKeyName;
            const keyIndex = this.interceptors.indexOf(this.encryptionKeyInterceptor);
            if (keyIndex > -1) {
                this.interceptors.splice(keyIndex, 1);
            }
        }
        if (!this.shouldRetryBasedOnPreconditionAndIdempotencyStrat(options === null || options === void 0 ? void 0 : options.preconditionOpts)) {
            this.storage.retryOptions.autoRetry = false;
        }
        if (((_a = options.preconditionOpts) === null || _a === void 0 ? void 0 : _a.ifGenerationMatch) !== undefined) {
            query.ifGenerationMatch = (_b = options.preconditionOpts) === null || _b === void 0 ? void 0 : _b.ifGenerationMatch;
            delete options.preconditionOpts;
        }
        this.request({
            method: 'POST',
            uri: `/rewriteTo/b/${destBucket.name}/o/${encodeURIComponent(newFile.name)}`,
            qs: query,
            json: options,
            headers,
        }, (err, resp) => {
            this.storage.retryOptions.autoRetry = this.instanceRetryValue;
            if (err) {
                callback(err, null, resp);
                return;
            }
            if (resp.rewriteToken) {
                const options = {
                    token: resp.rewriteToken,
                };
                if (query.userProject) {
                    options.userProject = query.userProject;
                }
                if (query.destinationKmsKeyName) {
                    options.destinationKmsKeyName = query.destinationKmsKeyName;
                }
                this.copy(newFile, options, callback);
                return;
            }
            callback(null, newFile, resp);
        });
    }
    /**
     * @typedef {object} CreateReadStreamOptions Configuration options for File#createReadStream.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @property {string|boolean} [validation] Possible values: `"md5"`,
     *     `"crc32c"`, or `false`. By default, data integrity is validated with a
     *     CRC32c checksum. You may use MD5 if preferred, but that hash is not
     *     supported for composite objects. An error will be raised if MD5 is
     *     specified but is not available. You may also choose to skip validation
     *     completely, however this is **not recommended**.
     * @property {number} [start] A byte offset to begin the file's download
     *     from. Default is 0. NOTE: Byte ranges are inclusive; that is,
     *     `options.start = 0` and `options.end = 999` represent the first 1000
     *     bytes in a file or object. NOTE: when specifying a byte range, data
     *     integrity is not available.
     * @property {number} [end] A byte offset to stop reading the file at.
     *     NOTE: Byte ranges are inclusive; that is, `options.start = 0` and
     *     `options.end = 999` represent the first 1000 bytes in a file or object.
     *     NOTE: when specifying a byte range, data integrity is not available.
     * @property {boolean} [decompress=true] Disable auto decompression of the
     *     received data. By default this option is set to `true`.
     *     Applicable in cases where the data was uploaded with
     *     `gzip: true` option. See {@link File#createWriteStream}.
     */
    /**
     * Create a readable stream to read the contents of the remote file. It can be
     * piped to a writable stream or listened to for 'data' events to read a
     * file's contents.
     *
     * In the unlikely event there is a mismatch between what you downloaded and
     * the version in your Bucket, your error handler will receive an error with
     * code "CONTENT_DOWNLOAD_MISMATCH". If you receive this error, the best
     * recourse is to try downloading the file again.
     *
     * NOTE: Readable streams will emit the `end` event when the file is fully
     * downloaded.
     *
     * @param {CreateReadStreamOptions} [options] Configuration options.
     * @returns {ReadableStream}
     *
     * @example
     * ```
     * //-
     * // <h4>Downloading a File</h4>
     * //
     * // The example below demonstrates how we can reference a remote file, then
     * // pipe its contents to a local file. This is effectively creating a local
     * // backup of your remote data.
     * //-
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     *
     * const fs = require('fs');
     * const remoteFile = bucket.file('image.png');
     * const localFilename = '/Users/stephen/Photos/image.png';
     *
     * remoteFile.createReadStream()
     *   .on('error', function(err) {})
     *   .on('response', function(response) {
     *     // Server connected and responded with the specified status and headers.
     *    })
     *   .on('end', function() {
     *     // The file is fully downloaded.
     *   })
     *   .pipe(fs.createWriteStream(localFilename));
     *
     * //-
     * // To limit the downloaded data to only a byte range, pass an options
     * // object.
     * //-
     * const logFile = myBucket.file('access_log');
     * logFile.createReadStream({
     *     start: 10000,
     *     end: 20000
     *   })
     *   .on('error', function(err) {})
     *   .pipe(fs.createWriteStream('/Users/stephen/logfile.txt'));
     *
     * //-
     * // To read a tail byte range, specify only `options.end` as a negative
     * // number.
     * //-
     * const logFile = myBucket.file('access_log');
     * logFile.createReadStream({
     *     end: -100
     *   })
     *   .on('error', function(err) {})
     *   .pipe(fs.createWriteStream('/Users/stephen/logfile.txt'));
     * ```
     */
    createReadStream(options = {}) {
        options = Object.assign({ decompress: true }, options);
        const rangeRequest = typeof options.start === 'number' || typeof options.end === 'number';
        const tailRequest = options.end < 0;
        let validateStream = undefined;
        let request = undefined;
        const throughStream = new PassThroughShim();
        let crc32c = true;
        let md5 = false;
        if (typeof options.validation === 'string') {
            const value = options.validation.toLowerCase().trim();
            crc32c = value === 'crc32c';
            md5 = value === 'md5';
        }
        else if (options.validation === false) {
            crc32c = false;
        }
        const shouldRunValidation = !rangeRequest && (crc32c || md5);
        if (rangeRequest) {
            if (typeof options.validation === 'string' ||
                options.validation === true) {
                throw new Error(FileExceptionMessages.INVALID_VALIDATION_FILE_RANGE);
            }
            // Range requests can't receive data integrity checks.
            crc32c = false;
            md5 = false;
        }
        const onComplete = (err) => {
            if (err) {
                // There is an issue with node-fetch 2.x that if the stream errors the underlying socket connection is not closed.
                // This causes a memory leak, so cleanup the sockets manually here by destroying the agent.
                if (request === null || request === void 0 ? void 0 : request.agent) {
                    request.agent.destroy();
                }
                throughStream.destroy(err);
            }
        };
        // We listen to the response event from the request stream so that we
        // can...
        //
        //   1) Intercept any data from going to the user if an error occurred.
        //   2) Calculate the hashes from the http.IncomingMessage response
        //   stream,
        //      which will return the bytes from the source without decompressing
        //      gzip'd content. We then send it through decompressed, if
        //      applicable, to the user.
        const onResponse = (err, _body, rawResponseStream) => {
            if (err) {
                // Get error message from the body.
                this.getBufferFromReadable(rawResponseStream).then(body => {
                    err.message = body.toString('utf8');
                    throughStream.destroy(err);
                });
                return;
            }
            request = rawResponseStream.request;
            const headers = rawResponseStream.toJSON().headers;
            const isCompressed = headers['content-encoding'] === 'gzip';
            const hashes = {};
            // The object is safe to validate if:
            // 1. It was stored gzip and returned to us gzip OR
            // 2. It was never stored as gzip
            const safeToValidate = (headers['x-goog-stored-content-encoding'] === 'gzip' &&
                isCompressed) ||
                headers['x-goog-stored-content-encoding'] === 'identity';
            const transformStreams = [];
            if (shouldRunValidation) {
                // The x-goog-hash header should be set with a crc32c and md5 hash.
                // ex: headers['x-goog-hash'] = 'crc32c=xxxx,md5=xxxx'
                if (typeof headers['x-goog-hash'] === 'string') {
                    headers['x-goog-hash']
                        .split(',')
                        .forEach((hashKeyValPair) => {
                        const delimiterIndex = hashKeyValPair.indexOf('=');
                        const hashType = hashKeyValPair.substring(0, delimiterIndex);
                        const hashValue = hashKeyValPair.substring(delimiterIndex + 1);
                        hashes[hashType] = hashValue;
                    });
                }
                validateStream = new HashStreamValidator({
                    crc32c,
                    md5,
                    crc32cGenerator: this.crc32cGenerator,
                    crc32cExpected: hashes.crc32c,
                    md5Expected: hashes.md5,
                });
            }
            if (md5 && !hashes.md5) {
                const hashError = new RequestError(FileExceptionMessages.MD5_NOT_AVAILABLE);
                hashError.code = 'MD5_NOT_AVAILABLE';
                throughStream.destroy(hashError);
                return;
            }
            if (safeToValidate && shouldRunValidation && validateStream) {
                transformStreams.push(validateStream);
            }
            if (isCompressed && options.decompress) {
                transformStreams.push(zlib.createGunzip());
            }
            pipeline(rawResponseStream, ...transformStreams, throughStream, onComplete);
        };
        // Authenticate the request, then pipe the remote API request to the stream
        // returned to the user.
        const makeRequest = () => {
            const query = { alt: 'media' };
            if (this.generation) {
                query.generation = this.generation;
            }
            if (options.userProject) {
                query.userProject = options.userProject;
            }
            const headers = {
                'Accept-Encoding': 'gzip',
                'Cache-Control': 'no-store',
            };
            if (rangeRequest) {
                const start = typeof options.start === 'number' ? options.start : '0';
                const end = typeof options.end === 'number' ? options.end : '';
                headers.Range = `bytes=${tailRequest ? end : `${start}-${end}`}`;
            }
            const reqOpts = {
                uri: '',
                headers,
                qs: query,
            };
            if (options[GCCL_GCS_CMD_KEY]) {
                reqOpts[GCCL_GCS_CMD_KEY] = options[GCCL_GCS_CMD_KEY];
            }
            this.requestStream(reqOpts)
                .on('error', err => {
                throughStream.destroy(err);
            })
                .on('response', res => {
                throughStream.emit('response', res);
                util.handleResp(null, res, null, onResponse);
            })
                .resume();
        };
        throughStream.on('reading', makeRequest);
        return throughStream;
    }
    /**
     * @callback CreateResumableUploadCallback
     * @param {?Error} err Request error, if any.
     * @param {string} uri The resumable upload's unique session URI.
     */
    /**
     * @typedef {array} CreateResumableUploadResponse
     * @property {string} 0 The resumable upload's unique session URI.
     */
    /**
     * @typedef {object} CreateResumableUploadOptions
     * @property {object} [metadata] Metadata to set on the file.
     * @property {number} [offset] The starting byte of the upload stream for resuming an interrupted upload.
     * @property {string} [origin] Origin header to set for the upload.
     * @property {string} [predefinedAcl] Apply a predefined set of access
     * controls to this object.
     *
     * Acceptable values are:
     * - **`authenticatedRead`** - Object owner gets `OWNER` access, and
     *   `allAuthenticatedUsers` get `READER` access.
     *
     * - **`bucketOwnerFullControl`** - Object owner gets `OWNER` access, and
     *   project team owners get `OWNER` access.
     *
     * - **`bucketOwnerRead`** - Object owner gets `OWNER` access, and project
     *   team owners get `READER` access.
     *
     * - **`private`** - Object owner gets `OWNER` access.
     *
     * - **`projectPrivate`** - Object owner gets `OWNER` access, and project
     *   team members get access according to their roles.
     *
     * - **`publicRead`** - Object owner gets `OWNER` access, and `allUsers`
     *   get `READER` access.
     * @property {boolean} [private] Make the uploaded file private. (Alias for
     *     `options.predefinedAcl = 'private'`)
     * @property {boolean} [public] Make the uploaded file public. (Alias for
     *     `options.predefinedAcl = 'publicRead'`)
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @property {string} [chunkSize] Create a separate request per chunk. This
     *     value is in bytes and should be a multiple of 256 KiB (2^18).
     *     {@link https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload| We recommend using at least 8 MiB for the chunk size.}
     */
    /**
     * Create a unique resumable upload session URI. This is the first step when
     * performing a resumable upload.
     *
     * See the {@link https://cloud.google.com/storage/docs/json_api/v1/how-tos/resumable-upload| Resumable upload guide}
     * for more on how the entire process works.
     *
     * <h4>Note</h4>
     *
     * If you are just looking to perform a resumable upload without worrying
     * about any of the details, see {@link File#createWriteStream}. Resumable
     * uploads are performed by default.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/how-tos/resumable-upload| Resumable upload guide}
     *
     * @param {CreateResumableUploadOptions} [options] Configuration options.
     * @param {CreateResumableUploadCallback} [callback] Callback function.
     * @returns {Promise<CreateResumableUploadResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * file.createResumableUpload(function(err, uri) {
     *   if (!err) {
     *     // `uri` can be used to PUT data to.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.createResumableUpload().then(function(data) {
     *   const uri = data[0];
     * });
     * ```
     */
    createResumableUpload(optionsOrCallback, callback) {
        var _a, _b;
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const retryOptions = this.storage.retryOptions;
        if ((((_a = options === null || options === void 0 ? void 0 : options.preconditionOpts) === null || _a === void 0 ? void 0 : _a.ifGenerationMatch) === undefined &&
            ((_b = this.instancePreconditionOpts) === null || _b === void 0 ? void 0 : _b.ifGenerationMatch) === undefined &&
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryConditional) ||
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryNever) {
            retryOptions.autoRetry = false;
        }
        resumableUpload.createURI({
            authClient: this.storage.authClient,
            apiEndpoint: this.storage.apiEndpoint,
            bucket: this.bucket.name,
            customRequestOptions: this.getRequestInterceptors().reduce((reqOpts, interceptorFn) => interceptorFn(reqOpts), {}),
            file: this.name,
            generation: this.generation,
            key: this.encryptionKey,
            kmsKeyName: this.kmsKeyName,
            metadata: options.metadata,
            offset: options.offset,
            origin: options.origin,
            predefinedAcl: options.predefinedAcl,
            private: options.private,
            public: options.public,
            userProject: options.userProject || this.userProject,
            retryOptions: retryOptions,
            params: (options === null || options === void 0 ? void 0 : options.preconditionOpts) || this.instancePreconditionOpts,
            universeDomain: this.bucket.storage.universeDomain,
            useAuthWithCustomEndpoint: this.storage.useAuthWithCustomEndpoint,
            [GCCL_GCS_CMD_KEY]: options[GCCL_GCS_CMD_KEY],
        }, callback);
        this.storage.retryOptions.autoRetry = this.instanceRetryValue;
    }
    /**
     * @typedef {object} CreateWriteStreamOptions Configuration options for File#createWriteStream().
     * @property {string} [contentType] Alias for
     *     `options.metadata.contentType`. If set to `auto`, the file name is used
     *     to determine the contentType.
     * @property {string|boolean} [gzip] If true, automatically gzip the file.
     *     If set to `auto`, the contentType is used to determine if the file
     * should be gzipped. This will set `options.metadata.contentEncoding` to
     * `gzip` if necessary.
     * @property {object} [metadata] See the examples below or
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects/insert#request_properties_JSON| Objects: insert request body}
     *     for more details.
     * @property {number} [offset] The starting byte of the upload stream, for
     *     resuming an interrupted upload. Defaults to 0.
     * @property {string} [predefinedAcl] Apply a predefined set of access
     * controls to this object.
     *
     * Acceptable values are:
     * - **`authenticatedRead`** - Object owner gets `OWNER` access, and
     *   `allAuthenticatedUsers` get `READER` access.
     *
     * - **`bucketOwnerFullControl`** - Object owner gets `OWNER` access, and
     *   project team owners get `OWNER` access.
     *
     * - **`bucketOwnerRead`** - Object owner gets `OWNER` access, and project
     *   team owners get `READER` access.
     *
     * - **`private`** - Object owner gets `OWNER` access.
     *
     * - **`projectPrivate`** - Object owner gets `OWNER` access, and project
     *   team members get access according to their roles.
     *
     * - **`publicRead`** - Object owner gets `OWNER` access, and `allUsers`
     *   get `READER` access.
     * @property {boolean} [private] Make the uploaded file private. (Alias for
     *     `options.predefinedAcl = 'private'`)
     * @property {boolean} [public] Make the uploaded file public. (Alias for
     *     `options.predefinedAcl = 'publicRead'`)
     * @property {boolean} [resumable] Force a resumable upload. NOTE: When
     *     working with streams, the file format and size is unknown until it's
     *     completely consumed. Because of this, it's best for you to be explicit
     *     for what makes sense given your input.
     * @property {number} [timeout=60000] Set the HTTP request timeout in
     *     milliseconds. This option is not available for resumable uploads.
     *     Default: `60000`
     * @property {string} [uri] The URI for an already-created resumable
     *     upload. See {@link File#createResumableUpload}.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @property {string|boolean} [validation] Possible values: `"md5"`,
     *     `"crc32c"`, or `false`. By default, data integrity is validated with a
     *     CRC32c checksum. You may use MD5 if preferred, but that hash is not
     *     supported for composite objects. An error will be raised if MD5 is
     *     specified but is not available. You may also choose to skip validation
     *     completely, however this is **not recommended**. In addition to specifying
     *     validation type, providing `metadata.crc32c` or `metadata.md5Hash` will
     *     cause the server to perform validation in addition to client validation.
     *     NOTE: Validation is automatically skipped for objects that were
     *     uploaded using the `gzip` option and have already compressed content.
     */
    /**
     * Create a writable stream to overwrite the contents of the file in your
     * bucket.
     *
     * A File object can also be used to create files for the first time.
     *
     * Resumable uploads are automatically enabled and must be shut off explicitly
     * by setting `options.resumable` to `false`.
     *
     *
     * <p class="notice">
     *   There is some overhead when using a resumable upload that can cause
     *   noticeable performance degradation while uploading a series of small
     *   files. When uploading files less than 10MB, it is recommended that the
     *   resumable feature is disabled.
     * </p>
     *
     * NOTE: Writable streams will emit the `finish` event when the file is fully
     * uploaded.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/how-tos/upload Upload Options (Simple or Resumable)}
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/insert Objects: insert API Documentation}
     *
     * @param {CreateWriteStreamOptions} [options] Configuration options.
     * @returns {WritableStream}
     *
     * @example
     * ```
     * const fs = require('fs');
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * //-
     * // <h4>Uploading a File</h4>
     * //
     * // Now, consider a case where we want to upload a file to your bucket. You
     * // have the option of using {@link Bucket#upload}, but that is just
     * // a convenience method which will do the following.
     * //-
     * fs.createReadStream('/Users/stephen/Photos/birthday-at-the-zoo/panda.jpg')
     *   .pipe(file.createWriteStream())
     *   .on('error', function(err) {})
     *   .on('finish', function() {
     *     // The file upload is complete.
     *   });
     *
     * //-
     * // <h4>Uploading a File with gzip compression</h4>
     * //-
     * fs.createReadStream('/Users/stephen/site/index.html')
     *   .pipe(file.createWriteStream({ gzip: true }))
     *   .on('error', function(err) {})
     *   .on('finish', function() {
     *     // The file upload is complete.
     *   });
     *
     * //-
     * // Downloading the file with `createReadStream` will automatically decode
     * // the file.
     * //-
     *
     * //-
     * // <h4>Uploading a File with Metadata</h4>
     * //
     * // One last case you may run into is when you want to upload a file to your
     * // bucket and set its metadata at the same time. Like above, you can use
     * // {@link Bucket#upload} to do this, which is just a wrapper around
     * // the following.
     * //-
     * fs.createReadStream('/Users/stephen/Photos/birthday-at-the-zoo/panda.jpg')
     *   .pipe(file.createWriteStream({
     *     metadata: {
     *       contentType: 'image/jpeg',
     *       metadata: {
     *         custom: 'metadata'
     *       }
     *     }
     *   }))
     *   .on('error', function(err) {})
     *   .on('finish', function() {
     *     // The file upload is complete.
     *   });
     * ```
     *
     * //-
     * // <h4>Continuing a Resumable Upload</h4>
     * //
     * // One can capture a `uri` from a resumable upload to reuse later.
     * // Additionally, for validation, one can also capture and pass `crc32c`.
     * //-
     * let uri: string | undefined = undefined;
     * let resumeCRC32C: string | undefined = undefined;
     *
     * fs.createWriteStream()
     *   .on('uri', link => {uri = link})
     *   .on('crc32', crc32c => {resumeCRC32C = crc32c});
     *
     * // later...
     * fs.createWriteStream({uri, resumeCRC32C});
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createWriteStream(options = {}) {
        var _a;
        (_a = options.metadata) !== null && _a !== void 0 ? _a : (options.metadata = {});
        if (options.contentType) {
            options.metadata.contentType = options.contentType;
        }
        if (!options.metadata.contentType ||
            options.metadata.contentType === 'auto') {
            const detectedContentType = mime.getType(this.name);
            if (detectedContentType) {
                options.metadata.contentType = detectedContentType;
            }
        }
        let gzip = options.gzip;
        if (gzip === 'auto') {
            gzip = COMPRESSIBLE_MIME_REGEX.test(options.metadata.contentType || '');
        }
        if (gzip) {
            options.metadata.contentEncoding = 'gzip';
        }
        let crc32c = true;
        let md5 = false;
        if (typeof options.validation === 'string') {
            options.validation = options.validation.toLowerCase();
            crc32c = options.validation === 'crc32c';
            md5 = options.validation === 'md5';
        }
        else if (options.validation === false) {
            crc32c = false;
            md5 = false;
        }
        if (options.offset) {
            if (md5) {
                throw new RangeError(FileExceptionMessages.MD5_RESUMED_UPLOAD);
            }
            if (crc32c && !options.isPartialUpload && !options.resumeCRC32C) {
                throw new RangeError(FileExceptionMessages.MISSING_RESUME_CRC32C_FINAL_UPLOAD);
            }
        }
        /**
         * A callback for determining when the underlying pipeline is complete.
         * It's possible the pipeline callback could error before the write stream
         * calls `final` so by default this will destroy the write stream unless the
         * write stream sets this callback via its `final` handler.
         * @param error An optional error
         */
        let pipelineCallback = error => {
            writeStream.destroy(error || undefined);
        };
        // A stream for consumer to write to
        const writeStream = new Writable({
            final(cb) {
                // Set the pipeline callback to this callback so the pipeline's results
                // can be populated to the consumer
                pipelineCallback = cb;
                emitStream.end();
            },
            write(chunk, encoding, cb) {
                emitStream.write(chunk, encoding, cb);
            },
        });
        // If the write stream, which is returned to the caller, catches an error we need to make sure that
        // at least one of the streams in the pipeline below gets notified so that they
        // all get cleaned up / destroyed.
        writeStream.once('error', e => {
            emitStream.destroy(e);
        });
        // If the write stream is closed, cleanup the pipeline below by calling destroy on one of the streams.
        writeStream.once('close', () => {
            emitStream.destroy();
        });
        const transformStreams = [];
        if (gzip) {
            transformStreams.push(zlib.createGzip());
        }
        const emitStream = new PassThroughShim();
        // If `writeStream` is destroyed before the `writing` event, `emitStream` will not have any listeners. This prevents an unhandled error.
        const noop = () => { };
        emitStream.on('error', noop);
        let hashCalculatingStream = null;
        if (crc32c || md5) {
            const crc32cInstance = options.resumeCRC32C
                ? CRC32C.from(options.resumeCRC32C)
                : undefined;
            hashCalculatingStream = new HashStreamValidator({
                crc32c,
                crc32cInstance,
                md5,
                crc32cGenerator: this.crc32cGenerator,
                updateHashesOnly: true,
            });
            transformStreams.push(hashCalculatingStream);
        }
        const fileWriteStream = duplexify();
        let fileWriteStreamMetadataReceived = false;
        // Handing off emitted events to users
        emitStream.on('reading', () => writeStream.emit('reading'));
        emitStream.on('writing', () => writeStream.emit('writing'));
        fileWriteStream.on('uri', evt => writeStream.emit('uri', evt));
        fileWriteStream.on('progress', evt => writeStream.emit('progress', evt));
        fileWriteStream.on('response', resp => writeStream.emit('response', resp));
        fileWriteStream.once('metadata', () => {
            fileWriteStreamMetadataReceived = true;
        });
        writeStream.once('writing', () => {
            if (options.resumable === false) {
                this.startSimpleUpload_(fileWriteStream, options);
            }
            else {
                this.startResumableUpload_(fileWriteStream, options);
            }
            // remove temporary noop listener as we now create a pipeline that handles the errors
            emitStream.removeListener('error', noop);
            pipeline(emitStream, ...transformStreams, fileWriteStream, async (e) => {
                if (e) {
                    return pipelineCallback(e);
                }
                // If this is a partial upload, we don't expect final metadata yet.
                if (options.isPartialUpload) {
                    // Emit CRC32c for this completed chunk if hash validation is active.
                    if (hashCalculatingStream === null || hashCalculatingStream === void 0 ? void 0 : hashCalculatingStream.crc32c) {
                        writeStream.emit('crc32c', hashCalculatingStream.crc32c);
                    }
                    // Resolve the pipeline for this *partial chunk*.
                    return pipelineCallback();
                }
                // We want to make sure we've received the metadata from the server in order
                // to properly validate the object's integrity. Depending on the type of upload,
                // the stream could close before the response is returned.
                if (!fileWriteStreamMetadataReceived) {
                    try {
                        await new Promise((resolve, reject) => {
                            fileWriteStream.once('metadata', resolve);
                            fileWriteStream.once('error', reject);
                        });
                    }
                    catch (e) {
                        return pipelineCallback(e);
                    }
                }
                // Emit the local CRC32C value for future validation, if validation is enabled.
                if (hashCalculatingStream === null || hashCalculatingStream === void 0 ? void 0 : hashCalculatingStream.crc32c) {
                    writeStream.emit('crc32c', hashCalculatingStream.crc32c);
                }
                try {
                    // Metadata may not be ready if the upload is a partial upload,
                    // nothing to validate yet.
                    const metadataNotReady = options.isPartialUpload && !this.metadata;
                    if (hashCalculatingStream && !metadataNotReady) {
                        await __classPrivateFieldGet(this, _File_instances, "m", _File_validateIntegrity).call(this, hashCalculatingStream, {
                            crc32c,
                            md5,
                        });
                    }
                    pipelineCallback();
                }
                catch (e) {
                    pipelineCallback(e);
                }
            });
        });
        return writeStream;
    }
    delete(optionsOrCallback, cb) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
        this.disableAutoRetryConditionallyIdempotent_(this.methods.delete, AvailableServiceObjectMethods.delete, options);
        super
            .delete(options)
            .then(resp => cb(null, ...resp))
            .catch(cb)
            .finally(() => {
            this.storage.retryOptions.autoRetry = this.instanceRetryValue;
        });
    }
    /**
     * @typedef {array} DownloadResponse
     * @property [0] The contents of a File.
     */
    /**
     * @callback DownloadCallback
     * @param err Request error, if any.
     * @param contents The contents of a File.
     */
    /**
     * Convenience method to download a file into memory or to a local
     * destination.
     *
     * @param {object} [options] Configuration options. The arguments match those
     *     passed to {@link File#createReadStream}.
     * @param {string} [options.destination] Local file path to write the file's
     *     contents to.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {DownloadCallback} [callback] Callback function.
     * @returns {Promise<DownloadResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * //-
     * // Download a file into memory. The contents will be available as the
     * second
     * // argument in the demonstration below, `contents`.
     * //-
     * file.download(function(err, contents) {});
     *
     * //-
     * // Download a file to a local destination.
     * //-
     * file.download({
     *   destination: '/Users/me/Desktop/file-backup.txt'
     * }, function(err) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.download().then(function(data) {
     *   const contents = data[0];
     * });
     *
     * ```
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_download_file
     * Another example:
     *
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_download_encrypted_file
     * Example of downloading an encrypted file:
     *
     * @example <caption>include:samples/requesterPays.js</caption>
     * region_tag:storage_download_file_requester_pays
     * Example of downloading a file where the requester pays:
     */
    download(optionsOrCallback, cb) {
        let options;
        if (typeof optionsOrCallback === 'function') {
            cb = optionsOrCallback;
            options = {};
        }
        else {
            options = Object.assign({}, optionsOrCallback);
        }
        let called = false;
        const callback = ((...args) => {
            if (!called)
                cb(...args);
            called = true;
        });
        const destination = options.destination;
        delete options.destination;
        if (options.encryptionKey) {
            this.setEncryptionKey(options.encryptionKey);
            delete options.encryptionKey;
        }
        const fileStream = this.createReadStream(options);
        let receivedData = false;
        if (destination) {
            fileStream
                .on('error', callback)
                .once('data', data => {
                receivedData = true;
                // We know that the file exists the server - now we can truncate/write to a file
                const writable = fs.createWriteStream(destination);
                writable.write(data);
                fileStream
                    .pipe(writable)
                    .on('error', (err) => {
                    callback(err, Buffer.from(''));
                })
                    .on('finish', () => {
                    callback(null, data);
                });
            })
                .on('end', () => {
                // In the case of an empty file no data will be received before the end event fires
                if (!receivedData) {
                    const data = Buffer.alloc(0);
                    try {
                        fs.writeFileSync(destination, data);
                        callback(null, data);
                    }
                    catch (e) {
                        callback(e, data);
                    }
                }
            });
        }
        else {
            this.getBufferFromReadable(fileStream)
                .then(contents => callback === null || callback === void 0 ? void 0 : callback(null, contents))
                .catch(callback);
        }
    }
    /**
     * The Storage API allows you to use a custom key for server-side encryption.
     *
     * See {@link https://cloud.google.com/storage/docs/encryption#customer-supplied| Customer-supplied Encryption Keys}
     *
     * @param {string|buffer} encryptionKey An AES-256 encryption key.
     * @returns {File}
     *
     * @example
     * ```
     * const crypto = require('crypto');
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const encryptionKey = crypto.randomBytes(32);
     *
     * const fileWithCustomEncryption = myBucket.file('my-file');
     * fileWithCustomEncryption.setEncryptionKey(encryptionKey);
     *
     * const fileWithoutCustomEncryption = myBucket.file('my-file');
     *
     * fileWithCustomEncryption.save('data', function(err) {
     *   // Try to download with the File object that hasn't had
     *   // `setEncryptionKey()` called:
     *   fileWithoutCustomEncryption.download(function(err) {
     *     // We will receive an error:
     *     //   err.message === 'Bad Request'
     *
     *     // Try again with the File object we called `setEncryptionKey()` on:
     *     fileWithCustomEncryption.download(function(err, contents) {
     *       // contents.toString() === 'data'
     *     });
     *   });
     * });
     *
     * ```
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_upload_encrypted_file
     * Example of uploading an encrypted file:
     *
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_download_encrypted_file
     * Example of downloading an encrypted file:
     */
    setEncryptionKey(encryptionKey) {
        this.encryptionKey = encryptionKey;
        this.encryptionKeyBase64 = Buffer.from(encryptionKey).toString('base64');
        this.encryptionKeyHash = crypto
            .createHash('sha256')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(this.encryptionKeyBase64, 'base64')
            .digest('base64');
        this.encryptionKeyInterceptor = {
            request: reqOpts => {
                reqOpts.headers = reqOpts.headers || {};
                reqOpts.headers['x-goog-encryption-algorithm'] = 'AES256';
                reqOpts.headers['x-goog-encryption-key'] = this.encryptionKeyBase64;
                reqOpts.headers['x-goog-encryption-key-sha256'] =
                    this.encryptionKeyHash;
                return reqOpts;
            },
        };
        this.interceptors.push(this.encryptionKeyInterceptor);
        return this;
    }
    /**
     * Gets a reference to a Cloud Storage {@link File} file from the provided URL in string format.
     * @param {string} publicUrlOrGsUrl the URL as a string. Must be of the format gs://bucket/file
     *  or https://storage.googleapis.com/bucket/file.
     * @param {Storage} storageInstance an instance of a Storage object.
     * @param {FileOptions} [options] Configuration options
     * @returns {File}
     */
    static from(publicUrlOrGsUrl, storageInstance, options) {
        const gsMatches = [...publicUrlOrGsUrl.matchAll(GS_UTIL_URL_REGEX)];
        const httpsMatches = [...publicUrlOrGsUrl.matchAll(HTTPS_PUBLIC_URL_REGEX)];
        if (gsMatches.length > 0) {
            const bucket = new Bucket(storageInstance, gsMatches[0][2]);
            return new File(bucket, gsMatches[0][3], options);
        }
        else if (httpsMatches.length > 0) {
            const bucket = new Bucket(storageInstance, httpsMatches[0][3]);
            return new File(bucket, httpsMatches[0][4], options);
        }
        else {
            throw new Error('URL string must be of format gs://bucket/file or https://storage.googleapis.com/bucket/file');
        }
    }
    get(optionsOrCallback, cb) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        cb =
            typeof optionsOrCallback === 'function'
                ? optionsOrCallback
                : cb;
        super
            .get(options)
            .then(resp => cb(null, ...resp))
            .catch(cb);
    }
    /**
     * @typedef {array} GetExpirationDateResponse
     * @property {date} 0 A Date object representing the earliest time this file's
     *     retention policy will expire.
     */
    /**
     * @callback GetExpirationDateCallback
     * @param {?Error} err Request error, if any.
     * @param {date} expirationDate A Date object representing the earliest time
     *     this file's retention policy will expire.
     */
    /**
     * If this bucket has a retention policy defined, use this method to get a
     * Date object representing the earliest time this file will expire.
     *
     * @param {GetExpirationDateCallback} [callback] Callback function.
     * @returns {Promise<GetExpirationDateResponse>}
     *
     * @example
     * ```
     * const storage = require('@google-cloud/storage')();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * file.getExpirationDate(function(err, expirationDate) {
     *   // expirationDate is a Date object.
     * });
     * ```
     */
    getExpirationDate(callback) {
        this.getMetadata((err, metadata, apiResponse) => {
            if (err) {
                callback(err, null, apiResponse);
                return;
            }
            if (!metadata.retentionExpirationTime) {
                const error = new Error(FileExceptionMessages.EXPIRATION_TIME_NA);
                callback(error, null, apiResponse);
                return;
            }
            callback(null, new Date(metadata.retentionExpirationTime), apiResponse);
        });
    }
    /**
     * @typedef {array} GenerateSignedPostPolicyV2Response
     * @property {object} 0 The document policy.
     */
    /**
     * @callback GenerateSignedPostPolicyV2Callback
     * @param {?Error} err Request error, if any.
     * @param {object} policy The document policy.
     */
    /**
     * Get a signed policy document to allow a user to upload data with a POST
     * request.
     *
     * In Google Cloud Platform environments, such as Cloud Functions and App
     * Engine, you usually don't provide a `keyFilename` or `credentials` during
     * instantiation. In those environments, we call the
     * {@link https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signBlob| signBlob API}
     * to create a signed policy. That API requires either the
     * `https://www.googleapis.com/auth/iam` or
     * `https://www.googleapis.com/auth/cloud-platform` scope, so be sure they are
     * enabled.
     *
     * See {@link https://cloud.google.com/storage/docs/xml-api/post-object-v2| POST Object with the V2 signing process}
     *
     * @throws {Error} If an expiration timestamp from the past is given.
     * @throws {Error} If options.equals has an array with less or more than two
     *     members.
     * @throws {Error} If options.startsWith has an array with less or more than two
     *     members.
     *
     * @param {object} options Configuration options.
     * @param {array|array[]} [options.equals] Array of request parameters and
     *     their expected value (e.g. [['$<field>', '<value>']]). Values are
     *     translated into equality constraints in the conditions field of the
     *     policy document (e.g. ['eq', '$<field>', '<value>']). If only one
     *     equality condition is to be specified, options.equals can be a one-
     *     dimensional array (e.g. ['$<field>', '<value>']).
     * @param {*} options.expires - A timestamp when this policy will expire. Any
     *     value given is passed to `new Date()`.
     * @param {array|array[]} [options.startsWith] Array of request parameters and
     *     their expected prefixes (e.g. [['$<field>', '<value>']). Values are
     *     translated into starts-with constraints in the conditions field of the
     *     policy document (e.g. ['starts-with', '$<field>', '<value>']). If only
     *     one prefix condition is to be specified, options.startsWith can be a
     * one- dimensional array (e.g. ['$<field>', '<value>']).
     * @param {string} [options.acl] ACL for the object from possibly predefined
     *     ACLs.
     * @param {string} [options.successRedirect] The URL to which the user client
     *     is redirected if the upload is successful.
     * @param {string} [options.successStatus] - The status of the Google Storage
     *     response if the upload is successful (must be string).
     * @param {object} [options.contentLengthRange]
     * @param {number} [options.contentLengthRange.min] Minimum value for the
     *     request's content length.
     * @param {number} [options.contentLengthRange.max] Maximum value for the
     *     request's content length.
     * @param {GenerateSignedPostPolicyV2Callback} [callback] Callback function.
     * @returns {Promise<GenerateSignedPostPolicyV2Response>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * const options = {
     *   equals: ['$Content-Type', 'image/jpeg'],
     *   expires: '10-25-2022',
     *   contentLengthRange: {
     *     min: 0,
     *     max: 1024
     *   }
     * };
     *
     * file.generateSignedPostPolicyV2(options, function(err, policy) {
     *   // policy.string: the policy document in plain text.
     *   // policy.base64: the policy document in base64.
     *   // policy.signature: the policy signature in base64.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.generateSignedPostPolicyV2(options).then(function(data) {
     *   const policy = data[0];
     * });
     * ```
     */
    generateSignedPostPolicyV2(optionsOrCallback, cb) {
        const args = normalize(optionsOrCallback, cb);
        let options = args.options;
        const callback = args.callback;
        const expires = new Date(options.expires);
        if (isNaN(expires.getTime())) {
            throw new Error(ExceptionMessages.EXPIRATION_DATE_INVALID);
        }
        if (expires.valueOf() < Date.now()) {
            throw new Error(ExceptionMessages.EXPIRATION_DATE_PAST);
        }
        options = Object.assign({}, options);
        const conditions = [
            ['eq', '$key', this.name],
            {
                bucket: this.bucket.name,
            },
        ];
        if (Array.isArray(options.equals)) {
            if (!Array.isArray(options.equals[0])) {
                options.equals = [options.equals];
            }
            options.equals.forEach(condition => {
                if (!Array.isArray(condition) || condition.length !== 2) {
                    throw new Error(FileExceptionMessages.EQUALS_CONDITION_TWO_ELEMENTS);
                }
                conditions.push(['eq', condition[0], condition[1]]);
            });
        }
        if (Array.isArray(options.startsWith)) {
            if (!Array.isArray(options.startsWith[0])) {
                options.startsWith = [options.startsWith];
            }
            options.startsWith.forEach(condition => {
                if (!Array.isArray(condition) || condition.length !== 2) {
                    throw new Error(FileExceptionMessages.STARTS_WITH_TWO_ELEMENTS);
                }
                conditions.push(['starts-with', condition[0], condition[1]]);
            });
        }
        if (options.acl) {
            conditions.push({
                acl: options.acl,
            });
        }
        if (options.successRedirect) {
            conditions.push({
                success_action_redirect: options.successRedirect,
            });
        }
        if (options.successStatus) {
            conditions.push({
                success_action_status: options.successStatus,
            });
        }
        if (options.contentLengthRange) {
            const min = options.contentLengthRange.min;
            const max = options.contentLengthRange.max;
            if (typeof min !== 'number' || typeof max !== 'number') {
                throw new Error(FileExceptionMessages.CONTENT_LENGTH_RANGE_MIN_MAX);
            }
            conditions.push(['content-length-range', min, max]);
        }
        const policy = {
            expiration: expires.toISOString(),
            conditions,
        };
        const policyString = JSON.stringify(policy);
        const policyBase64 = Buffer.from(policyString).toString('base64');
        this.storage.authClient.sign(policyBase64, options.signingEndpoint).then(signature => {
            callback(null, {
                string: policyString,
                base64: policyBase64,
                signature,
            });
        }, err => {
            callback(new SigningError(err.message));
        });
    }
    /**
     * @typedef {object} SignedPostPolicyV4Output
     * @property {string} url The request URL.
     * @property {object} fields The form fields to include in the POST request.
     */
    /**
     * @typedef {array} GenerateSignedPostPolicyV4Response
     * @property {SignedPostPolicyV4Output} 0 An object containing the request URL and form fields.
     */
    /**
     * @callback GenerateSignedPostPolicyV4Callback
     * @param {?Error} err Request error, if any.
     * @param {SignedPostPolicyV4Output} output An object containing the request URL and form fields.
     */
    /**
     * Get a v4 signed policy document to allow a user to upload data with a POST
     * request.
     *
     * In Google Cloud Platform environments, such as Cloud Functions and App
     * Engine, you usually don't provide a `keyFilename` or `credentials` during
     * instantiation. In those environments, we call the
     * {@link https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signBlob| signBlob API}
     * to create a signed policy. That API requires either the
     * `https://www.googleapis.com/auth/iam` or
     * `https://www.googleapis.com/auth/cloud-platform` scope, so be sure they are
     * enabled.
     *
     * See {@link https://cloud.google.com/storage/docs/xml-api/post-object#policydocument| Policy Document Reference}
     *
     * @param {object} options Configuration options.
     * @param {Date|number|string} options.expires - A timestamp when this policy will expire. Any
     *     value given is passed to `new Date()`.
     * @param {boolean} [config.virtualHostedStyle=false] Use virtual hosted-style
     *     URLs ('https://mybucket.storage.googleapis.com/...') instead of path-style
     *     ('https://storage.googleapis.com/mybucket/...'). Virtual hosted-style URLs
     *     should generally be preferred instead of path-style URL.
     *     Currently defaults to `false` for path-style, although this may change in a
     *     future major-version release.
     * @param {string} [config.bucketBoundHostname] The bucket-bound hostname to return in
     *     the result, e.g. "https://cdn.example.com".
     * @param {object} [config.fields] [Form fields]{@link https://cloud.google.com/storage/docs/xml-api/post-object#policydocument}
     *     to include in the signed policy. Any fields with key beginning with 'x-ignore-'
     *     will not be included in the policy to be signed.
     * @param {object[]} [config.conditions] [Conditions]{@link https://cloud.google.com/storage/docs/authentication/signatures#policy-document}
     *     to include in the signed policy. All fields given in `config.fields` are
     *     automatically included in the conditions array, adding the same entry
     *     in both `fields` and `conditions` will result in duplicate entries.
     *
     * @param {GenerateSignedPostPolicyV4Callback} [callback] Callback function.
     * @returns {Promise<GenerateSignedPostPolicyV4Response>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * const options = {
     *   expires: '10-25-2022',
     *   conditions: [
     *     ['eq', '$Content-Type', 'image/jpeg'],
     *     ['content-length-range', 0, 1024],
     *   ],
     *   fields: {
     *     acl: 'public-read',
     *     'x-goog-meta-foo': 'bar',
     *     'x-ignore-mykey': 'data'
     *   }
     * };
     *
     * file.generateSignedPostPolicyV4(options, function(err, response) {
     *   // response.url The request URL
     *   // response.fields The form fields (including the signature) to include
     *   //     to be used to upload objects by HTML forms.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.generateSignedPostPolicyV4(options).then(function(data) {
     *   const response = data[0];
     *   // response.url The request URL
     *   // response.fields The form fields (including the signature) to include
     *   //     to be used to upload objects by HTML forms.
     * });
     * ```
     */
    generateSignedPostPolicyV4(optionsOrCallback, cb) {
        const args = normalize(optionsOrCallback, cb);
        let options = args.options;
        const callback = args.callback;
        const expires = new Date(options.expires);
        if (isNaN(expires.getTime())) {
            throw new Error(ExceptionMessages.EXPIRATION_DATE_INVALID);
        }
        if (expires.valueOf() < Date.now()) {
            throw new Error(ExceptionMessages.EXPIRATION_DATE_PAST);
        }
        if (expires.valueOf() - Date.now() > SEVEN_DAYS * 1000) {
            throw new Error(`Max allowed expiration is seven days (${SEVEN_DAYS} seconds).`);
        }
        options = Object.assign({}, options);
        let fields = Object.assign({}, options.fields);
        const now = new Date();
        const nowISO = formatAsUTCISO(now, true);
        const todayISO = formatAsUTCISO(now);
        const sign = async () => {
            const { client_email } = await this.storage.authClient.getCredentials();
            const credential = `${client_email}/${todayISO}/auto/storage/goog4_request`;
            fields = {
                ...fields,
                bucket: this.bucket.name,
                key: this.name,
                'x-goog-date': nowISO,
                'x-goog-credential': credential,
                'x-goog-algorithm': 'GOOG4-RSA-SHA256',
            };
            const conditions = options.conditions || [];
            Object.entries(fields).forEach(([key, value]) => {
                if (!key.startsWith('x-ignore-')) {
                    conditions.push({ [key]: value });
                }
            });
            delete fields.bucket;
            const expiration = formatAsUTCISO(expires, true, '-', ':');
            const policy = {
                conditions,
                expiration,
            };
            const policyString = unicodeJSONStringify(policy);
            const policyBase64 = Buffer.from(policyString).toString('base64');
            try {
                const signature = await this.storage.authClient.sign(policyBase64, options.signingEndpoint);
                const signatureHex = Buffer.from(signature, 'base64').toString('hex');
                const universe = this.parent.storage.universeDomain;
                fields['policy'] = policyBase64;
                fields['x-goog-signature'] = signatureHex;
                let url;
                if (this.storage.customEndpoint) {
                    url = this.storage.apiEndpoint;
                }
                else if (options.virtualHostedStyle) {
                    url = `https://${this.bucket.name}.storage.${universe}/`;
                }
                else if (options.bucketBoundHostname) {
                    url = `${options.bucketBoundHostname}/`;
                }
                else {
                    url = `https://storage.${universe}/${this.bucket.name}/`;
                }
                return {
                    url,
                    fields,
                };
            }
            catch (err) {
                throw new SigningError(err.message);
            }
        };
        sign().then(res => callback(null, res), callback);
    }
    /**
     * @typedef {array} GetSignedUrlResponse
     * @property {object} 0 The signed URL.
     */
    /**
     * @callback GetSignedUrlCallback
     * @param {?Error} err Request error, if any.
     * @param {object} url The signed URL.
     */
    /**
     * Get a signed URL to allow limited time access to the file.
     *
     * In Google Cloud Platform environments, such as Cloud Functions and App
     * Engine, you usually don't provide a `keyFilename` or `credentials` during
     * instantiation. In those environments, we call the
     * {@link https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signBlob| signBlob API}
     * to create a signed URL. That API requires either the
     * `https://www.googleapis.com/auth/iam` or
     * `https://www.googleapis.com/auth/cloud-platform` scope, so be sure they are
     * enabled.
     *
     * See {@link https://cloud.google.com/storage/docs/access-control/signed-urls| Signed URLs Reference}
     *
     * @throws {Error} if an expiration timestamp from the past is given.
     *
     * @param {object} config Configuration object.
     * @param {string} config.action "read" (HTTP: GET), "write" (HTTP: PUT), or
     *     "delete" (HTTP: DELETE), "resumable" (HTTP: POST).
     *     When using "resumable", the header `X-Goog-Resumable: start` has
     *     to be sent when making a request with the signed URL.
     * @param {*} config.expires A timestamp when this link will expire. Any value
     *     given is passed to `new Date()`.
     *     Note: 'v4' supports maximum duration of 7 days (604800 seconds) from now.
     *     See [reference]{@link https://cloud.google.com/storage/docs/access-control/signed-urls#example}
     * @param {string} [config.version='v2'] The signing version to use, either
     *     'v2' or 'v4'.
     * @param {boolean} [config.virtualHostedStyle=false] Use virtual hosted-style
     *     URLs (e.g. 'https://mybucket.storage.googleapis.com/...') instead of path-style
     *     (e.g. 'https://storage.googleapis.com/mybucket/...'). Virtual hosted-style URLs
     *     should generally be preferred instead of path-style URL.
     *     Currently defaults to `false` for path-style, although this may change in a
     *     future major-version release.
     * @param {string} [config.cname] The cname for this bucket, i.e.,
     *     "https://cdn.example.com".
     * @param {string} [config.contentMd5] The MD5 digest value in base64. Just like
     *     if you provide this, the client must provide this HTTP header with this same
     *     value in its request, so to if this parameter is not provided here,
     *     the client must not provide any value for this HTTP header in its request.
     * @param {string} [config.contentType] Just like if you provide this, the client
     *     must provide this HTTP header with this same value in its request, so to if
     *     this parameter is not provided here, the client must not provide any value
     *     for this HTTP header in its request.
     * @param {object} [config.extensionHeaders] If these headers are used, the
     * server will check to make sure that the client provides matching
     * values. See {@link https://cloud.google.com/storage/docs/access-control/signed-urls#about-canonical-extension-headers| Canonical extension headers}
     * for the requirements of this feature, most notably:
     * - The header name must be prefixed with `x-goog-`
     * - The header name must be all lowercase
     *
     * Note: Multi-valued header passed as an array in the extensionHeaders
     *       object is converted into a string, delimited by `,` with
     *       no space. Requests made using the signed URL will need to
     *       delimit multi-valued headers using a single `,` as well, or
     *       else the server will report a mismatched signature.
     * @param {object} [config.queryParams] Additional query parameters to include
     *     in the signed URL.
     * @param {string} [config.promptSaveAs] The filename to prompt the user to
     *     save the file as when the signed url is accessed. This is ignored if
     *     `config.responseDisposition` is set.
     * @param {string} [config.responseDisposition] The
     *     {@link http://goo.gl/yMWxQV| response-content-disposition parameter} of the
     *     signed url.
     * @param {*} [config.accessibleAt=Date.now()] A timestamp when this link became usable. Any value
     *     given is passed to `new Date()`.
     *     Note: Use for 'v4' only.
     * @param {string} [config.responseType] The response-content-type parameter
     *     of the signed url.
     * @param {GetSignedUrlCallback} [callback] Callback function.
     * @returns {Promise<GetSignedUrlResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * //-
     * // Generate a URL that allows temporary access to download your file.
     * //-
     * const request = require('request');
     *
     * const config = {
     *   action: 'read',
     *   expires: '03-17-2025',
     * };
     *
     * file.getSignedUrl(config, function(err, url) {
     *   if (err) {
     *     console.error(err);
     *     return;
     *   }
     *
     *   // The file is now available to read from this URL.
     *   request(url, function(err, resp) {
     *     // resp.statusCode = 200
     *   });
     * });
     *
     * //-
     * // Generate a URL that allows temporary access to download your file.
     * // Access will begin at accessibleAt and end at expires.
     * //-
     * const request = require('request');
     *
     * const config = {
     *   action: 'read',
     *   expires: '03-17-2025',
     *   accessibleAt: '03-13-2025'
     * };
     *
     * file.getSignedUrl(config, function(err, url) {
     *   if (err) {
     *     console.error(err);
     *     return;
     *   }
     *
     *   // The file will be available to read from this URL from 03-13-2025 to 03-17-2025.
     *   request(url, function(err, resp) {
     *     // resp.statusCode = 200
     *   });
     * });
     *
     * //-
     * // Generate a URL to allow write permissions. This means anyone with this
     * URL
     * // can send a POST request with new data that will overwrite the file.
     * //-
     * file.getSignedUrl({
     *   action: 'write',
     *   expires: '03-17-2025'
     * }, function(err, url) {
     *   if (err) {
     *     console.error(err);
     *     return;
     *   }
     *
     *   // The file is now available to be written to.
     *   const writeStream = request.put(url);
     *   writeStream.end('New data');
     *
     *   writeStream.on('complete', function(resp) {
     *     // Confirm the new content was saved.
     *     file.download(function(err, fileContents) {
     *       console.log('Contents:', fileContents.toString());
     *       // Contents: New data
     *     });
     *   });
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.getSignedUrl(config).then(function(data) {
     *   const url = data[0];
     * });
     *
     * ```
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_generate_signed_url
     * Another example:
     */
    getSignedUrl(cfg, callback) {
        const method = ActionToHTTPMethod[cfg.action];
        const extensionHeaders = objectKeyToLowercase(cfg.extensionHeaders || {});
        if (cfg.action === 'resumable') {
            extensionHeaders['x-goog-resumable'] = 'start';
        }
        const queryParams = Object.assign({}, cfg.queryParams);
        if (typeof cfg.responseType === 'string') {
            queryParams['response-content-type'] = cfg.responseType;
        }
        if (typeof cfg.promptSaveAs === 'string') {
            queryParams['response-content-disposition'] =
                'attachment; filename="' + cfg.promptSaveAs + '"';
        }
        if (typeof cfg.responseDisposition === 'string') {
            queryParams['response-content-disposition'] = cfg.responseDisposition;
        }
        if (this.generation) {
            queryParams['generation'] = this.generation.toString();
        }
        const signConfig = {
            method,
            expires: cfg.expires,
            accessibleAt: cfg.accessibleAt,
            extensionHeaders,
            queryParams,
            contentMd5: cfg.contentMd5,
            contentType: cfg.contentType,
            host: cfg.host,
        };
        if (cfg.cname) {
            signConfig.cname = cfg.cname;
        }
        if (cfg.version) {
            signConfig.version = cfg.version;
        }
        if (cfg.virtualHostedStyle) {
            signConfig.virtualHostedStyle = cfg.virtualHostedStyle;
        }
        if (!this.signer) {
            this.signer = new URLSigner(this.storage.authClient, this.bucket, this, this.storage);
        }
        this.signer
            .getSignedUrl(signConfig)
            .then(signedUrl => callback(null, signedUrl), callback);
    }
    /**
     * @callback IsPublicCallback
     * @param {?Error} err Request error, if any.
     * @param {boolean} resp Whether file is public or not.
     */
    /**
     * @typedef {array} IsPublicResponse
     * @property {boolean} 0 Whether file is public or not.
     */
    /**
     * Check whether this file is public or not by sending
     * a HEAD request without credentials.
     * No errors from the server indicates that the current
     * file is public.
     * A 403-Forbidden error {@link https://cloud.google.com/storage/docs/json_api/v1/status-codes#403_Forbidden}
     * indicates that file is private.
     * Any other non 403 error is propagated to user.
     *
     * @param {IsPublicCallback} [callback] Callback function.
     * @returns {Promise<IsPublicResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * //-
     * // Check whether the file is publicly accessible.
     * //-
     * file.isPublic(function(err, resp) {
     *   if (err) {
     *     console.error(err);
     *     return;
     *   }
     *   console.log(`the file ${file.id} is public: ${resp}`) ;
     * })
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.isPublic().then(function(data) {
     *   const resp = data[0];
     * });
     * ```
     */
    isPublic(callback) {
        var _a;
        // Build any custom headers based on the defined interceptors on the parent
        // storage object and this object
        const storageInterceptors = ((_a = this.storage) === null || _a === void 0 ? void 0 : _a.interceptors) || [];
        const fileInterceptors = this.interceptors || [];
        const allInterceptors = storageInterceptors.concat(fileInterceptors);
        const headers = allInterceptors.reduce((acc, curInterceptor) => {
            const currentHeaders = curInterceptor.request({
                uri: `${this.storage.apiEndpoint}/${this.bucket.name}/${encodeURIComponent(this.name)}`,
            });
            Object.assign(acc, currentHeaders.headers);
            return acc;
        }, {});
        util.makeRequest({
            method: 'GET',
            uri: `${this.storage.apiEndpoint}/${this.bucket.name}/${encodeURIComponent(this.name)}`,
            headers,
        }, {
            retryOptions: this.storage.retryOptions,
        }, (err) => {
            if (err) {
                const apiError = err;
                if (apiError.code === 403) {
                    callback(null, false);
                }
                else {
                    callback(err);
                }
            }
            else {
                callback(null, true);
            }
        });
    }
    /**
     * @typedef {object} MakeFilePrivateOptions Configuration options for File#makePrivate().
     * @property {Metadata} [metadata] Define custom metadata properties to define
     *     along with the operation.
     * @property {boolean} [strict] If true, set the file to be private to
     *     only the owner user. Otherwise, it will be private to the project.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     */
    /**
     * @callback MakeFilePrivateCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * @typedef {array} MakeFilePrivateResponse
     * @property {object} 0 The full API response.
     */
    /**
     * Make a file private to the project and remove all other permissions.
     * Set `options.strict` to true to make the file private to only the owner.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/patch| Objects: patch API Documentation}
     *
     * @param {MakeFilePrivateOptions} [options] Configuration options.
     * @param {MakeFilePrivateCallback} [callback] Callback function.
     * @returns {Promise<MakeFilePrivateResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * //-
     * // Set the file private so only project maintainers can see and modify it.
     * //-
     * file.makePrivate(function(err) {});
     *
     * //-
     * // Set the file private so only the owner can see and modify it.
     * //-
     * file.makePrivate({ strict: true }, function(err) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.makePrivate().then(function(data) {
     *   const apiResponse = data[0];
     * });
     * ```
     */
    makePrivate(optionsOrCallback, callback) {
        var _a, _b;
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const query = {
            predefinedAcl: options.strict ? 'private' : 'projectPrivate',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        };
        if (((_a = options.preconditionOpts) === null || _a === void 0 ? void 0 : _a.ifMetagenerationMatch) !== undefined) {
            query.ifMetagenerationMatch =
                (_b = options.preconditionOpts) === null || _b === void 0 ? void 0 : _b.ifMetagenerationMatch;
            delete options.preconditionOpts;
        }
        if (options.userProject) {
            query.userProject = options.userProject;
        }
        // You aren't allowed to set both predefinedAcl & acl properties on a file,
        // so acl must explicitly be nullified, destroying all previous acls on the
        // file.
        const metadata = { ...options.metadata, acl: null };
        this.setMetadata(metadata, query, callback);
    }
    /**
     * @typedef {array} MakeFilePublicResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback MakeFilePublicCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Set a file to be publicly readable and maintain all previous permissions.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objectAccessControls/insert| ObjectAccessControls: insert API Documentation}
     *
     * @param {MakeFilePublicCallback} [callback] Callback function.
     * @returns {Promise<MakeFilePublicResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * file.makePublic(function(err, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.makePublic().then(function(data) {
     *   const apiResponse = data[0];
     * });
     *
     * ```
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_make_public
     * Another example:
     */
    makePublic(callback) {
        callback = callback || util.noop;
        this.acl.add({
            entity: 'allUsers',
            role: 'READER',
        }, (err, acl, resp) => {
            callback(err, resp);
        });
    }
    /**
     * The public URL of this File
     * Use {@link File#makePublic} to enable anonymous access via the returned URL.
     *
     * @returns {string}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     * const file = bucket.file('my-file');
     *
     * // publicUrl will be "https://storage.googleapis.com/albums/my-file"
     * const publicUrl = file.publicUrl();
     * ```
     */
    publicUrl() {
        return `${this.storage.apiEndpoint}/${this.bucket.name}/${encodeURIComponent(this.name)}`;
    }
    /**
     * @typedef {array} MoveFileAtomicResponse
     * @property {File} 0 The moved {@link File}.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback MoveFileAtomicCallback
     * @param {?Error} err Request error, if any.
     * @param {File} movedFile The moved {@link File}.
     * @param {object} apiResponse The full API response.
     */
    /**
     * @typedef {object} MoveFileAtomicOptions Configuration options for File#moveFileAtomic(). See an
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects#resource| Object resource}.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @property {object} [preconditionOpts] Precondition options.
     * @property {number} [preconditionOpts.ifGenerationMatch] Makes the operation conditional on whether the object's current generation matches the given value.
     */
    /**
     * Move this file within the same bucket.
     * The source object must exist and be a live object.
     * The source and destination object IDs must be different.
     * Overwriting the destination object is allowed by default, but can be prevented
     * using preconditions.
     * If the destination path includes non-existent parent folders, they will be created.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/move| Objects: move API Documentation}
     *
     * @throws {Error} If the destination file is not provided.
     *
     * @param {string|File} destination Destination file name or File object within the same bucket..
     * @param {MoveFileAtomicOptions} [options] Configuration options. See an
     * @param {MoveFileAtomicCallback} [callback] Callback function.
     * @returns {Promise<MoveFileAtomicResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     *
     * //-
     * // Assume 'my-bucket' is a bucket.
     * //-
     * const bucket = storage.bucket('my-bucket');
     * const file = bucket.file('my-image.png');
     *
     * //-
     * // If you pass in a string for the destination, the file is copied to its
     * // current bucket, under the new name provided.
     * //-
     * file.moveFileAtomic('moved-image.png', function(err, movedFile, apiResponse) {
     *   // `my-bucket` now contains:
     *   // - "moved-image.png"
     *
     *   // `movedFile` is an instance of a File object that refers to your new
     *   // file.
     * });
     *
     * //-
     * // Move the file to a subdirectory, creating parent folders if necessary.
     * //-
     * file.moveFileAtomic('new-folder/subfolder/moved-image.png', function(err, movedFile, apiResponse) {
     * // `my-bucket` now contains:
     * // - "new-folder/subfolder/moved-image.png"
     * });
     *
     * //-
     * // Prevent overwriting an existing destination object using preconditions.
     * //-
     * file.moveFileAtomic('existing-destination.png', {
     * preconditionOpts: {
     * ifGenerationMatch: 0 // Fails if the destination object exists.
     * }
     * }, function(err, movedFile, apiResponse) {
     * if (err) {
     * // Handle the error (e.g., the destination object already exists).
     * } else {
     * // Move successful.
     * }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.moveFileAtomic('moved-image.png).then(function(data) {
     *   const newFile = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * ```
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_move_file
     * Another example:
     */
    moveFileAtomic(destination, optionsOrCallback, callback) {
        var _a, _b;
        const noDestinationError = new Error(FileExceptionMessages.DESTINATION_NO_NAME);
        if (!destination) {
            throw noDestinationError;
        }
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = { ...optionsOrCallback };
        }
        callback = callback || util.noop;
        let destName;
        let newFile;
        if (typeof destination === 'string') {
            const parsedDestination = GS_URL_REGEXP.exec(destination);
            if (parsedDestination !== null && parsedDestination.length === 3) {
                destName = parsedDestination[2];
            }
            else {
                destName = destination;
            }
        }
        else if (destination instanceof File) {
            destName = destination.name;
            newFile = destination;
        }
        else {
            throw noDestinationError;
        }
        newFile = newFile || this.bucket.file(destName);
        if (!this.shouldRetryBasedOnPreconditionAndIdempotencyStrat(options === null || options === void 0 ? void 0 : options.preconditionOpts)) {
            this.storage.retryOptions.autoRetry = false;
        }
        const query = {};
        if (options.userProject !== undefined) {
            query.userProject = options.userProject;
            delete options.userProject;
        }
        if (((_a = options.preconditionOpts) === null || _a === void 0 ? void 0 : _a.ifGenerationMatch) !== undefined) {
            query.ifGenerationMatch = (_b = options.preconditionOpts) === null || _b === void 0 ? void 0 : _b.ifGenerationMatch;
            delete options.preconditionOpts;
        }
        this.request({
            method: 'POST',
            uri: `/moveTo/o/${encodeURIComponent(newFile.name)}`,
            qs: query,
            json: options,
        }, (err, resp) => {
            this.storage.retryOptions.autoRetry = this.instanceRetryValue;
            if (err) {
                callback(err, null, resp);
                return;
            }
            callback(null, newFile, resp);
        });
    }
    /**
     * @typedef {array} MoveResponse
     * @property {File} 0 The destination File.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback MoveCallback
     * @param {?Error} err Request error, if any.
     * @param {?File} destinationFile The destination File.
     * @param {object} apiResponse The full API response.
     */
    /**
     * @typedef {object} MoveOptions Configuration options for File#move(). See an
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects#resource| Object resource}.
     * @param {string} [userProject] The ID of the project which will be
     *     billed for the request.
     */
    /**
     * Move this file to another location. By default, this will rename the file
     * and keep it in the same bucket, but you can choose to move it to another
     * Bucket by providing a Bucket or File object or a URL beginning with
     * "gs://".
     *
     * **Warning**:
     * There is currently no atomic `move` method in the Cloud Storage API,
     * so this method is a composition of {@link File#copy} (to the new
     * location) and {@link File#delete} (from the old location). While
     * unlikely, it is possible that an error returned to your callback could be
     * triggered from either one of these API calls failing, which could leave a
     * duplicate file lingering. The error message will indicate what operation
     * has failed.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/copy| Objects: copy API Documentation}
     *
     * @throws {Error} If the destination file is not provided.
     *
     * @param {string|Bucket|File} destination Destination file.
     * @param {MoveCallback} [callback] Callback function.
     * @returns {Promise<MoveResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * //-
     * // You can pass in a variety of types for the destination.
     * //
     * // For all of the below examples, assume we are working with the following
     * // Bucket and File objects.
     * //-
     * const bucket = storage.bucket('my-bucket');
     * const file = bucket.file('my-image.png');
     *
     * //-
     * // If you pass in a string for the destination, the file is moved to its
     * // current bucket, under the new name provided.
     * //-
     * file.move('my-image-new.png', function(err, destinationFile, apiResponse) {
     *   // `my-bucket` no longer contains:
     *   // - "my-image.png"
     *   // but contains instead:
     *   // - "my-image-new.png"
     *
     *   // `destinationFile` is an instance of a File object that refers to your
     *   // new file.
     * });
     *
     * //-
     * // If you pass in a string starting with "gs://" for the destination, the
     * // file is copied to the other bucket and under the new name provided.
     * //-
     * const newLocation = 'gs://another-bucket/my-image-new.png';
     * file.move(newLocation, function(err, destinationFile, apiResponse) {
     *   // `my-bucket` no longer contains:
     *   // - "my-image.png"
     *   //
     *   // `another-bucket` now contains:
     *   // - "my-image-new.png"
     *
     *   // `destinationFile` is an instance of a File object that refers to your
     *   // new file.
     * });
     *
     * //-
     * // If you pass in a Bucket object, the file will be moved to that bucket
     * // using the same name.
     * //-
     * const anotherBucket = gcs.bucket('another-bucket');
     *
     * file.move(anotherBucket, function(err, destinationFile, apiResponse) {
     *   // `my-bucket` no longer contains:
     *   // - "my-image.png"
     *   //
     *   // `another-bucket` now contains:
     *   // - "my-image.png"
     *
     *   // `destinationFile` is an instance of a File object that refers to your
     *   // new file.
     * });
     *
     * //-
     * // If you pass in a File object, you have complete control over the new
     * // bucket and filename.
     * //-
     * const anotherFile = anotherBucket.file('my-awesome-image.png');
     *
     * file.move(anotherFile, function(err, destinationFile, apiResponse) {
     *   // `my-bucket` no longer contains:
     *   // - "my-image.png"
     *   //
     *   // `another-bucket` now contains:
     *   // - "my-awesome-image.png"
     *
     *   // Note:
     *   // The `destinationFile` parameter is equal to `anotherFile`.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.move('my-image-new.png').then(function(data) {
     *   const destinationFile = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * ```
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_move_file
     * Another example:
     */
    move(destination, optionsOrCallback, callback) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        callback = callback || util.noop;
        this.copy(destination, options, (err, destinationFile, copyApiResponse) => {
            if (err) {
                err.message = 'file#copy failed with an error - ' + err.message;
                callback(err, null, copyApiResponse);
                return;
            }
            if (this.name !== destinationFile.name ||
                this.bucket.name !== destinationFile.bucket.name) {
                this.delete(options, (err, apiResponse) => {
                    if (err) {
                        err.message = 'file#delete failed with an error - ' + err.message;
                        callback(err, destinationFile, apiResponse);
                        return;
                    }
                    callback(null, destinationFile, copyApiResponse);
                });
            }
            else {
                callback(null, destinationFile, copyApiResponse);
            }
        });
    }
    /**
     * @typedef {array} RenameResponse
     * @property {File} 0 The destination File.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback RenameCallback
     * @param {?Error} err Request error, if any.
     * @param {?File} destinationFile The destination File.
     * @param {object} apiResponse The full API response.
     */
    /**
     * @typedef {object} RenameOptions Configuration options for File#move(). See an
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects#resource| Object resource}.
     * @param {string} [userProject] The ID of the project which will be
     *     billed for the request.
     */
    /**
     * Rename this file.
     *
     * **Warning**:
     * There is currently no atomic `rename` method in the Cloud Storage API,
     * so this method is an alias of {@link File#move}, which in turn is a
     * composition of {@link File#copy} (to the new location) and
     * {@link File#delete} (from the old location). While
     * unlikely, it is possible that an error returned to your callback could be
     * triggered from either one of these API calls failing, which could leave a
     * duplicate file lingering. The error message will indicate what operation
     * has failed.
     *
     * @param {string|File} destinationFile Destination file.
     * @param {RenameCallback} [callback] Callback function.
     * @returns {Promise<RenameResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     *
     * //-
     * // You can pass in a string or a File object.
     * //
     * // For all of the below examples, assume we are working with the following
     * // Bucket and File objects.
     * //-
     *
     * const bucket = storage.bucket('my-bucket');
     * const file = bucket.file('my-image.png');
     *
     * //-
     * // You can pass in a string for the destinationFile.
     * //-
     * file.rename('renamed-image.png', function(err, renamedFile, apiResponse) {
     *   // `my-bucket` no longer contains:
     *   // - "my-image.png"
     *   // but contains instead:
     *   // - "renamed-image.png"
     *
     *   // `renamedFile` is an instance of a File object that refers to your
     *   // renamed file.
     * });
     *
     * //-
     * // You can pass in a File object.
     * //-
     * const anotherFile = anotherBucket.file('my-awesome-image.png');
     *
     * file.rename(anotherFile, function(err, renamedFile, apiResponse) {
     *   // `my-bucket` no longer contains:
     *   // - "my-image.png"
     *
     *   // Note:
     *   // The `renamedFile` parameter is equal to `anotherFile`.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.rename('my-renamed-image.png').then(function(data) {
     *   const renamedFile = data[0];
     *   const apiResponse = data[1];
     * });
     * ```
     */
    rename(destinationFile, optionsOrCallback, callback) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        callback = callback || util.noop;
        this.move(destinationFile, options, callback);
    }
    /**
     * @typedef {object} RestoreOptions Options for File#restore(). See an
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects#resource| Object resource}.
     * @param {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @param {number} [generation] If present, selects a specific revision of this object.
     * @param {string} [restoreToken] Returns an option that must be specified when getting a soft-deleted object from an HNS-enabled
     *  bucket that has a naming and generation conflict with another object in the same bucket.
     * @param {string} [projection] Specifies the set of properties to return. If used, must be 'full' or 'noAcl'.
     * @param {string | number} [ifGenerationMatch] Request proceeds if the generation of the target resource
     *  matches the value used in the precondition.
     *  If the values don't match, the request fails with a 412 Precondition Failed response.
     * @param {string | number} [ifGenerationNotMatch] Request proceeds if the generation of the target resource does
     *  not match the value used in the precondition. If the values match, the request fails with a 304 Not Modified response.
     * @param {string | number} [ifMetagenerationMatch] Request proceeds if the meta-generation of the target resource
     *  matches the value used in the precondition.
     *  If the values don't match, the request fails with a 412 Precondition Failed response.
     * @param {string | number} [ifMetagenerationNotMatch]  Request proceeds if the meta-generation of the target resource does
     *  not match the value used in the precondition. If the values match, the request fails with a 304 Not Modified response.
     */
    /**
     * Restores a soft-deleted file
     * @param {RestoreOptions} options Restore options.
     * @returns {Promise<File>}
     */
    async restore(options) {
        const [file] = await this.request({
            method: 'POST',
            uri: '/restore',
            qs: options,
        });
        return file;
    }
    /**
     * Makes request and applies userProject query parameter if necessary.
     *
     * @private
     *
     * @param {object} reqOpts - The request options.
     * @param {function} callback - The callback function.
     */
    request(reqOpts, callback) {
        return this.parent.request.call(this, reqOpts, callback);
    }
    /**
     * @callback RotateEncryptionKeyCallback
     * @extends CopyCallback
     */
    /**
     * @typedef RotateEncryptionKeyResponse
     * @extends CopyResponse
     */
    /**
     * @param {string|buffer|object} RotateEncryptionKeyOptions Configuration options
     *     for File#rotateEncryptionKey().
     * If a string or Buffer is provided, it is interpreted as an AES-256,
     * customer-supplied encryption key. If you'd like to use a Cloud KMS key
     * name, you must specify an options object with the property name:
     * `kmsKeyName`.
     * @param {string|buffer} [options.encryptionKey] An AES-256 encryption key.
     * @param {string} [options.kmsKeyName] A Cloud KMS key name.
     */
    /**
     * This method allows you to update the encryption key associated with this
     * file.
     *
     * See {@link https://cloud.google.com/storage/docs/encryption#customer-supplied| Customer-supplied Encryption Keys}
     *
     * @param {RotateEncryptionKeyOptions} [options] - Configuration options.
     * @param {RotateEncryptionKeyCallback} [callback]
     * @returns {Promise<File>}
     *
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_rotate_encryption_key
     * Example of rotating the encryption key for this file:
     */
    rotateEncryptionKey(optionsOrCallback, callback) {
        var _a;
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        let options = {};
        if (typeof optionsOrCallback === 'string' ||
            optionsOrCallback instanceof Buffer) {
            options = {
                encryptionKey: optionsOrCallback,
            };
        }
        else if (typeof optionsOrCallback === 'object') {
            options = optionsOrCallback;
        }
        const newFile = this.bucket.file(this.id, options);
        const copyOptions = ((_a = options.preconditionOpts) === null || _a === void 0 ? void 0 : _a.ifGenerationMatch) !== undefined
            ? { preconditionOpts: options.preconditionOpts }
            : {};
        this.copy(newFile, copyOptions, callback);
    }
    /**
     * @typedef {object} SaveOptions
     * @extends CreateWriteStreamOptions
     */
    /**
     * @callback SaveCallback
     * @param {?Error} err Request error, if any.
     */
    /**
     * Write strings or buffers to a file.
     *
     * *This is a convenience method which wraps {@link File#createWriteStream}.*
     * To upload arbitrary data to a file, please use {@link File#createWriteStream} directly.
     *
     * Resumable uploads are automatically enabled and must be shut off explicitly
     * by setting `options.resumable` to `false`.
     *
     * Multipart uploads with retryable error codes will be retried 3 times with exponential backoff.
     *
     * <p class="notice">
     *   There is some overhead when using a resumable upload that can cause
     *   noticeable performance degradation while uploading a series of small
     * files. When uploading files less than 10MB, it is recommended that the
     * resumable feature is disabled.
     * </p>
     *
     * @param {SaveData} data The data to write to a file.
     * @param {SaveOptions} [options] See {@link File#createWriteStream}'s `options`
     *     parameter.
     * @param {SaveCallback} [callback] Callback function.
     * @returns {Promise}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * const contents = 'This is the contents of the file.';
     *
     * file.save(contents, function(err) {
     *   if (!err) {
     *     // File written successfully.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.save(contents).then(function() {});
     * ```
     */
    save(data, optionsOrCallback, callback) {
        // tslint:enable:no-any
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        let maxRetries = this.storage.retryOptions.maxRetries;
        if (!this.shouldRetryBasedOnPreconditionAndIdempotencyStrat(options === null || options === void 0 ? void 0 : options.preconditionOpts)) {
            maxRetries = 0;
        }
        const returnValue = AsyncRetry(async (bail) => {
            return new Promise((resolve, reject) => {
                if (maxRetries === 0) {
                    this.storage.retryOptions.autoRetry = false;
                }
                const writable = this.createWriteStream(options);
                if (options.onUploadProgress) {
                    writable.on('progress', options.onUploadProgress);
                }
                const handleError = (err) => {
                    if (this.storage.retryOptions.autoRetry &&
                        this.storage.retryOptions.retryableErrorFn(err)) {
                        return reject(err);
                    }
                    return bail(err);
                };
                if (typeof data === 'string' ||
                    Buffer.isBuffer(data) ||
                    data instanceof Uint8Array) {
                    writable
                        .on('error', handleError)
                        .on('finish', () => resolve())
                        .end(data);
                }
                else {
                    pipeline(data, writable, err => {
                        if (err) {
                            if (typeof data !== 'function') {
                                // Only PipelineSourceFunction can be retried. Async-iterables
                                // and Readable streams can only be consumed once.
                                return bail(err);
                            }
                            handleError(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        }, {
            retries: maxRetries,
            factor: this.storage.retryOptions.retryDelayMultiplier,
            maxTimeout: this.storage.retryOptions.maxRetryDelay * 1000, //convert to milliseconds
            maxRetryTime: this.storage.retryOptions.totalTimeout * 1000, //convert to milliseconds
        });
        if (!callback) {
            return returnValue;
        }
        else {
            return returnValue
                .then(() => {
                if (callback) {
                    return callback();
                }
            })
                .catch(callback);
        }
    }
    setMetadata(metadata, optionsOrCallback, cb) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        cb =
            typeof optionsOrCallback === 'function'
                ? optionsOrCallback
                : cb;
        this.disableAutoRetryConditionallyIdempotent_(this.methods.setMetadata, AvailableServiceObjectMethods.setMetadata, options);
        super
            .setMetadata(metadata, options)
            .then(resp => cb(null, ...resp))
            .catch(cb)
            .finally(() => {
            this.storage.retryOptions.autoRetry = this.instanceRetryValue;
        });
    }
    /**
     * @typedef {array} SetStorageClassResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @typedef {object} SetStorageClassOptions Configuration options for File#setStorageClass().
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     */
    /**
     * @callback SetStorageClassCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Set the storage class for this file.
     *
     * See {@link https://cloud.google.com/storage/docs/per-object-storage-class| Per-Object Storage Class}
     * See {@link https://cloud.google.com/storage/docs/storage-classes| Storage Classes}
     *
     * @param {string} storageClass The new storage class. (`standard`,
     *     `nearline`, `coldline`, or `archive`)
     *     **Note:** The storage classes `multi_regional` and `regional`
     *     are now legacy and will be deprecated in the future.
     * @param {SetStorageClassOptions} [options] Configuration options.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {SetStorageClassCallback} [callback] Callback function.
     * @returns {Promise<SetStorageClassResponse>}
     *
     * @example
     * ```
     * file.setStorageClass('nearline', function(err, apiResponse) {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   // The storage class was updated successfully.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.setStorageClass('nearline').then(function() {});
     * ```
     */
    setStorageClass(storageClass, optionsOrCallback, callback) {
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        const req = {
            ...options,
            // In case we get input like `storageClass`, convert to `storage_class`.
            storageClass: storageClass
                .replace(/-/g, '_')
                .replace(/([a-z])([A-Z])/g, (_, low, up) => {
                return low + '_' + up;
            })
                .toUpperCase(),
        };
        this.copy(this, req, (err, file, apiResponse) => {
            if (err) {
                callback(err, apiResponse);
                return;
            }
            this.metadata = file.metadata;
            callback(null, apiResponse);
        });
    }
    /**
     * Set a user project to be billed for all requests made from this File
     * object.
     *
     * @param {string} userProject The user project.
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     * const file = bucket.file('my-file');
     *
     * file.setUserProject('grape-spaceship-123');
     * ```
     */
    setUserProject(userProject) {
        this.bucket.setUserProject.call(this, userProject);
    }
    /**
     * This creates a resumable-upload upload stream.
     *
     * @param {Duplexify} stream - Duplexify stream of data to pipe to the file.
     * @param {object=} options - Configuration object.
     *
     * @private
     */
    startResumableUpload_(dup, options = {}) {
        var _a;
        (_a = options.metadata) !== null && _a !== void 0 ? _a : (options.metadata = {});
        const retryOptions = this.storage.retryOptions;
        if (!this.shouldRetryBasedOnPreconditionAndIdempotencyStrat(options.preconditionOpts)) {
            retryOptions.autoRetry = false;
        }
        const cfg = {
            authClient: this.storage.authClient,
            apiEndpoint: this.storage.apiEndpoint,
            bucket: this.bucket.name,
            customRequestOptions: this.getRequestInterceptors().reduce((reqOpts, interceptorFn) => interceptorFn(reqOpts), {}),
            file: this.name,
            generation: this.generation,
            isPartialUpload: options.isPartialUpload,
            key: this.encryptionKey,
            kmsKeyName: this.kmsKeyName,
            metadata: options.metadata,
            offset: options.offset,
            predefinedAcl: options.predefinedAcl,
            private: options.private,
            public: options.public,
            uri: options.uri,
            userProject: options.userProject || this.userProject,
            retryOptions: { ...retryOptions },
            params: (options === null || options === void 0 ? void 0 : options.preconditionOpts) || this.instancePreconditionOpts,
            chunkSize: options === null || options === void 0 ? void 0 : options.chunkSize,
            highWaterMark: options === null || options === void 0 ? void 0 : options.highWaterMark,
            universeDomain: this.bucket.storage.universeDomain,
            [GCCL_GCS_CMD_KEY]: options[GCCL_GCS_CMD_KEY],
        };
        let uploadStream;
        try {
            uploadStream = resumableUpload.upload(cfg);
        }
        catch (error) {
            dup.destroy(error);
            this.storage.retryOptions.autoRetry = this.instanceRetryValue;
            return;
        }
        uploadStream
            .on('response', resp => {
            dup.emit('response', resp);
        })
            .on('uri', uri => {
            dup.emit('uri', uri);
        })
            .on('metadata', metadata => {
            this.metadata = metadata;
            dup.emit('metadata');
        })
            .on('finish', () => {
            dup.emit('complete');
        })
            .on('progress', evt => dup.emit('progress', evt));
        dup.setWritable(uploadStream);
        this.storage.retryOptions.autoRetry = this.instanceRetryValue;
    }
    /**
     * Takes a readable stream and pipes it to a remote file. Unlike
     * `startResumableUpload_`, which uses the resumable upload technique, this
     * method uses a simple upload (all or nothing).
     *
     * @param {Duplexify} dup - Duplexify stream of data to pipe to the file.
     * @param {object=} options - Configuration object.
     *
     * @private
     */
    startSimpleUpload_(dup, options = {}) {
        var _a;
        (_a = options.metadata) !== null && _a !== void 0 ? _a : (options.metadata = {});
        const apiEndpoint = this.storage.apiEndpoint;
        const bucketName = this.bucket.name;
        const uri = `${apiEndpoint}/upload/storage/v1/b/${bucketName}/o`;
        const reqOpts = {
            qs: {
                name: this.name,
            },
            uri: uri,
            [GCCL_GCS_CMD_KEY]: options[GCCL_GCS_CMD_KEY],
        };
        if (this.generation !== undefined) {
            reqOpts.qs.ifGenerationMatch = this.generation;
        }
        if (this.kmsKeyName !== undefined) {
            reqOpts.qs.kmsKeyName = this.kmsKeyName;
        }
        if (typeof options.timeout === 'number') {
            reqOpts.timeout = options.timeout;
        }
        if (options.userProject || this.userProject) {
            reqOpts.qs.userProject = options.userProject || this.userProject;
        }
        if (options.predefinedAcl) {
            reqOpts.qs.predefinedAcl = options.predefinedAcl;
        }
        else if (options.private) {
            reqOpts.qs.predefinedAcl = 'private';
        }
        else if (options.public) {
            reqOpts.qs.predefinedAcl = 'publicRead';
        }
        Object.assign(reqOpts.qs, this.instancePreconditionOpts, options.preconditionOpts);
        util.makeWritableStream(dup, {
            makeAuthenticatedRequest: (reqOpts) => {
                this.request(reqOpts, (err, body, resp) => {
                    if (err) {
                        dup.destroy(err);
                        return;
                    }
                    this.metadata = body;
                    dup.emit('metadata', body);
                    dup.emit('response', resp);
                    dup.emit('complete');
                });
            },
            metadata: options.metadata,
            request: reqOpts,
        });
    }
    disableAutoRetryConditionallyIdempotent_(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coreOpts, methodType, localPreconditionOptions) {
        var _a, _b, _c, _d;
        if ((typeof coreOpts === 'object' &&
            ((_b = (_a = coreOpts === null || coreOpts === void 0 ? void 0 : coreOpts.reqOpts) === null || _a === void 0 ? void 0 : _a.qs) === null || _b === void 0 ? void 0 : _b.ifGenerationMatch) === undefined &&
            (localPreconditionOptions === null || localPreconditionOptions === void 0 ? void 0 : localPreconditionOptions.ifGenerationMatch) === undefined &&
            methodType === AvailableServiceObjectMethods.delete &&
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryConditional) ||
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryNever) {
            this.storage.retryOptions.autoRetry = false;
        }
        if ((typeof coreOpts === 'object' &&
            ((_d = (_c = coreOpts === null || coreOpts === void 0 ? void 0 : coreOpts.reqOpts) === null || _c === void 0 ? void 0 : _c.qs) === null || _d === void 0 ? void 0 : _d.ifMetagenerationMatch) === undefined &&
            (localPreconditionOptions === null || localPreconditionOptions === void 0 ? void 0 : localPreconditionOptions.ifMetagenerationMatch) === undefined &&
            methodType === AvailableServiceObjectMethods.setMetadata &&
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryConditional) ||
            this.storage.retryOptions.idempotencyStrategy ===
                IdempotencyStrategy.RetryNever) {
            this.storage.retryOptions.autoRetry = false;
        }
    }
    async getBufferFromReadable(readable) {
        const buf = [];
        for await (const chunk of readable) {
            buf.push(chunk);
        }
        return Buffer.concat(buf);
    }
}
_File_instances = new WeakSet(), _File_validateIntegrity = 
/**
 *
 * @param hashCalculatingStream
 * @param verify
 * @returns {boolean} Returns `true` if valid, throws with error otherwise
 */
async function _File_validateIntegrity(hashCalculatingStream, verify = {}) {
    const metadata = this.metadata;
    // If we're doing validation, assume the worst
    let dataMismatch = !!(verify.crc32c || verify.md5);
    if (verify.crc32c && metadata.crc32c) {
        dataMismatch = !hashCalculatingStream.test('crc32c', metadata.crc32c);
    }
    if (verify.md5 && metadata.md5Hash) {
        dataMismatch = !hashCalculatingStream.test('md5', metadata.md5Hash);
    }
    if (dataMismatch) {
        const errors = [];
        let code = '';
        let message = '';
        try {
            await this.delete();
            if (verify.md5 && !metadata.md5Hash) {
                code = 'MD5_NOT_AVAILABLE';
                message = FileExceptionMessages.MD5_NOT_AVAILABLE;
            }
            else {
                code = 'FILE_NO_UPLOAD';
                message = FileExceptionMessages.UPLOAD_MISMATCH;
            }
        }
        catch (e) {
            const error = e;
            code = 'FILE_NO_UPLOAD_DELETE';
            message = `${FileExceptionMessages.UPLOAD_MISMATCH_DELETE_FAIL}${error.message}`;
            errors.push(error);
        }
        const error = new RequestError(message);
        error.code = code;
        error.errors = errors;
        throw error;
    }
    return true;
};
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisifyAll(File, {
    exclude: [
        'cloudStorageURI',
        'publicUrl',
        'request',
        'save',
        'setEncryptionKey',
        'shouldRetryBasedOnPreconditionAndIdempotencyStrat',
        'getBufferFromReadable',
        'restore',
    ],
});
/**
 * Reference to the {@link File} class.
 * @name module:@google-cloud/storage.File
 * @see File
 */
export { File };
