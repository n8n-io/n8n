"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLWebSocketClient = void 0;
/* eslint-disable */
const resolveRequestDocument_js_1 = require("./resolveRequestDocument.js");
const types_js_1 = require("./types.js");
// import type WebSocket from 'ws'
const CONNECTION_INIT = `connection_init`;
const CONNECTION_ACK = `connection_ack`;
const PING = `ping`;
const PONG = `pong`;
const SUBSCRIBE = `subscribe`;
const NEXT = `next`;
const ERROR = `error`;
const COMPLETE = `complete`;
class GraphQLWebSocketMessage {
    get type() {
        return this._type;
    }
    get id() {
        return this._id;
    }
    get payload() {
        return this._payload;
    }
    constructor(type, payload, id) {
        this._type = type;
        this._payload = payload;
        this._id = id;
    }
    get text() {
        const result = { type: this.type };
        if (this.id != null && this.id != undefined)
            result.id = this.id;
        if (this.payload != null && this.payload != undefined)
            result.payload = this.payload;
        return JSON.stringify(result);
    }
    static parse(data, f) {
        const { type, payload, id } = JSON.parse(data);
        return new GraphQLWebSocketMessage(type, f(payload), id);
    }
}
class GraphQLWebSocketClient {
    constructor(socket, { onInit, onAcknowledged, onPing, onPong }) {
        this.socketState = { acknowledged: false, lastRequestId: 0, subscriptions: {} };
        this.socket = socket;
        socket.addEventListener(`open`, async (e) => {
            this.socketState.acknowledged = false;
            this.socketState.subscriptions = {};
            socket.send(ConnectionInit(onInit ? await onInit() : null).text);
        });
        socket.addEventListener(`close`, (e) => {
            this.socketState.acknowledged = false;
            this.socketState.subscriptions = {};
        });
        socket.addEventListener(`error`, (e) => {
            console.error(e);
        });
        socket.addEventListener(`message`, (e) => {
            try {
                const message = parseMessage(e.data);
                switch (message.type) {
                    case CONNECTION_ACK: {
                        if (this.socketState.acknowledged) {
                            console.warn(`Duplicate CONNECTION_ACK message ignored`);
                        }
                        else {
                            this.socketState.acknowledged = true;
                            if (onAcknowledged)
                                onAcknowledged(message.payload);
                        }
                        return;
                    }
                    case PING: {
                        if (onPing)
                            onPing(message.payload).then((r) => socket.send(Pong(r).text));
                        else
                            socket.send(Pong(null).text);
                        return;
                    }
                    case PONG: {
                        if (onPong)
                            onPong(message.payload);
                        return;
                    }
                }
                if (!this.socketState.acknowledged) {
                    // Web-socket connection not acknowledged
                    return;
                }
                if (message.id === undefined || message.id === null || !this.socketState.subscriptions[message.id]) {
                    // No subscription identifer or subscription indentifier is not found
                    return;
                }
                const { query, variables, subscriber } = this.socketState.subscriptions[message.id];
                switch (message.type) {
                    case NEXT: {
                        if (!message.payload.errors && message.payload.data) {
                            subscriber.next && subscriber.next(message.payload.data);
                        }
                        if (message.payload.errors) {
                            subscriber.error &&
                                subscriber.error(new types_js_1.ClientError({ ...message.payload, status: 200 }, { query, variables }));
                        }
                        else {
                        }
                        return;
                    }
                    case ERROR: {
                        subscriber.error &&
                            subscriber.error(new types_js_1.ClientError({ errors: message.payload, status: 200 }, { query, variables }));
                        return;
                    }
                    case COMPLETE: {
                        subscriber.complete && subscriber.complete();
                        delete this.socketState.subscriptions[message.id];
                        return;
                    }
                }
            }
            catch (e) {
                // Unexpected errors while handling graphql-ws message
                console.error(e);
                socket.close(1006);
            }
            socket.close(4400, `Unknown graphql-ws message.`);
        });
    }
    makeSubscribe(query, operationName, subscriber, variables) {
        const subscriptionId = (this.socketState.lastRequestId++).toString();
        this.socketState.subscriptions[subscriptionId] = { query, variables, subscriber };
        this.socket.send(Subscribe(subscriptionId, { query, operationName, variables }).text);
        return () => {
            this.socket.send(Complete(subscriptionId).text);
            delete this.socketState.subscriptions[subscriptionId];
        };
    }
    rawRequest(query, variables) {
        return new Promise((resolve, reject) => {
            let result;
            this.rawSubscribe(query, {
                next: (data, extensions) => (result = { data, extensions }),
                error: reject,
                complete: () => resolve(result),
            }, variables);
        });
    }
    request(document, variables) {
        return new Promise((resolve, reject) => {
            let result;
            this.subscribe(document, {
                next: (data) => (result = data),
                error: reject,
                complete: () => resolve(result),
            }, variables);
        });
    }
    subscribe(document, subscriber, variables) {
        const { query, operationName } = (0, resolveRequestDocument_js_1.resolveRequestDocument)(document);
        return this.makeSubscribe(query, operationName, subscriber, variables);
    }
    rawSubscribe(query, subscriber, variables) {
        return this.makeSubscribe(query, undefined, subscriber, variables);
    }
    ping(payload) {
        this.socket.send(Ping(payload).text);
    }
    close() {
        this.socket.close(1000);
    }
}
GraphQLWebSocketClient.PROTOCOL = `graphql-transport-ws`;
exports.GraphQLWebSocketClient = GraphQLWebSocketClient;
// Helper functions
function parseMessage(data, f = (a) => a) {
    const m = GraphQLWebSocketMessage.parse(data, f);
    return m;
}
function ConnectionInit(payload) {
    return new GraphQLWebSocketMessage(CONNECTION_INIT, payload);
}
function Ping(payload) {
    return new GraphQLWebSocketMessage(PING, payload, undefined);
}
function Pong(payload) {
    return new GraphQLWebSocketMessage(PONG, payload, undefined);
}
function Subscribe(id, payload) {
    return new GraphQLWebSocketMessage(SUBSCRIBE, payload, id);
}
function Complete(id) {
    return new GraphQLWebSocketMessage(COMPLETE, undefined, id);
}
//# sourceMappingURL=graphql-ws.js.map