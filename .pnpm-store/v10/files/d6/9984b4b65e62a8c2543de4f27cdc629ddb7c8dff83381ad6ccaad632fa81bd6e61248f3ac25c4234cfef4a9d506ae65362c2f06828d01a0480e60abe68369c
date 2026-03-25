// src/test/response-factory.ts
import { Response } from "../response.mjs";
import { requestFactory } from "./request-factory.mjs";
var responseFactory = ({
  method = "GET",
  host = "http://example.org",
  path = "/path",
  request = requestFactory({ method, host, path }),
  status = 200,
  data = {},
  headers = {},
  errors = []
} = {}) => {
  let responseData;
  let contentType;
  if (typeof data === "string") {
    contentType = "text/plain";
    responseData = data;
  } else {
    contentType = "application/json";
    responseData = JSON.stringify(data);
  }
  return new Response(
    request,
    status,
    responseData,
    { "content-type": contentType, ...headers },
    errors
  );
};
export {
  responseFactory
};
//# sourceMappingURL=response-factory.mjs.map