// src/adapter/lambda-edge/handler.ts
import crypto from "node:crypto";
import { decodeBase64, encodeBase64 } from "../../utils/encode.js";
globalThis.crypto ??= crypto;
var convertHeaders = (headers) => {
  const cfHeaders = {};
  headers.forEach((value, key) => {
    cfHeaders[key.toLowerCase()] = [
      ...cfHeaders[key.toLowerCase()] || [],
      { key: key.toLowerCase(), value }
    ];
  });
  return cfHeaders;
};
var handle = (app) => {
  return async (event, ...args) => {
    const [context, callback] = args;
    const res = await app.fetch(createRequest(event), {
      event,
      context,
      callback: (err, result) => {
        callback?.(err, result);
      },
      config: event.Records[0].cf.config,
      request: event.Records[0].cf.request,
      response: event.Records[0].cf.response
    });
    return createResult(res);
  };
};
var createResult = async (res) => {
  const isBase64Encoded = isContentTypeBinary(res.headers.get("content-type") || "");
  const body = isBase64Encoded ? encodeBase64(await res.arrayBuffer()) : await res.text();
  return {
    status: res.status.toString(),
    headers: convertHeaders(res.headers),
    body,
    ...isBase64Encoded && { bodyEncoding: "base64" }
  };
};
var createRequest = (event) => {
  const queryString = event.Records[0].cf.request.querystring;
  const host = event.Records[0].cf.request.headers?.host?.[0]?.value || event.Records[0].cf.config.distributionDomainName;
  const urlPath = `https://${host}${event.Records[0].cf.request.uri}`;
  const url = queryString ? `${urlPath}?${queryString}` : urlPath;
  const headers = new Headers();
  Object.entries(event.Records[0].cf.request.headers).forEach(([k, v]) => {
    v.forEach((header) => headers.set(k, header.value));
  });
  const requestBody = event.Records[0].cf.request.body;
  const method = event.Records[0].cf.request.method;
  const body = createBody(method, requestBody);
  return new Request(url, {
    headers,
    method,
    body
  });
};
var createBody = (method, requestBody) => {
  if (!requestBody || !requestBody.data) {
    return void 0;
  }
  if (method === "GET" || method === "HEAD") {
    return void 0;
  }
  if (requestBody.encoding === "base64") {
    return decodeBase64(requestBody.data);
  }
  return requestBody.data;
};
var isContentTypeBinary = (contentType) => {
  return !/^(text\/(plain|html|css|javascript|csv).*|application\/(.*json|.*xml).*|image\/svg\+xml.*)$/.test(
    contentType
  );
};
export {
  createBody,
  handle,
  isContentTypeBinary
};
