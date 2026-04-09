import { AzureOpenAI, OpenAI } from '../../index';
import { OpenAIError } from '../../error';
import * as Core from '../../core';
import type { RealtimeClientEvent, RealtimeServerEvent } from '../../resources/beta/realtime/realtime';
import { OpenAIRealtimeEmitter, buildRealtimeURL, isAzure } from './internal-base';

interface MessageEvent {
  data: string;
}

type _WebSocket =
  typeof globalThis extends (
    {
      WebSocket: infer ws extends abstract new (...args: any) => any;
    }
  ) ?
    // @ts-ignore
    InstanceType<ws>
  : any;

export class OpenAIRealtimeWebSocket extends OpenAIRealtimeEmitter {
  url: URL;
  socket: _WebSocket;

  constructor(
    props: {
      model: string;
      dangerouslyAllowBrowser?: boolean;
      /**
       * Callback to mutate the URL, needed for Azure.
       * @internal
       */
      onURL?: (url: URL) => void;
    },
    client?: Pick<OpenAI, 'apiKey' | 'baseURL'>,
  ) {
    super();

    const dangerouslyAllowBrowser =
      props.dangerouslyAllowBrowser ??
      (client as any)?._options?.dangerouslyAllowBrowser ??
      (client?.apiKey.startsWith('ek_') ? true : null);

    if (!dangerouslyAllowBrowser && Core.isRunningInBrowser()) {
      throw new OpenAIError(
        "It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\n\nYou can avoid this error by creating an ephemeral session token:\nhttps://platform.openai.com/docs/api-reference/realtime-sessions\n",
      );
    }

    client ??= new OpenAI({ dangerouslyAllowBrowser });

    this.url = buildRealtimeURL(client, props.model);
    props.onURL?.(this.url);

    // @ts-ignore
    this.socket = new WebSocket(this.url.toString(), [
      'realtime',
      ...(isAzure(client) ? [] : [`openai-insecure-api-key.${client.apiKey}`]),
      'openai-beta.realtime-v1',
    ]);

    this.socket.addEventListener('message', (websocketEvent: MessageEvent) => {
      const event = (() => {
        try {
          return JSON.parse(websocketEvent.data.toString()) as RealtimeServerEvent;
        } catch (err) {
          this._onError(null, 'could not parse websocket event', err);
          return null;
        }
      })();

      if (event) {
        this._emit('event', event);

        if (event.type === 'error') {
          this._onError(event);
        } else {
          // @ts-expect-error TS isn't smart enough to get the relationship right here
          this._emit(event.type, event);
        }
      }
    });

    this.socket.addEventListener('error', (event: any) => {
      this._onError(null, event.message, null);
    });

    if (isAzure(client)) {
      if (this.url.searchParams.get('Authorization') !== null) {
        this.url.searchParams.set('Authorization', '<REDACTED>');
      } else {
        this.url.searchParams.set('api-key', '<REDACTED>');
      }
    }
  }

  static async azure(
    client: Pick<AzureOpenAI, '_getAzureADToken' | 'apiVersion' | 'apiKey' | 'baseURL' | 'deploymentName'>,
    options: { deploymentName?: string; dangerouslyAllowBrowser?: boolean } = {},
  ): Promise<OpenAIRealtimeWebSocket> {
    const token = await client._getAzureADToken();
    function onURL(url: URL) {
      if (client.apiKey !== '<Missing Key>') {
        url.searchParams.set('api-key', client.apiKey);
      } else {
        if (token) {
          url.searchParams.set('Authorization', `Bearer ${token}`);
        } else {
          throw new Error('AzureOpenAI is not instantiated correctly. No API key or token provided.');
        }
      }
    }
    const deploymentName = options.deploymentName ?? client.deploymentName;
    if (!deploymentName) {
      throw new Error('No deployment name provided');
    }
    const { dangerouslyAllowBrowser } = options;
    return new OpenAIRealtimeWebSocket(
      {
        model: deploymentName,
        onURL,
        ...(dangerouslyAllowBrowser ? { dangerouslyAllowBrowser } : {}),
      },
      client,
    );
  }

  send(event: RealtimeClientEvent) {
    try {
      this.socket.send(JSON.stringify(event));
    } catch (err) {
      this._onError(null, 'could not send data', err);
    }
  }

  close(props?: { code: number; reason: string }) {
    try {
      this.socket.close(props?.code ?? 1000, props?.reason ?? 'OK');
    } catch (err) {
      this._onError(null, 'could not close the connection', err);
    }
  }
}
