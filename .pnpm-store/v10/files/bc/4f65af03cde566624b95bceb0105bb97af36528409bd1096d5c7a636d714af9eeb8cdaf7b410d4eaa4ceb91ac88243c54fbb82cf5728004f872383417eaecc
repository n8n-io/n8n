// src/test/request-factory.ts
import { Request } from "../request.mjs";
import { MethodDescriptor } from "../method-descriptor.mjs";
var requestFactory = ({
  method = "GET",
  host = "http://example.org",
  path = "/path",
  auth,
  body,
  headers,
  params,
  timeout,
  context,
  ...rest
} = {}) => {
  const methodDescriptor = new MethodDescriptor({ method, host, path });
  return new Request(
    methodDescriptor,
    {
      auth,
      body,
      headers,
      params,
      timeout,
      ...rest
    },
    context
  );
};
export {
  requestFactory
};
//# sourceMappingURL=request-factory.mjs.map