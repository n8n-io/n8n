import * as WS from 'ws';
import { OpenAI } from "../../index.mjs";
import { OpenAIRealtimeEmitter, buildRealtimeURL, isAzure } from "./internal-base.mjs";
export class OpenAIRealtimeWS extends OpenAIRealtimeEmitter {
    constructor(props, client) {
        super();
        client ?? (client = new OpenAI());
        this.url = buildRealtimeURL(client, props.model);
        this.socket = new WS.WebSocket(this.url, {
            ...props.options,
            headers: {
                ...props.options?.headers,
                ...(isAzure(client) ? {} : { Authorization: `Bearer ${client.apiKey}` }),
                'OpenAI-Beta': 'realtime=v1',
            },
        });
        this.socket.on('message', (wsEvent) => {
            const event = (() => {
                try {
                    return JSON.parse(wsEvent.toString());
                }
                catch (err) {
                    this._onError(null, 'could not parse websocket event', err);
                    return null;
                }
            })();
            if (event) {
                this._emit('event', event);
                if (event.type === 'error') {
                    this._onError(event);
                }
                else {
                    // @ts-expect-error TS isn't smart enough to get the relationship right here
                    this._emit(event.type, event);
                }
            }
        });
        this.socket.on('error', (err) => {
            this._onError(null, err.message, err);
        });
    }
    static async azure(client, options = {}) {
        const deploymentName = options.deploymentName ?? client.deploymentName;
        if (!deploymentName) {
            throw new Error('No deployment name provided');
        }
        return new OpenAIRealtimeWS({ model: deploymentName, options: { headers: await getAzureHeaders(client) } }, client);
    }
    send(event) {
        try {
            this.socket.send(JSON.stringify(event));
        }
        catch (err) {
            this._onError(null, 'could not send data', err);
        }
    }
    close(props) {
        try {
            this.socket.close(props?.code ?? 1000, props?.reason ?? 'OK');
        }
        catch (err) {
            this._onError(null, 'could not close the connection', err);
        }
    }
}
async function getAzureHeaders(client) {
    if (client.apiKey !== '<Missing Key>') {
        return { 'api-key': client.apiKey };
    }
    else {
        const token = await client._getAzureADToken();
        if (token) {
            return { Authorization: `Bearer ${token}` };
        }
        else {
            throw new Error('AzureOpenAI is not instantiated correctly. No API key or token provided.');
        }
    }
}
//# sourceMappingURL=ws.mjs.map