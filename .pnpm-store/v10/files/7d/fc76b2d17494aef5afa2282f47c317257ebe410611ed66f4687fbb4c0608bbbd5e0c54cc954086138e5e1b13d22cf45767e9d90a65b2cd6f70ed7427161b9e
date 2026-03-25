/**
 * Method descriptor that is passed to middleware.
 */
export type MethodDescriptor = {
  /**
   * Full path of the method in form `/package.Service/Method`.
   */
  path: string;
  /**
   * True if method request is streamed.
   */
  requestStream: boolean;
  /**
   * True if method response is streamed.
   */
  responseStream: boolean;
  /**
   * Method options declared in Protobuf definition.
   */
  options: {
    idempotencyLevel?: 'IDEMPOTENT' | 'NO_SIDE_EFFECTS';
  };
};
