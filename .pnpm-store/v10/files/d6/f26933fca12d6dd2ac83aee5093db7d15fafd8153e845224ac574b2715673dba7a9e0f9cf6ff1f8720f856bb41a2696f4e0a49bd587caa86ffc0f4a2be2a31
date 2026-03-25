/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { Logger } from '@azure/msal-common/browser';
import { EventType } from './EventType.mjs';
import { createGuid } from '../utils/BrowserUtils.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const BROADCAST_CHANNEL_NAME = "msal.broadcast.event";
class EventHandler {
    constructor(logger) {
        this.eventCallbacks = new Map();
        this.logger = logger || new Logger({});
        if (typeof BroadcastChannel !== "undefined") {
            this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        }
        this.invokeCrossTabCallbacks = this.invokeCrossTabCallbacks.bind(this);
    }
    /**
     * Adds event callbacks to array
     * @param callback - callback to be invoked when an event is raised
     * @param eventTypes - list of events that this callback will be invoked for, if not provided callback will be invoked for all events
     * @param callbackId - Identifier for the callback, used to locate and remove the callback when no longer required
     */
    addEventCallback(callback, eventTypes, callbackId) {
        if (typeof window !== "undefined") {
            const id = callbackId || createGuid();
            if (this.eventCallbacks.has(id)) {
                this.logger.error(`Event callback with id: ${id} is already registered. Please provide a unique id or remove the existing callback and try again.`);
                return null;
            }
            this.eventCallbacks.set(id, [callback, eventTypes || []]);
            this.logger.verbose(`Event callback registered with id: ${id}`);
            return id;
        }
        return null;
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        this.eventCallbacks.delete(callbackId);
        this.logger.verbose(`Event callback ${callbackId} removed.`);
    }
    /**
     * Emits events by calling callback with event message
     * @param eventType
     * @param interactionType
     * @param payload
     * @param error
     */
    emitEvent(eventType, interactionType, payload, error) {
        const message = {
            eventType: eventType,
            interactionType: interactionType || null,
            payload: payload || null,
            error: error || null,
            timestamp: Date.now(),
        };
        switch (eventType) {
            case EventType.ACCOUNT_ADDED:
            case EventType.ACCOUNT_REMOVED:
            case EventType.ACTIVE_ACCOUNT_CHANGED:
                // Send event to other open tabs / MSAL instances on same domain
                this.broadcastChannel?.postMessage(message);
                break;
            default:
                // Emit event to callbacks registered in this instance
                this.invokeCallbacks(message);
                break;
        }
    }
    /**
     * Invoke registered callbacks
     * @param message
     */
    invokeCallbacks(message) {
        this.eventCallbacks.forEach(([callback, eventTypes], callbackId) => {
            if (eventTypes.length === 0 ||
                eventTypes.includes(message.eventType)) {
                this.logger.verbose(`Emitting event to callback ${callbackId}: ${message.eventType}`);
                callback.apply(null, [message]);
            }
        });
    }
    /**
     * Wrapper around invokeCallbacks to handle broadcast events received from other tabs/instances
     * @param event
     */
    invokeCrossTabCallbacks(event) {
        const message = event.data;
        this.invokeCallbacks(message);
    }
    /**
     * Listen for events broadcasted from other tabs/instances
     */
    subscribeCrossTab() {
        this.broadcastChannel?.addEventListener("message", this.invokeCrossTabCallbacks);
    }
    /**
     * Unsubscribe from broadcast events
     */
    unsubscribeCrossTab() {
        this.broadcastChannel?.removeEventListener("message", this.invokeCrossTabCallbacks);
    }
}

export { EventHandler };
//# sourceMappingURL=EventHandler.mjs.map
