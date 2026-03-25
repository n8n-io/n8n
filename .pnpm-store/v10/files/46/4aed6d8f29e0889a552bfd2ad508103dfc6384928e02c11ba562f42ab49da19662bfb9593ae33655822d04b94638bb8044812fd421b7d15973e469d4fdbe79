/// <reference types="node" />
import net from 'net';
import http from 'http';
import { EventEmitter } from 'events';
declare function createAgent(opts?: createAgent.AgentOptions): createAgent.Agent;
declare namespace createAgent {
    var prototype: Agent;
}
declare function createAgent(callback: createAgent.AgentCallback, opts?: createAgent.AgentOptions): createAgent.Agent;
declare namespace createAgent {
    var prototype: Agent;
}
declare namespace createAgent {
    type ClientRequest = http.ClientRequest & {
        _last?: boolean;
        _hadError?: boolean;
        method: string;
    };
    type AgentCallbackReturn = net.Socket | createAgent.Agent | http.Agent;
    type AgentCallbackCallback = (err: Error | null | undefined, socket: createAgent.AgentCallbackReturn) => void;
    type AgentCallbackPromise = (req: createAgent.ClientRequest, opts: createAgent.RequestOptions) => createAgent.AgentCallbackReturn | Promise<createAgent.AgentCallbackReturn>;
    type AgentCallback = typeof Agent.prototype.callback;
    type AgentOptions = http.AgentOptions & {};
    type RequestOptions = http.RequestOptions & {
        port: number;
        secureEndpoint: boolean;
    };
    /**
     * Base `http.Agent` implementation.
     * No pooling/keep-alive is implemented by default.
     *
     * @param {Function} callback
     * @api public
     */
    class Agent extends EventEmitter {
        timeout: number | null;
        options?: createAgent.AgentOptions;
        maxFreeSockets: number;
        maxSockets: number;
        sockets: net.Socket[];
        requests: http.ClientRequest[];
        private promisifiedCallback?;
        private explicitDefaultPort?;
        private explicitProtocol?;
        constructor(callback?: createAgent.AgentCallback | createAgent.AgentOptions, _opts?: createAgent.AgentOptions);
        get defaultPort(): number;
        set defaultPort(v: number);
        get protocol(): string;
        set protocol(v: string);
        callback(req: createAgent.ClientRequest, opts: createAgent.RequestOptions, fn: createAgent.AgentCallbackCallback): void;
        callback(req: createAgent.ClientRequest, opts: createAgent.RequestOptions): createAgent.AgentCallbackReturn | Promise<createAgent.AgentCallbackReturn>;
        /**
         * Called by node-core's "_http_client.js" module when creating
         * a new HTTP request with this Agent instance.
         *
         * @api public
         */
        addRequest(req: ClientRequest, _opts: RequestOptions): void;
        freeSocket(socket: net.Socket, opts: AgentOptions): void;
        destroy(): void;
    }
}
export = createAgent;
