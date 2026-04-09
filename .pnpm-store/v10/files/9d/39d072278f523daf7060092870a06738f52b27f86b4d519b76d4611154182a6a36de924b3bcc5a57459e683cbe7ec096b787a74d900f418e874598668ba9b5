import BulkLoad from './bulk-load';
import Connection, { type ConnectionAuthentication, type ConnectionConfiguration, type ConnectionOptions } from './connection';
import Request from './request';
import { ConnectionError, RequestError } from './errors';
import { TYPES } from './data-type';
import { ISOLATION_LEVEL } from './transaction';
import { versions as TDS_VERSION } from './tds-versions';
declare const library: {
    name: string;
};
export declare function connect(config: ConnectionConfiguration, connectListener?: (err?: Error) => void): Connection;
export { BulkLoad, Connection, Request, library, ConnectionError, RequestError, TYPES, ISOLATION_LEVEL, TDS_VERSION };
export type { ConnectionAuthentication, ConnectionConfiguration, ConnectionOptions };
