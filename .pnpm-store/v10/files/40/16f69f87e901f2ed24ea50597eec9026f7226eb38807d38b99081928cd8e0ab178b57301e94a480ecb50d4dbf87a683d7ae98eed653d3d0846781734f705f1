/// <reference types="node" />

import { sasl } from "./sasl";
import { generate_uuid, string_to_uuid, uuid_to_string } from "./util";
import { ws } from "./ws";
import { filter } from "./filter";
import { EventEmitter } from "events";
import { Connection, ConnectionOptions, ServerConnectionOptions, TlsServerConnectionOptions } from "./connection";
import { Server, Socket } from "net";
import { Server as TlsServer, ConnectionOptions as TlsConnectionOptions } from "tls";
import { message } from "./message";
import { types } from "./types";

interface ContainerOptions {
  id?: string;
  non_fatal_errors?: string[];
  [x: string]: any;
}

export declare interface Container extends EventEmitter {
  options: ContainerOptions;
  id: string;
  sasl_server_mechanisms: any;
  connect(options?: ConnectionOptions): Connection;
  create_connection(options?: ConnectionOptions): Connection;
  listen(options: TlsServerConnectionOptions): TlsServer;
  listen(options: ServerConnectionOptions): Server;
  create_container(options?: ContainerOptions): Container;
  get_option(name: string, default_value: any): any;
  generate_uuid: generate_uuid;
  string_to_uuid: string_to_uuid;
  uuid_to_string: uuid_to_string;
  websocket_accept(socket: Socket, options: TlsConnectionOptions): void;
  websocket_connect: ws.connect;
  filter: filter;
  types: types;
  message: message;
  sasl: sasl;
}
