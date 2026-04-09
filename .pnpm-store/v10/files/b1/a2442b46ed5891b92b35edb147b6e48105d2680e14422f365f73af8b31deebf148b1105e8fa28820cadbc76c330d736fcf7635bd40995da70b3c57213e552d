"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgent = getAgent;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const undici_1 = require("undici");
const get_input_url_1 = require("./get-input-url");
const handle_request_1 = require("./handle-request");
const HarHttpAgent = createAgentClass(http.Agent);
const HarHttpsAgent = createAgentClass(https.Agent);
let globalHttpAgent;
let globalHttpsAgent;
// Add new Undici dispatcher
class HarDispatcher extends undici_1.Dispatcher {
    constructor(opts) {
        super(opts);
    }
    dispatch(options, handler) {
        // Handle HAR logging here similar to handleRequest
        (0, handle_request_1.handleRequest)({ input: options, handler, harLog: new Map(), isUndici: true });
        return super.dispatch(options, handler);
    }
}
function getAgent(input, options) {
    // Add Undici dispatcher support
    if (options.dispatcher) {
        if (options.dispatcher instanceof undici_1.Dispatcher) {
            return new HarDispatcher(options.dispatcher);
        }
        return options.dispatcher;
    }
    if (options.agent) {
        if (typeof options.agent === 'function') {
            return function (...args) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const agent = options.agent.call(this, ...args);
                if (agent) {
                    instrumentAgentInstance(agent);
                    return agent;
                }
                return getGlobalAgent(input);
            };
        }
        instrumentAgentInstance(options.agent);
        return options.agent;
    }
    return getGlobalAgent(input);
}
function getGlobalAgent(input) {
    const url = (0, get_input_url_1.getInputUrl)(input);
    if (url.protocol === 'http:') {
        if (!globalHttpAgent) {
            globalHttpAgent = new HarHttpAgent();
        }
        return globalHttpAgent;
    }
    if (!globalHttpsAgent) {
        globalHttpsAgent = new HarHttpsAgent();
    }
    return globalHttpsAgent;
}
/**
 * Instrument an existing Agent instance. This overrides the instance's
 * `addRequest` method. It should be fine to continue using for requests made
 * without `withHar` - if the request doesn't have our `x-har-request-id`
 * header, it won't do anything extra.
 */
function instrumentAgentInstance(agent) {
    const { addRequest: originalAddRequest } = agent;
    if (!originalAddRequest.isHarEnabled) {
        agent.addRequest = function addRequest(request, ...args) {
            (0, handle_request_1.handleRequest)(request, ...args);
            return originalAddRequest.call(this, request, ...args);
        };
        agent.addRequest.isHarEnabled = true;
    }
}
function createAgentClass(BaseAgent) {
    class HarAgent extends BaseAgent {
        constructor(...args) {
            super(...args);
            this.addRequest.isHarEnabled = true;
        }
        addRequest(request, ...args) {
            (0, handle_request_1.handleRequest)(request, ...args);
            return super.addRequest(request, ...args);
        }
    }
    return HarAgent;
}
//# sourceMappingURL=get-agent.js.map