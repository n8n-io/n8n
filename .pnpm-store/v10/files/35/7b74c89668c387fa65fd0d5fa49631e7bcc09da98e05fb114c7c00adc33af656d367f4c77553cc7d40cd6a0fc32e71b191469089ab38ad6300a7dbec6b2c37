/// <reference types="node" />
import { EventEmitter } from "events";
import ConnectionPool from "./ConnectionPool";
export default class ClusterSubscriber {
    private connectionPool;
    private emitter;
    private started;
    private subscriber;
    private lastActiveSubscriber;
    constructor(connectionPool: ConnectionPool, emitter: EventEmitter);
    getInstance(): any;
    start(): void;
    stop(): void;
    private onSubscriberEnd;
    private selectSubscriber;
}
