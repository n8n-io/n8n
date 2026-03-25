import { AddressInfo } from 'node:net';
import { Options, ServerType } from './types.mjs';
import 'node:http';
import 'node:http2';
import 'node:https';

declare const createAdaptorServer: (options: Options) => ServerType;
declare const serve: (options: Options, listeningListener?: (info: AddressInfo) => void) => ServerType;

export { createAdaptorServer, serve };
