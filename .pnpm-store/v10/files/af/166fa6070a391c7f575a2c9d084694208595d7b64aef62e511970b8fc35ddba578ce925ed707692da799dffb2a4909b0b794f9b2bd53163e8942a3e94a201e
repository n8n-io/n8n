import { BaseMetadata, ServiceObject } from './nodejs-common/index.js';
import { ResponseBody } from './nodejs-common/util.js';
import { Bucket } from './bucket.js';
export interface DeleteNotificationOptions {
    userProject?: string;
}
export interface GetNotificationMetadataOptions {
    userProject?: string;
}
/**
 * @typedef {array} GetNotificationMetadataResponse
 * @property {object} 0 The notification metadata.
 * @property {object} 1 The full API response.
 */
export type GetNotificationMetadataResponse = [ResponseBody, unknown];
/**
 * @callback GetNotificationMetadataCallback
 * @param {?Error} err Request error, if any.
 * @param {object} files The notification metadata.
 * @param {object} apiResponse The full API response.
 */
export interface GetNotificationMetadataCallback {
    (err: Error | null, metadata?: ResponseBody, apiResponse?: unknown): void;
}
/**
 * @typedef {array} GetNotificationResponse
 * @property {Notification} 0 The {@link Notification}
 * @property {object} 1 The full API response.
 */
export type GetNotificationResponse = [Notification, unknown];
export interface GetNotificationOptions {
    /**
     * Automatically create the object if it does not exist. Default: `false`.
     */
    autoCreate?: boolean;
    /**
     * The ID of the project which will be billed for the request.
     */
    userProject?: string;
}
/**
 * @callback GetNotificationCallback
 * @param {?Error} err Request error, if any.
 * @param {Notification} notification The {@link Notification}.
 * @param {object} apiResponse The full API response.
 */
export interface GetNotificationCallback {
    (err: Error | null, notification?: Notification | null, apiResponse?: unknown): void;
}
/**
 * @callback DeleteNotificationCallback
 * @param {?Error} err Request error, if any.
 * @param {object} apiResponse The full API response.
 */
export interface DeleteNotificationCallback {
    (err: Error | null, apiResponse?: unknown): void;
}
export interface NotificationMetadata extends BaseMetadata {
    custom_attributes?: {
        [key: string]: string;
    };
    event_types?: string[];
    object_name_prefix?: string;
    payload_format?: 'JSON_API_V1' | 'NONE';
    topic?: string;
}
/**
 * The API-formatted resource description of the notification.
 *
 * Note: This is not guaranteed to be up-to-date when accessed. To get the
 * latest record, call the `getMetadata()` method.
 *
 * @name Notification#metadata
 * @type {object}
 */
/**
 * A Notification object is created from your {@link Bucket} object using
 * {@link Bucket#notification}. Use it to interact with Cloud Pub/Sub
 * notifications.
 *
 * See {@link https://cloud.google.com/storage/docs/pubsub-notifications| Cloud Pub/Sub Notifications for Google Cloud Storage}
 *
 * @class
 * @hideconstructor
 *
 * @param {Bucket} bucket The bucket instance this notification is attached to.
 * @param {string} id The ID of the notification.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const myBucket = storage.bucket('my-bucket');
 *
 * const notification = myBucket.notification('1');
 * ```
 */
declare class Notification extends ServiceObject<Notification, NotificationMetadata> {
    constructor(bucket: Bucket, id: string);
}
/**
 * Reference to the {@link Notification} class.
 * @name module:@google-cloud/storage.Notification
 * @see Notification
 */
export { Notification };
