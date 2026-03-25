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
import { promisifyAll } from '@google-cloud/promisify';
/**
 * Attach functionality to a {@link Storage.acl} instance. This will add an
 * object for each role group (owners, readers, and writers), with each object
 * containing methods to add or delete a type of entity.
 *
 * As an example, here are a few methods that are created.
 *
 *   myBucket.acl.readers.deleteGroup('groupId', function(err) {});
 *
 *   myBucket.acl.owners.addUser('email@example.com', function(err, acl) {});
 *
 *   myBucket.acl.writers.addDomain('example.com', function(err, acl) {});
 *
 * @private
 */
class AclRoleAccessorMethods {
    constructor() {
        this.owners = {};
        this.readers = {};
        this.writers = {};
        /**
         * An object of convenience methods to add or delete owner ACL permissions
         * for a given entity.
         *
         * The supported methods include:
         *
         *   - `myFile.acl.owners.addAllAuthenticatedUsers`
         *   - `myFile.acl.owners.deleteAllAuthenticatedUsers`
         *   - `myFile.acl.owners.addAllUsers`
         *   - `myFile.acl.owners.deleteAllUsers`
         *   - `myFile.acl.owners.addDomain`
         *   - `myFile.acl.owners.deleteDomain`
         *   - `myFile.acl.owners.addGroup`
         *   - `myFile.acl.owners.deleteGroup`
         *   - `myFile.acl.owners.addProject`
         *   - `myFile.acl.owners.deleteProject`
         *   - `myFile.acl.owners.addUser`
         *   - `myFile.acl.owners.deleteUser`
         *
         * @name Acl#owners
         *
         * @example
         * ```
         * const storage = require('@google-cloud/storage')();
         * const myBucket = storage.bucket('my-bucket');
         * const myFile = myBucket.file('my-file');
         *
         * //-
         * // Add a user as an owner of a file.
         * //-
         * const myBucket = gcs.bucket('my-bucket');
         * const myFile = myBucket.file('my-file');
         * myFile.acl.owners.addUser('email@example.com', function(err, aclObject)
         * {});
         *
         * //-
         * // For reference, the above command is the same as running the following.
         * //-
         * myFile.acl.add({
         *   entity: 'user-email@example.com',
         *   role: gcs.acl.OWNER_ROLE
         * }, function(err, aclObject) {});
         *
         * //-
         * // If the callback is omitted, we'll return a Promise.
         * //-
         * myFile.acl.owners.addUser('email@example.com').then(function(data) {
         *   const aclObject = data[0];
         *   const apiResponse = data[1];
         * });
         * ```
         */
        this.owners = {};
        /**
         * An object of convenience methods to add or delete reader ACL permissions
         * for a given entity.
         *
         * The supported methods include:
         *
         *   - `myFile.acl.readers.addAllAuthenticatedUsers`
         *   - `myFile.acl.readers.deleteAllAuthenticatedUsers`
         *   - `myFile.acl.readers.addAllUsers`
         *   - `myFile.acl.readers.deleteAllUsers`
         *   - `myFile.acl.readers.addDomain`
         *   - `myFile.acl.readers.deleteDomain`
         *   - `myFile.acl.readers.addGroup`
         *   - `myFile.acl.readers.deleteGroup`
         *   - `myFile.acl.readers.addProject`
         *   - `myFile.acl.readers.deleteProject`
         *   - `myFile.acl.readers.addUser`
         *   - `myFile.acl.readers.deleteUser`
         *
         * @name Acl#readers
         *
         * @example
         * ```
         * const storage = require('@google-cloud/storage')();
         * const myBucket = storage.bucket('my-bucket');
         * const myFile = myBucket.file('my-file');
         *
         * //-
         * // Add a user as a reader of a file.
         * //-
         * myFile.acl.readers.addUser('email@example.com', function(err, aclObject)
         * {});
         *
         * //-
         * // For reference, the above command is the same as running the following.
         * //-
         * myFile.acl.add({
         *   entity: 'user-email@example.com',
         *   role: gcs.acl.READER_ROLE
         * }, function(err, aclObject) {});
         *
         * //-
         * // If the callback is omitted, we'll return a Promise.
         * //-
         * myFile.acl.readers.addUser('email@example.com').then(function(data) {
         *   const aclObject = data[0];
         *   const apiResponse = data[1];
         * });
         * ```
         */
        this.readers = {};
        /**
         * An object of convenience methods to add or delete writer ACL permissions
         * for a given entity.
         *
         * The supported methods include:
         *
         *   - `myFile.acl.writers.addAllAuthenticatedUsers`
         *   - `myFile.acl.writers.deleteAllAuthenticatedUsers`
         *   - `myFile.acl.writers.addAllUsers`
         *   - `myFile.acl.writers.deleteAllUsers`
         *   - `myFile.acl.writers.addDomain`
         *   - `myFile.acl.writers.deleteDomain`
         *   - `myFile.acl.writers.addGroup`
         *   - `myFile.acl.writers.deleteGroup`
         *   - `myFile.acl.writers.addProject`
         *   - `myFile.acl.writers.deleteProject`
         *   - `myFile.acl.writers.addUser`
         *   - `myFile.acl.writers.deleteUser`
         *
         * @name Acl#writers
         *
         * @example
         * ```
         * const storage = require('@google-cloud/storage')();
         * const myBucket = storage.bucket('my-bucket');
         * const myFile = myBucket.file('my-file');
         *
         * //-
         * // Add a user as a writer of a file.
         * //-
         * myFile.acl.writers.addUser('email@example.com', function(err, aclObject)
         * {});
         *
         * //-
         * // For reference, the above command is the same as running the following.
         * //-
         * myFile.acl.add({
         *   entity: 'user-email@example.com',
         *   role: gcs.acl.WRITER_ROLE
         * }, function(err, aclObject) {});
         *
         * //-
         * // If the callback is omitted, we'll return a Promise.
         * //-
         * myFile.acl.writers.addUser('email@example.com').then(function(data) {
         *   const aclObject = data[0];
         *   const apiResponse = data[1];
         * });
         * ```
         */
        this.writers = {};
        AclRoleAccessorMethods.roles.forEach(this._assignAccessMethods.bind(this));
    }
    _assignAccessMethods(role) {
        const accessMethods = AclRoleAccessorMethods.accessMethods;
        const entities = AclRoleAccessorMethods.entities;
        const roleGroup = role.toLowerCase() + 's';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this[roleGroup] = entities.reduce((acc, entity) => {
            const isPrefix = entity.charAt(entity.length - 1) === '-';
            accessMethods.forEach(accessMethod => {
                let method = accessMethod + entity[0].toUpperCase() + entity.substring(1);
                if (isPrefix) {
                    method = method.replace('-', '');
                }
                // Wrap the parent accessor method (e.g. `add` or `delete`) to avoid the
                // more complex API of specifying an `entity` and `role`.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                acc[method] = (entityId, options, callback) => {
                    let apiEntity;
                    if (typeof options === 'function') {
                        callback = options;
                        options = {};
                    }
                    if (isPrefix) {
                        apiEntity = entity + entityId;
                    }
                    else {
                        // If the entity is not a prefix, it is a special entity group
                        // that does not require further details. The accessor methods
                        // only accept a callback.
                        apiEntity = entity;
                        callback = entityId;
                    }
                    options = Object.assign({
                        entity: apiEntity,
                        role,
                    }, options);
                    const args = [options];
                    if (typeof callback === 'function') {
                        args.push(callback);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return this[accessMethod].apply(this, args);
                };
            });
            return acc;
        }, {});
    }
}
AclRoleAccessorMethods.accessMethods = ['add', 'delete'];
AclRoleAccessorMethods.entities = [
    // Special entity groups that do not require further specification.
    'allAuthenticatedUsers',
    'allUsers',
    // Entity groups that require specification, e.g. `user-email@example.com`.
    'domain-',
    'group-',
    'project-',
    'user-',
];
AclRoleAccessorMethods.roles = ['OWNER', 'READER', 'WRITER'];
/**
 * Cloud Storage uses access control lists (ACLs) to manage object and
 * bucket access. ACLs are the mechanism you use to share objects with other
 * users and allow other users to access your buckets and objects.
 *
 * An ACL consists of one or more entries, where each entry grants permissions
 * to an entity. Permissions define the actions that can be performed against an
 * object or bucket (for example, `READ` or `WRITE`); the entity defines who the
 * permission applies to (for example, a specific user or group of users).
 *
 * Where an `entity` value is accepted, we follow the format the Cloud Storage
 * API expects.
 *
 * Refer to
 * https://cloud.google.com/storage/docs/json_api/v1/defaultObjectAccessControls
 * for the most up-to-date values.
 *
 *   - `user-userId`
 *   - `user-email`
 *   - `group-groupId`
 *   - `group-email`
 *   - `domain-domain`
 *   - `project-team-projectId`
 *   - `allUsers`
 *   - `allAuthenticatedUsers`
 *
 * Examples:
 *
 *   - The user "liz@example.com" would be `user-liz@example.com`.
 *   - The group "example@googlegroups.com" would be
 *     `group-example@googlegroups.com`.
 *   - To refer to all members of the Google Apps for Business domain
 *     "example.com", the entity would be `domain-example.com`.
 *
 * For more detailed information, see
 * {@link http://goo.gl/6qBBPO| About Access Control Lists}.
 *
 * @constructor Acl
 * @mixin
 * @param {object} options Configuration options.
 */
class Acl extends AclRoleAccessorMethods {
    constructor(options) {
        super();
        this.pathPrefix = options.pathPrefix;
        this.request_ = options.request;
    }
    /**
     * @typedef {array} AddAclResponse
     * @property {object} 0 The Acl Objects.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback AddAclCallback
     * @param {?Error} err Request error, if any.
     * @param {object} acl The Acl Objects.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Add access controls on a {@link Bucket} or {@link File}.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/bucketAccessControls/insert| BucketAccessControls: insert API Documentation}
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objectAccessControls/insert| ObjectAccessControls: insert API Documentation}
     *
     * @param {object} options Configuration options.
     * @param {string} options.entity Whose permissions will be added.
     * @param {string} options.role Permissions allowed for the defined entity.
     *     See {@link https://cloud.google.com/storage/docs/access-control Access
     * Control}.
     * @param {number} [options.generation] **File Objects Only** Select a specific
     *     revision of this file (as opposed to the latest version, the default).
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {AddAclCallback} [callback] Callback function.
     * @returns {Promise<AddAclResponse>}
     *
     * @example
     * ```
     * const storage = require('@google-cloud/storage')();
     * const myBucket = storage.bucket('my-bucket');
     * const myFile = myBucket.file('my-file');
     *
     * const options = {
     *   entity: 'user-useremail@example.com',
     *   role: gcs.acl.OWNER_ROLE
     * };
     *
     * myBucket.acl.add(options, function(err, aclObject, apiResponse) {});
     *
     * //-
     * // For file ACL operations, you can also specify a `generation` property.
     * // Here is how you would grant ownership permissions to a user on a
     * specific
     * // revision of a file.
     * //-
     * myFile.acl.add({
     *   entity: 'user-useremail@example.com',
     *   role: gcs.acl.OWNER_ROLE,
     *   generation: 1
     * }, function(err, aclObject, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * myBucket.acl.add(options).then(function(data) {
     *   const aclObject = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * ```
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_add_file_owner
     * Example of adding an owner to a file:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_add_bucket_owner
     * Example of adding an owner to a bucket:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_add_bucket_default_owner
     * Example of adding a default owner to a bucket:
     */
    add(options, callback) {
        const query = {};
        if (options.generation) {
            query.generation = options.generation;
        }
        if (options.userProject) {
            query.userProject = options.userProject;
        }
        this.request({
            method: 'POST',
            uri: '',
            qs: query,
            maxRetries: 0, //explicitly set this value since this is a non-idempotent function
            json: {
                entity: options.entity,
                role: options.role.toUpperCase(),
            },
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            callback(null, this.makeAclObject_(resp), resp);
        });
    }
    /**
     * @typedef {array} RemoveAclResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback RemoveAclCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Delete access controls on a {@link Bucket} or {@link File}.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/bucketAccessControls/delete| BucketAccessControls: delete API Documentation}
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objectAccessControls/delete| ObjectAccessControls: delete API Documentation}
     *
     * @param {object} options Configuration object.
     * @param {string} options.entity Whose permissions will be revoked.
     * @param {int} [options.generation] **File Objects Only** Select a specific
     *     revision of this file (as opposed to the latest version, the default).
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {RemoveAclCallback} callback The callback function.
     * @returns {Promise<RemoveAclResponse>}
     *
     * @example
     * ```
     * const storage = require('@google-cloud/storage')();
     * const myBucket = storage.bucket('my-bucket');
     * const myFile = myBucket.file('my-file');
     *
     * myBucket.acl.delete({
     *   entity: 'user-useremail@example.com'
     * }, function(err, apiResponse) {});
     *
     * //-
     * // For file ACL operations, you can also specify a `generation` property.
     * //-
     * myFile.acl.delete({
     *   entity: 'user-useremail@example.com',
     *   generation: 1
     * }, function(err, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * myFile.acl.delete().then(function(data) {
     *   const apiResponse = data[0];
     * });
     *
     * ```
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_remove_bucket_owner
     * Example of removing an owner from a bucket:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_remove_bucket_default_owner
     * Example of removing a default owner from a bucket:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_remove_file_owner
     * Example of removing an owner from a bucket:
     */
    delete(options, callback) {
        const query = {};
        if (options.generation) {
            query.generation = options.generation;
        }
        if (options.userProject) {
            query.userProject = options.userProject;
        }
        this.request({
            method: 'DELETE',
            uri: '/' + encodeURIComponent(options.entity),
            qs: query,
        }, (err, resp) => {
            callback(err, resp);
        });
    }
    /**
     * @typedef {array} GetAclResponse
     * @property {object|object[]} 0 Single or array of Acl Objects.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetAclCallback
     * @param {?Error} err Request error, if any.
     * @param {object|object[]} acl Single or array of Acl Objects.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get access controls on a {@link Bucket} or {@link File}. If
     * an entity is omitted, you will receive an array of all applicable access
     * controls.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/bucketAccessControls/get| BucketAccessControls: get API Documentation}
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objectAccessControls/get| ObjectAccessControls: get API Documentation}
     *
     * @param {object|function} [options] Configuration options. If you want to
     *     receive a list of all access controls, pass the callback function as
     * the only argument.
     * @param {string} options.entity Whose permissions will be fetched.
     * @param {number} [options.generation] **File Objects Only** Select a specific
     *     revision of this file (as opposed to the latest version, the default).
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {GetAclCallback} [callback] Callback function.
     * @returns {Promise<GetAclResponse>}
     *
     * @example
     * ```
     * const storage = require('@google-cloud/storage')();
     * const myBucket = storage.bucket('my-bucket');
     * const myFile = myBucket.file('my-file');
     *
     * myBucket.acl.get({
     *   entity: 'user-useremail@example.com'
     * }, function(err, aclObject, apiResponse) {});
     *
     * //-
     * // Get all access controls.
     * //-
     * myBucket.acl.get(function(err, aclObjects, apiResponse) {
     *   // aclObjects = [
     *   //   {
     *   //     entity: 'user-useremail@example.com',
     *   //     role: 'owner'
     *   //   }
     *   // ]
     * });
     *
     * //-
     * // For file ACL operations, you can also specify a `generation` property.
     * //-
     * myFile.acl.get({
     *   entity: 'user-useremail@example.com',
     *   generation: 1
     * }, function(err, aclObject, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * myBucket.acl.get().then(function(data) {
     *   const aclObject = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * ```
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_print_file_acl
     * Example of printing a file's ACL:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_print_file_acl_for_user
     * Example of printing a file's ACL for a specific user:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_print_bucket_acl
     * Example of printing a bucket's ACL:
     *
     * @example <caption>include:samples/acl.js</caption>
     * region_tag:storage_print_bucket_acl_for_user
     * Example of printing a bucket's ACL for a specific user:
     */
    get(optionsOrCallback, cb) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : null;
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
        let path = '';
        const query = {};
        if (options) {
            path = '/' + encodeURIComponent(options.entity);
            if (options.generation) {
                query.generation = options.generation;
            }
            if (options.userProject) {
                query.userProject = options.userProject;
            }
        }
        this.request({
            uri: path,
            qs: query,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            let results;
            if (resp.items) {
                results = resp.items.map(this.makeAclObject_);
            }
            else {
                results = this.makeAclObject_(resp);
            }
            callback(null, results, resp);
        });
    }
    /**
     * @typedef {array} UpdateAclResponse
     * @property {object} 0 The updated Acl Objects.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback UpdateAclCallback
     * @param {?Error} err Request error, if any.
     * @param {object} acl The updated Acl Objects.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Update access controls on a {@link Bucket} or {@link File}.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/bucketAccessControls/update| BucketAccessControls: update API Documentation}
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objectAccessControls/update| ObjectAccessControls: update API Documentation}
     *
     * @param {object} options Configuration options.
     * @param {string} options.entity Whose permissions will be updated.
     * @param {string} options.role Permissions allowed for the defined entity.
     *     See {@link Storage.acl}.
     * @param {number} [options.generation] **File Objects Only** Select a specific
     *     revision of this file (as opposed to the latest version, the default).
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {UpdateAclCallback} [callback] Callback function.
     * @returns {Promise<UpdateAclResponse>}
     *
     * @example
     * ```
     * const storage = require('@google-cloud/storage')();
     * const myBucket = storage.bucket('my-bucket');
     * const myFile = myBucket.file('my-file');
     *
     * const options = {
     *   entity: 'user-useremail@example.com',
     *   role: gcs.acl.WRITER_ROLE
     * };
     *
     * myBucket.acl.update(options, function(err, aclObject, apiResponse) {});
     *
     * //-
     * // For file ACL operations, you can also specify a `generation` property.
     * //-
     * myFile.acl.update({
     *   entity: 'user-useremail@example.com',
     *   role: gcs.acl.WRITER_ROLE,
     *   generation: 1
     * }, function(err, aclObject, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * myFile.acl.update(options).then(function(data) {
     *   const aclObject = data[0];
     *   const apiResponse = data[1];
     * });
     * ```
     */
    update(options, callback) {
        const query = {};
        if (options.generation) {
            query.generation = options.generation;
        }
        if (options.userProject) {
            query.userProject = options.userProject;
        }
        this.request({
            method: 'PUT',
            uri: '/' + encodeURIComponent(options.entity),
            qs: query,
            json: {
                role: options.role.toUpperCase(),
            },
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            callback(null, this.makeAclObject_(resp), resp);
        });
    }
    /**
     * Transform API responses to a consistent object format.
     *
     * @private
     */
    makeAclObject_(accessControlObject) {
        const obj = {
            entity: accessControlObject.entity,
            role: accessControlObject.role,
        };
        if (accessControlObject.projectTeam) {
            obj.projectTeam = accessControlObject.projectTeam;
        }
        return obj;
    }
    /**
     * Patch requests up to the bucket's request object.
     *
     * @private
     *
     * @param {string} method Action.
     * @param {string} path Request path.
     * @param {*} query Request query object.
     * @param {*} body Request body contents.
     * @param {function} callback Callback function.
     */
    request(reqOpts, callback) {
        reqOpts.uri = this.pathPrefix + reqOpts.uri;
        this.request_(reqOpts, callback);
    }
}
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisifyAll(Acl, {
    exclude: ['request'],
});
export { Acl, AclRoleAccessorMethods };
