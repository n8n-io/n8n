import {Metadata} from '../Metadata';

/**
 * Call context passed to server methods.
 */
export type CallContext = {
  /**
   * Request metadata from client.
   */
  metadata: Metadata;
  /**
   * Client address.
   */
  peer: string;
  /**
   * Response header. Sent with the first response, or when `sendHeader` is
   * called.
   */
  header: Metadata;
  /**
   * Manually send response header.
   */
  sendHeader(): void;
  /**
   * Response trailer. Sent when server method returns or throws.
   */
  trailer: Metadata;
  /**
   * Signal that is aborted once the call gets cancelled.
   */
  signal: AbortSignal;
};
