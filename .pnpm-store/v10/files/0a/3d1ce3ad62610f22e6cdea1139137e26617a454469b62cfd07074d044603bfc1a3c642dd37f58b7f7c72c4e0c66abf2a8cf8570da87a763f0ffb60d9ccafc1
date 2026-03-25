/*!
 * Copyright 2022 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { promisifyAll } from '@google-cloud/promisify';
import { EventEmitter } from 'events';
import { util, } from './util.js';
/**
 * ServiceObject is a base class, meant to be inherited from by a "service
 * object," like a BigQuery dataset or Storage bucket.
 *
 * Most of the time, these objects share common functionality; they can be
 * created or deleted, and you can get or set their metadata.
 *
 * By inheriting from this class, a service object will be extended with these
 * shared behaviors. Note that any method can be overridden when the service
 * object requires specific behavior.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ServiceObject extends EventEmitter {
    /*
     * @constructor
     * @alias module:common/service-object
     *
     * @private
     *
     * @param {object} config - Configuration object.
     * @param {string} config.baseUrl - The base URL to make API requests to.
     * @param {string} config.createMethod - The method which creates this object.
     * @param {string=} config.id - The identifier of the object. For example, the
     *     name of a Storage bucket or Pub/Sub topic.
     * @param {object=} config.methods - A map of each method name that should be inherited.
     * @param {object} config.methods[].reqOpts - Default request options for this
     *     particular method. A common use case is when `setMetadata` requires a
     *     `PUT` method to override the default `PATCH`.
     * @param {object} config.parent - The parent service instance. For example, an
     *     instance of Storage if the object is Bucket.
     */
    constructor(config) {
        super();
        this.metadata = {};
        this.baseUrl = config.baseUrl;
        this.parent = config.parent; // Parent class.
        this.id = config.id; // Name or ID (e.g. dataset ID, bucket name, etc).
        this.createMethod = config.createMethod;
        this.methods = config.methods || {};
        this.interceptors = [];
        this.projectId = config.projectId;
        if (config.methods) {
            // This filters the ServiceObject instance (e.g. a "File") to only have
            // the configured methods. We make a couple of exceptions for core-
            // functionality ("request()" and "getRequestInterceptors()")
            Object.getOwnPropertyNames(ServiceObject.prototype)
                .filter(methodName => {
                return (
                // All ServiceObjects need `request` and `getRequestInterceptors`.
                // clang-format off
                !/^request/.test(methodName) &&
                    !/^getRequestInterceptors/.test(methodName) &&
                    // clang-format on
                    // The ServiceObject didn't redefine the method.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this[methodName] ===
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ServiceObject.prototype[methodName] &&
                    // This method isn't wanted.
                    !config.methods[methodName]);
            })
                .forEach(methodName => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this[methodName] = undefined;
            });
        }
    }
    create(optionsOrCallback, callback) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const args = [this.id];
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        if (typeof optionsOrCallback === 'object') {
            args.push(optionsOrCallback);
        }
        // Wrap the callback to return *this* instance of the object, not the
        // newly-created one.
        // tslint: disable-next-line no-any
        function onCreate(...args) {
            const [err, instance] = args;
            if (!err) {
                self.metadata = instance.metadata;
                if (self.id && instance.metadata) {
                    self.id = instance.metadata.id;
                }
                args[1] = self; // replace the created `instance` with this one.
            }
            callback(...args);
        }
        args.push(onCreate);
        // eslint-disable-next-line prefer-spread
        this.createMethod.apply(null, args);
    }
    delete(optionsOrCallback, cb) {
        var _a;
        const [options, callback] = util.maybeOptionsOrCallback(optionsOrCallback, cb);
        const ignoreNotFound = options.ignoreNotFound;
        delete options.ignoreNotFound;
        const methodConfig = (typeof this.methods.delete === 'object' && this.methods.delete) || {};
        const reqOpts = {
            method: 'DELETE',
            uri: '',
            ...methodConfig.reqOpts,
            qs: {
                ...(_a = methodConfig.reqOpts) === null || _a === void 0 ? void 0 : _a.qs,
                ...options,
            },
        };
        // The `request` method may have been overridden to hold any special
        // behavior. Ensure we call the original `request` method.
        ServiceObject.prototype.request.call(this, reqOpts, (err, body, res) => {
            if (err) {
                if (err.code === 404 && ignoreNotFound) {
                    err = null;
                }
            }
            callback(err, res);
        });
    }
    exists(optionsOrCallback, cb) {
        const [options, callback] = util.maybeOptionsOrCallback(optionsOrCallback, cb);
        this.get(options, err => {
            if (err) {
                if (err.code === 404) {
                    callback(null, false);
                }
                else {
                    callback(err);
                }
                return;
            }
            callback(null, true);
        });
    }
    get(optionsOrCallback, cb) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const [opts, callback] = util.maybeOptionsOrCallback(optionsOrCallback, cb);
        const options = Object.assign({}, opts);
        const autoCreate = options.autoCreate && typeof this.create === 'function';
        delete options.autoCreate;
        function onCreate(err, instance, apiResponse) {
            if (err) {
                if (err.code === 409) {
                    self.get(options, callback);
                    return;
                }
                callback(err, null, apiResponse);
                return;
            }
            callback(null, instance, apiResponse);
        }
        this.getMetadata(options, (err, metadata) => {
            if (err) {
                if (err.code === 404 && autoCreate) {
                    const args = [];
                    if (Object.keys(options).length > 0) {
                        args.push(options);
                    }
                    args.push(onCreate);
                    self.create(...args);
                    return;
                }
                callback(err, null, metadata);
                return;
            }
            callback(null, self, metadata);
        });
    }
    getMetadata(optionsOrCallback, cb) {
        var _a;
        const [options, callback] = util.maybeOptionsOrCallback(optionsOrCallback, cb);
        const methodConfig = (typeof this.methods.getMetadata === 'object' &&
            this.methods.getMetadata) ||
            {};
        const reqOpts = {
            uri: '',
            ...methodConfig.reqOpts,
            qs: {
                ...(_a = methodConfig.reqOpts) === null || _a === void 0 ? void 0 : _a.qs,
                ...options,
            },
        };
        // The `request` method may have been overridden to hold any special
        // behavior. Ensure we call the original `request` method.
        ServiceObject.prototype.request.call(this, reqOpts, (err, body, res) => {
            this.metadata = body;
            callback(err, this.metadata, res);
        });
    }
    /**
     * Return the user's custom request interceptors.
     */
    getRequestInterceptors() {
        // Interceptors should be returned in the order they were assigned.
        const localInterceptors = this.interceptors
            .filter(interceptor => typeof interceptor.request === 'function')
            .map(interceptor => interceptor.request);
        return this.parent.getRequestInterceptors().concat(localInterceptors);
    }
    setMetadata(metadata, optionsOrCallback, cb) {
        var _a, _b;
        const [options, callback] = util.maybeOptionsOrCallback(optionsOrCallback, cb);
        const methodConfig = (typeof this.methods.setMetadata === 'object' &&
            this.methods.setMetadata) ||
            {};
        const reqOpts = {
            method: 'PATCH',
            uri: '',
            ...methodConfig.reqOpts,
            json: {
                ...(_a = methodConfig.reqOpts) === null || _a === void 0 ? void 0 : _a.json,
                ...metadata,
            },
            qs: {
                ...(_b = methodConfig.reqOpts) === null || _b === void 0 ? void 0 : _b.qs,
                ...options,
            },
        };
        // The `request` method may have been overridden to hold any special
        // behavior. Ensure we call the original `request` method.
        ServiceObject.prototype.request.call(this, reqOpts, (err, body, res) => {
            this.metadata = body;
            callback(err, this.metadata, res);
        });
    }
    request_(reqOpts, callback) {
        reqOpts = { ...reqOpts };
        if (this.projectId) {
            reqOpts.projectId = this.projectId;
        }
        const isAbsoluteUrl = reqOpts.uri.indexOf('http') === 0;
        const uriComponents = [this.baseUrl, this.id || '', reqOpts.uri];
        if (isAbsoluteUrl) {
            uriComponents.splice(0, uriComponents.indexOf(reqOpts.uri));
        }
        reqOpts.uri = uriComponents
            .filter(x => x.trim()) // Limit to non-empty strings.
            .map(uriComponent => {
            const trimSlashesRegex = /^\/*|\/*$/g;
            return uriComponent.replace(trimSlashesRegex, '');
        })
            .join('/');
        const childInterceptors = Array.isArray(reqOpts.interceptors_)
            ? reqOpts.interceptors_
            : [];
        const localInterceptors = [].slice.call(this.interceptors);
        reqOpts.interceptors_ = childInterceptors.concat(localInterceptors);
        if (reqOpts.shouldReturnStream) {
            return this.parent.requestStream(reqOpts);
        }
        this.parent.request(reqOpts, callback);
    }
    request(reqOpts, callback) {
        this.request_(reqOpts, callback);
    }
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     */
    requestStream(reqOpts) {
        const opts = { ...reqOpts, shouldReturnStream: true };
        return this.request_(opts);
    }
}
promisifyAll(ServiceObject, { exclude: ['getRequestInterceptors'] });
export { ServiceObject };
