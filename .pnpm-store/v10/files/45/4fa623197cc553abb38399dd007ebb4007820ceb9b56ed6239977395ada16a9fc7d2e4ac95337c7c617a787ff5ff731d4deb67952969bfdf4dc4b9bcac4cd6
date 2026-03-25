import Client from './client'
import TPoolStats from './pool-stats'
import { URL } from 'url'
import Dispatcher from "./dispatcher";

export default Pool

declare class Pool extends Dispatcher {
  constructor(url: string | URL, options?: Pool.Options)
  /** `true` after `pool.close()` has been called. */
  closed: boolean;
  /** `true` after `pool.destroyed()` has been called or `pool.close()` has been called and the pool shutdown has completed. */
  destroyed: boolean;
  /** Aggregate stats for a Pool. */
  readonly stats: TPoolStats;
}

declare namespace Pool {
  export type PoolStats = TPoolStats;
  export interface Options extends Client.Options {
    /** Default: `(origin, opts) => new Client(origin, opts)`. */
    factory?(origin: URL, opts: object): Dispatcher;
    /** The max number of clients to create. `null` if no limit. Default `null`. */
    connections?: number | null;

    interceptors?: { Pool?: readonly Dispatcher.DispatchInterceptor[] } & Client.Options["interceptors"]
  }
}
