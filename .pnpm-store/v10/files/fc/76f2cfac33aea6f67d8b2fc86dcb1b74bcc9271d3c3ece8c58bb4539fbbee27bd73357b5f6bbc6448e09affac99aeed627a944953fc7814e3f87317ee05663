import { BaseMetadata, ServiceObject } from './nodejs-common/index.js';
import { Storage } from './storage.js';
export interface StopCallback {
    (err: Error | null, apiResponse?: unknown): void;
}
/**
 * Create a channel object to interact with a Cloud Storage channel.
 *
 * See {@link https://cloud.google.com/storage/docs/object-change-notification| Object Change Notification}
 *
 * @class
 *
 * @param {string} id The ID of the channel.
 * @param {string} resourceId The resource ID of the channel.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const channel = storage.channel('id', 'resource-id');
 * ```
 */
declare class Channel extends ServiceObject<Channel, BaseMetadata> {
    constructor(storage: Storage, id: string, resourceId: string);
    stop(): Promise<unknown>;
    stop(callback: StopCallback): void;
}
/**
 * Reference to the {@link Channel} class.
 * @name module:@google-cloud/storage.Channel
 * @see Channel
 */
export { Channel };
