/// <reference types="node" />

import { Connection } from "./connection";
import { Transport } from "./transport";
import { Socket } from "net";
import { frames } from "./frames";

interface Mechanisms {
  [x: string]: Function;
}

declare class PlainServer {
  callback: Function;
  outcome?: true;
  username?: string;
  constructor(callback: Function);
  start(response: Buffer, hostname: string): void;
}

declare class PlainClient {
  username: string;
  password: string;
  constructor(username: string, password: string);
  start(callback: Function): void;
}

declare class AnonymousServer {
  outcome?: true;
  username?: string;
  start(response?: Buffer): void;
}

declare class AnonymousClient {
  username: string;
  constructor(username: string);
  start(callback: Function): void;
}

declare class ExternalServer {
  outcome?: true;
  username?: string;
  start(): void;
}

declare class ExternalClient {
  username?: string;
  start(callback: Function): void;
  step(callback: Function): void;
}

declare class XOAuth2Client {
  username: string;
  token: string;
  constructor(username: string, token: string);
  start(callback: Function): void;
}

declare class SaslServer {
  connection: Connection;
  mechanisms?: Mechanisms;
  transport: Transport;
  next: Transport;
  constructor(connection: Connection, mechanisms?: Mechanisms);
  outcome?: boolean;
  mechanism?: any;
  username?: string;
  do_step(challenge: any): void;
  on_sasl_init(frame: frames): void;
  on_sasl_response(frame: frames): void;
  has_writes_pending(): boolean;
  write(socket: Socket): void;
  peek_size(buffer: Buffer): number | undefined;
  read(buffer: Buffer): number;
}

declare class SaslClient {
  connection: Connection;
  mechanisms: Mechanisms;
  mechanism?: any;
  transport: Transport;
  next: Transport;
  mechanism_name?: string;
  hostname: string;
  failed: boolean;
  constructor(connection: Connection, mechanisms: Mechanisms, hostname: string);
  on_sasl_mechanisms(frame: frames): void;
  on_sasl_challenge(frame: frames): void;
  on_sasl_outcome(frame: frames): void;
  has_writes_pending(): boolean;
  write(socket: Socket): void;
  peek_size(buffer: Buffer): number | undefined;
  read(buffer: Buffer): number;
}

declare class SelectiveServer {
  header_received: boolean;
  transports: {
    0: Transport,
    3: SaslServer
  };
  selected?: any;
  constructor(connection: Connection, mechanisms: Mechanisms);
  has_writes_pending(): boolean;
  write(socket: Socket): void | number;
  peek_size(buffer: Buffer): number | undefined;
  read(buffer: Buffer): number;
}

type DefaultServerMechanisms = {
  enable_anonymous(): void;
  enable_plain(): void;
}

type DefaultClientMmechanisms = {
  enable_anonymous(name: string): void;
  enable_plain(username: string, password: string): void;
  enable_external(): void;
  enable_xoauth2(username: string, token: string): void;
}

declare type serverMechanisms = () => DefaultServerMechanisms;
declare type clientMechanisms = () => DefaultClientMmechanisms;
declare type serverAddExternal = (mechs: any) => any;

export interface sasl {
  Client: SaslClient;
  Server: SaslServer;
  Selective: SelectiveServer;
  server_mechanisms: serverMechanisms;
  client_mechanisms: clientMechanisms;
  server_add_external: serverAddExternal;
}
