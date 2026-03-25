// src/adapter/aws-lambda/handler.ts
import { decodeBase64, encodeBase64 } from "../../utils/encode.js";
function sanitizeHeaderValue(value) {
  const hasNonAscii = /[^\x00-\x7F]/.test(value);
  if (!hasNonAscii) {
    return value;
  }
  return encodeURIComponent(value);
}
var getRequestContext = (event) => {
  return event.requestContext;
};
var streamToNodeStream = async (reader, writer) => {
  let readResult = await reader.read();
  while (!readResult.done) {
    writer.write(readResult.value);
    readResult = await reader.read();
  }
  writer.end();
};
var streamHandle = (app) => {
  return awslambda.streamifyResponse(
    async (event, responseStream, context) => {
      const processor = getProcessor(event);
      try {
        const req = processor.createRequest(event);
        const requestContext = getRequestContext(event);
        const res = await app.fetch(req, {
          event,
          requestContext,
          context
        });
        const headers = {};
        const cookies = [];
        res.headers.forEach((value, name) => {
          if (name === "set-cookie") {
            cookies.push(value);
          } else {
            headers[name] = value;
          }
        });
        const httpResponseMetadata = {
          statusCode: res.status,
          headers,
          cookies
        };
        responseStream = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata);
        if (res.body) {
          await streamToNodeStream(res.body.getReader(), responseStream);
        } else {
          responseStream.write("");
        }
      } catch (error) {
        console.error("Error processing request:", error);
        responseStream.write("Internal Server Error");
      } finally {
        responseStream.end();
      }
    }
  );
};
var handle = (app, { isContentTypeBinary } = { isContentTypeBinary: void 0 }) => {
  return async (event, lambdaContext) => {
    const processor = getProcessor(event);
    const req = processor.createRequest(event);
    const requestContext = getRequestContext(event);
    const res = await app.fetch(req, {
      event,
      requestContext,
      lambdaContext
    });
    return processor.createResult(event, res, { isContentTypeBinary });
  };
};
var EventProcessor = class {
  getHeaderValue(headers, key) {
    const value = headers ? Array.isArray(headers[key]) ? headers[key][0] : headers[key] : void 0;
    return value;
  }
  getDomainName(event) {
    if (event.requestContext && "domainName" in event.requestContext) {
      return event.requestContext.domainName;
    }
    const hostFromHeaders = this.getHeaderValue(event.headers, "host");
    if (hostFromHeaders) {
      return hostFromHeaders;
    }
    const multiValueHeaders = "multiValueHeaders" in event ? event.multiValueHeaders : {};
    const hostFromMultiValueHeaders = this.getHeaderValue(multiValueHeaders, "host");
    return hostFromMultiValueHeaders;
  }
  createRequest(event) {
    const queryString = this.getQueryString(event);
    const domainName = this.getDomainName(event);
    const path = this.getPath(event);
    const urlPath = `https://${domainName}${path}`;
    const url = queryString ? `${urlPath}?${queryString}` : urlPath;
    const headers = this.getHeaders(event);
    const method = this.getMethod(event);
    const requestInit = {
      headers,
      method
    };
    if (event.body) {
      requestInit.body = event.isBase64Encoded ? decodeBase64(event.body) : event.body;
    }
    return new Request(url, requestInit);
  }
  async createResult(event, res, options) {
    const contentType = res.headers.get("content-type");
    const isContentTypeBinary = options.isContentTypeBinary ?? defaultIsContentTypeBinary;
    let isBase64Encoded = contentType && isContentTypeBinary(contentType) ? true : false;
    if (!isBase64Encoded) {
      const contentEncoding = res.headers.get("content-encoding");
      isBase64Encoded = isContentEncodingBinary(contentEncoding);
    }
    const body = isBase64Encoded ? encodeBase64(await res.arrayBuffer()) : await res.text();
    const result = {
      body,
      statusCode: res.status,
      isBase64Encoded,
      ..."multiValueHeaders" in event && event.multiValueHeaders ? {
        multiValueHeaders: {}
      } : {
        headers: {}
      }
    };
    this.setCookies(event, res, result);
    if (result.multiValueHeaders) {
      res.headers.forEach((value, key) => {
        result.multiValueHeaders[key] = [value];
      });
    } else {
      res.headers.forEach((value, key) => {
        result.headers[key] = value;
      });
    }
    return result;
  }
  setCookies(_event, res, result) {
    if (res.headers.has("set-cookie")) {
      const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : Array.from(res.headers.entries()).filter(([k]) => k === "set-cookie").map(([, v]) => v);
      if (Array.isArray(cookies)) {
        this.setCookiesToResult(result, cookies);
        res.headers.delete("set-cookie");
      }
    }
  }
};
var EventV2Processor = class extends EventProcessor {
  getPath(event) {
    return event.rawPath;
  }
  getMethod(event) {
    return event.requestContext.http.method;
  }
  getQueryString(event) {
    return event.rawQueryString;
  }
  getCookies(event, headers) {
    if (Array.isArray(event.cookies)) {
      headers.set("Cookie", event.cookies.join("; "));
    }
  }
  setCookiesToResult(result, cookies) {
    result.cookies = cookies;
  }
  getHeaders(event) {
    const headers = new Headers();
    this.getCookies(event, headers);
    if (event.headers) {
      for (const [k, v] of Object.entries(event.headers)) {
        if (v) {
          headers.set(k, v);
        }
      }
    }
    return headers;
  }
};
var v2Processor = new EventV2Processor();
var EventV1Processor = class extends EventProcessor {
  getPath(event) {
    return event.path;
  }
  getMethod(event) {
    return event.httpMethod;
  }
  getQueryString(event) {
    if (event.multiValueQueryStringParameters) {
      return Object.entries(event.multiValueQueryStringParameters || {}).filter(([, value]) => value).map(
        ([key, values]) => values.map((value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")
      ).join("&");
    } else {
      return Object.entries(event.queryStringParameters || {}).filter(([, value]) => value).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value || "")}`).join("&");
    }
  }
  getCookies(_event, _headers) {
  }
  getHeaders(event) {
    const headers = new Headers();
    this.getCookies(event, headers);
    if (event.headers) {
      for (const [k, v] of Object.entries(event.headers)) {
        if (v) {
          headers.set(k, sanitizeHeaderValue(v));
        }
      }
    }
    if (event.multiValueHeaders) {
      for (const [k, values] of Object.entries(event.multiValueHeaders)) {
        if (values) {
          const foundK = headers.get(k);
          values.forEach((v) => {
            const sanitizedValue = sanitizeHeaderValue(v);
            return (!foundK || !foundK.includes(sanitizedValue)) && headers.append(k, sanitizedValue);
          });
        }
      }
    }
    return headers;
  }
  setCookiesToResult(result, cookies) {
    result.multiValueHeaders = {
      "set-cookie": cookies
    };
  }
};
var v1Processor = new EventV1Processor();
var ALBProcessor = class extends EventProcessor {
  getHeaders(event) {
    const headers = new Headers();
    if (event.multiValueHeaders) {
      for (const [key, values] of Object.entries(event.multiValueHeaders)) {
        if (values && Array.isArray(values)) {
          const sanitizedValue = sanitizeHeaderValue(values.join("; "));
          headers.set(key, sanitizedValue);
        }
      }
    } else {
      for (const [key, value] of Object.entries(event.headers ?? {})) {
        if (value) {
          headers.set(key, sanitizeHeaderValue(value));
        }
      }
    }
    return headers;
  }
  getPath(event) {
    return event.path;
  }
  getMethod(event) {
    return event.httpMethod;
  }
  getQueryString(event) {
    if (event.multiValueQueryStringParameters) {
      return Object.entries(event.multiValueQueryStringParameters || {}).filter(([, value]) => value).map(([key, value]) => `${key}=${value.join(`&${key}=`)}`).join("&");
    } else {
      return Object.entries(event.queryStringParameters || {}).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join("&");
    }
  }
  getCookies(event, headers) {
    let cookie;
    if (event.multiValueHeaders) {
      cookie = event.multiValueHeaders["cookie"]?.join("; ");
    } else {
      cookie = event.headers ? event.headers["cookie"] : void 0;
    }
    if (cookie) {
      headers.append("Cookie", cookie);
    }
  }
  setCookiesToResult(result, cookies) {
    if (result.multiValueHeaders) {
      result.multiValueHeaders["set-cookie"] = cookies;
    } else {
      result.headers["set-cookie"] = cookies.join(", ");
    }
  }
};
var albProcessor = new ALBProcessor();
var LatticeV2Processor = class extends EventProcessor {
  getPath(event) {
    return event.path;
  }
  getMethod(event) {
    return event.method;
  }
  getQueryString() {
    return "";
  }
  getHeaders(event) {
    const headers = new Headers();
    if (event.headers) {
      for (const [k, values] of Object.entries(event.headers)) {
        if (values) {
          const foundK = headers.get(k);
          values.forEach((v) => {
            const sanitizedValue = sanitizeHeaderValue(v);
            return (!foundK || !foundK.includes(sanitizedValue)) && headers.append(k, sanitizedValue);
          });
        }
      }
    }
    return headers;
  }
  getCookies() {
  }
  setCookiesToResult(result, cookies) {
    result.headers = {
      ...result.headers,
      "set-cookie": cookies.join(", ")
    };
  }
};
var latticeV2Processor = new LatticeV2Processor();
var getProcessor = (event) => {
  if (isProxyEventALB(event)) {
    return albProcessor;
  }
  if (isProxyEventV2(event)) {
    return v2Processor;
  }
  if (isLatticeEventV2(event)) {
    return latticeV2Processor;
  }
  return v1Processor;
};
var isProxyEventALB = (event) => {
  if (event.requestContext) {
    return Object.hasOwn(event.requestContext, "elb");
  }
  return false;
};
var isProxyEventV2 = (event) => {
  return Object.hasOwn(event, "rawPath");
};
var isLatticeEventV2 = (event) => {
  if (event.requestContext) {
    return Object.hasOwn(event.requestContext, "serviceArn");
  }
  return false;
};
var defaultIsContentTypeBinary = (contentType) => {
  return !/^text\/(?:plain|html|css|javascript|csv)|(?:\/|\+)(?:json|xml)\s*(?:;|$)/.test(
    contentType
  );
};
var isContentEncodingBinary = (contentEncoding) => {
  if (contentEncoding === null) {
    return false;
  }
  return /^(gzip|deflate|compress|br)/.test(contentEncoding);
};
export {
  ALBProcessor,
  EventProcessor,
  EventV1Processor,
  EventV2Processor,
  LatticeV2Processor,
  defaultIsContentTypeBinary,
  getProcessor,
  handle,
  isContentEncodingBinary,
  streamHandle
};
