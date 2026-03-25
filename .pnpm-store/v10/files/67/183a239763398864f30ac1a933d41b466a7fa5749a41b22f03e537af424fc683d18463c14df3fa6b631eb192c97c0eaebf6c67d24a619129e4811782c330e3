import {Metadata} from '../Metadata';

/**
 * Call options accepted by client methods.
 */
export type CallOptions = {
  /**
   * Request metadata.
   */
  metadata?: Metadata;
  /**
   * Signal that cancels the call once aborted.
   */
  signal?: AbortSignal;
  /**
   * Called when header is received.
   */
  onHeader?(header: Metadata): void;
  /**
   * Called when trailer is received.
   */
  onTrailer?(trailer: Metadata): void;
};
