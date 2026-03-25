import Pool from './pool'
import Dispatcher from './dispatcher'
import { URL } from 'url'

export default BalancedPool

declare class BalancedPool extends Dispatcher {
  constructor(url: string | string[] | URL | URL[], options?: Pool.Options);

  addUpstream(upstream: string | URL): BalancedPool;
  removeUpstream(upstream: string | URL): BalancedPool;
  upstreams: Array<string>;

  /** `true` after `pool.close()` has been called. */
  closed: boolean;
  /** `true` after `pool.destroyed()` has been called or `pool.close()` has been called and the pool shutdown has completed. */
  destroyed: boolean;
}
