/// <reference types="node" />

/**
 * Describes the required shape of WebSocket instances.
 * @interface WebSocketInstance
 */
export interface WebSocketInstance {
  send: Function;
  close: Function;
  onmessage: Function | null;
  onopen: Function | null;
  onclose: Function | null;
  onerror: Function | null;
}

/**
 * Describes the required shape of WebSocket constructors.
 * @interface WebSocketImpl
 */
export interface WebSocketImpl {
  new(url: string, protocols?: string | string[], options?: any): WebSocketInstance;
}

export namespace ws {
  export type connect = (Impl: WebSocketImpl) => (url: string, protocols: string | string[], options: any) => () => {
    [x: string]: any;
    connect: (port_ignore: any, host_ignore: any, options_ignore: any, callback: Function) => {
      [x: string]: any;
      end: () => void;
      write: (data: any) => void;
      on: (event: string, handler: Function) => void;
      get_id_string: () => string;
    }
  };
  export type wrap = (ws: any) => {
    [x: string]: any;
    end: () => void;
    write: (data: any) => void;
    on: (event: string, handler: Function) => void;
    get_id_string: () => string;
  }
}
