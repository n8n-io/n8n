"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerStorage = void 0;
/**
 * Storage manager for handler state.
 */
class HandlerStorage {
    /**
     * Creates an instance of the HandlerStorage.
     * @param storage The storage provider.
     * @param context The turn context.
     */
    constructor(storage, context) {
        this.storage = storage;
        this.context = context;
    }
    /**
     * Gets the unique key for a handler session.
     */
    get key() {
        var _a, _b, _c;
        const channelId = (_a = this.context.activity.channelId) === null || _a === void 0 ? void 0 : _a.trim();
        const userId = (_c = (_b = this.context.activity.from) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.trim();
        if (!channelId || !userId) {
            throw new Error(`Both 'activity.channelId' and 'activity.from.id' are required to generate the ${HandlerStorage.name} key.`);
        }
        return `auth/${channelId}/${userId}`;
    }
    /**
     * Reads the active handler state from storage.
     */
    async read() {
        const ongoing = await this.storage.read([this.key]);
        return ongoing === null || ongoing === void 0 ? void 0 : ongoing[this.key];
    }
    /**
     * Writes handler state to storage.
     */
    write(data) {
        return this.storage.write({ [this.key]: data });
    }
    /**
     * Deletes handler state from storage.
     */
    async delete() {
        try {
            await this.storage.delete([this.key]);
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 404) {
                return;
            }
            throw error;
        }
    }
}
exports.HandlerStorage = HandlerStorage;
//# sourceMappingURL=handlerStorage.js.map