import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";
export interface HttpWaitStrategyOptions {
    abortOnContainerExit?: boolean;
}
export declare class HttpWaitStrategy extends AbstractWaitStrategy {
    private readonly path;
    private readonly port;
    private readonly options;
    private protocol;
    private method;
    private headers;
    private readonly predicates;
    private _allowInsecure;
    private readTimeoutMs;
    constructor(path: string, port: number, options: HttpWaitStrategyOptions);
    forStatusCode(statusCode: number): this;
    forStatusCodeMatching(predicate: (statusCode: number) => boolean): this;
    forResponsePredicate(predicate: (response: string) => boolean): this;
    withMethod(method: string): this;
    withHeaders(headers: {
        [key: string]: string;
    }): this;
    withBasicCredentials(username: string, password: string): this;
    withReadTimeout(startupTimeoutMs: number): this;
    usingTls(): this;
    allowInsecure(): this;
    waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void>;
    private handleContainerExit;
    private getAgent;
}
