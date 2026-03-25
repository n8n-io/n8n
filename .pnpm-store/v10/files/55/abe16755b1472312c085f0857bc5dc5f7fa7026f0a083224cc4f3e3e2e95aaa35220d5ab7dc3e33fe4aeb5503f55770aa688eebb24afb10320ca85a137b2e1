import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { wordDecodeURIComponent, parseQueryString } from "../../Query.js";

import { reprBacktick, reprStr, repr, toNumeric } from "./httr.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "insecure",
  "no-insecure",
  "oauth2-bearer",

  "max-redirs",

  "max-time",
  "connect-timeout",

  "retry",
  "retry-max-time",
]);

type NamedArg = [Word | string, Word | string];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCookieList(request: Request, warnings: Warnings): Array<NamedArg> {
  if (!request.cookies) {
    return [];
  }
  const cookieList: Array<NamedArg> = [];
  for (const [key, value] of request.cookies) {
    try {
      // httr2 percent-encodes cookie values
      const decoded = wordDecodeURIComponent(value.replace(/\+/g, " "));
      cookieList.push([key, decoded]);
    } catch {
      warnings.push([
        "cookie-decoding error",
        "Cookie could not be decoded\n\n" + value.toString(),
      ]);
    }
  }

  request.headers.delete("Cookie");
  return cookieList;
}

function getQueryList(request: Request): Array<NamedArg> {
  return request.urls[0].queryList || [];
}

function getHeaderList(request: Request): Array<NamedArg> {
  const headerList: Array<NamedArg> = [];

  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue !== null) {
        headerList.push([headerName, headerValue]);
      }
    }
  }
  return headerList;
}

function getMultipartParams(request: Request): Array<NamedArg> | undefined {
  if (!request.multipartUploads) {
    return undefined;
  }
  const parts = request.multipartUploads.map((m): NamedArg => {
    let content;
    if ("contentFile" in m) {
      content = `curl::form_file(${repr(m.contentFile)})`;
    } else {
      content = repr(m.content);
    }
    return [m.name, content];
  });

  return parts;
}

function addBodyStep(
  steps: string[],
  request: Request,
  contentType: string | null | undefined,
): Array<string> {
  if (request.multipartUploads) {
    const params = getMultipartParams(request);
    return addCurlStep(steps, "req_body_multipart", [], params);
  }

  if (!request.data) {
    return steps;
  }

  if (request.data.startsWith("@") && !request.isDataRaw) {
    const filePath = request.data.slice(1);
    steps = addCurlStep(steps, "req_body_file", [repr(filePath)]);
  } else {
    const [parsedQueryString] = parseQueryString(request.data);
    const dataIsList = parsedQueryString && parsedQueryString.length;
    if (dataIsList) {
      steps = addCurlStep(steps, "req_body_form", [], parsedQueryString);
    } else {
      contentType = contentType || "application/x-www-form-urlencoded";
      steps = addCurlStep(
        steps,
        "req_body_raw",
        [repr(request.data)],
        [["type", reprStr(contentType)]],
      );
    }
  }
  // TODO: json

  return steps;
}

function addCurlStep(
  steps: Array<string>,
  f: string,
  mainArgs: Array<string>,
  dots: Array<NamedArg> = [],
  keepIfEmpty = false,
) {
  const dotArgs = dots.map((dot) => {
    let [name, value] = dot;
    if (value instanceof Word) {
      value = repr(value);
    }
    if (name === "" || (name instanceof Word && name.isEmpty())) {
      return value;
    }

    if (name instanceof Word) {
      name = reprBacktick(name);
    }
    return `${name} = ${value}`;
  });

  const args = mainArgs.concat(...dotArgs);
  if (args.length === 0 && !keepIfEmpty) {
    return steps;
  }

  let newStep: string;
  if (dots.length === 0 || args.length === 1) {
    const argsString = args.join(", ");
    newStep = `${f}(${argsString})`;
  } else {
    const indent = "    ";
    const argsString = args.join(`,\n${indent}`);
    newStep = `${f}(\n${indent}${argsString}\n  )`;
  }

  return steps.concat(newStep);
}

export function _toRHttr2(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  // const cookieList = getCookieList(request, warnings);
  const queryList = getQueryList(request);

  const contentType = request.headers.getContentType();
  request.headers.delete("Content-Type");
  if (request.oauth2Bearer && request.authType === "bearer") {
    request.headers.delete("Authorization");
  }
  const headerList = getHeaderList(request);

  const url = request.urls[0].queryList
    ? request.urls[0].urlWithoutQueryList
    : request.urls[0].url;

  const method = request.urls[0].method;
  if (!eq(method, method.toUpperCase())) {
    warnings.push([
      "non-uppercase-method",
      "httr will uppercase the method: " + JSON.stringify(method.toString()),
    ]);
  }

  let steps = [`request(${repr(url)})`];
  if (method.toString() != "GET") {
    steps = addCurlStep(steps, "req_method", [repr(method)]);
  }

  steps = addCurlStep(steps, "req_url_query", [], queryList);
  steps = addCurlStep(steps, "req_headers", [], headerList);
  // TODO: use `req_cookie_set()` once it is added
  // https://github.com/r-lib/httr2/issues/369
  // steps = addCurlStep(steps, "req_headers", [], cookieList);
  // TODO: support cookies from file?

  steps = addBodyStep(steps, request, contentType);

  if (request.urls[0].auth && request.authType === "basic") {
    const [user, password] = request.urls[0].auth;
    steps = addCurlStep(steps, "req_auth_basic", [repr(user), repr(password)]);
  } else if (request.oauth2Bearer && request.authType === "bearer") {
    steps = addCurlStep(steps, "req_auth_bearer_token", [
      repr(request.oauth2Bearer),
    ]);
  }
  // TODO: req_oauth_auth_code

  if (request.proxy) {
    const url = request.proxy.toString();
    addCurlStep(steps, "req_proxy", [url]);
  }

  if (request.timeout) {
    // TODO: parse float/int
    steps = addCurlStep(steps, "req_timeout", [toNumeric(request.timeout)]);
  }

  // TODO: all curl options could be supported here, like in the C generator
  const curlOptions: Array<NamedArg> = [];
  if (request.insecure) {
    curlOptions.push(["ssl_verifypeer", "0"]);
  }
  if (request.maxRedirects !== undefined) {
    curlOptions.push(["maxredirs", toNumeric(request.maxRedirects)]);
  }
  if (request.connectTimeout) {
    // TODO: parse float/int
    curlOptions.push(["connecttimeout", toNumeric(request.connectTimeout)]);
  }
  steps = addCurlStep(steps, "req_options", [], curlOptions);

  const retryOptions: Array<NamedArg> = [];
  if (request.retry) {
    retryOptions.push(["max_tries", toNumeric(request.retry)]);
  }
  if (request.retryMaxTime) {
    retryOptions.push(["max_seconds", toNumeric(request.retryMaxTime)]);
  }
  steps = addCurlStep(steps, "req_retry", [], retryOptions);

  const performArgs: Array<[string, string]> = [];
  // TODO: add test
  if (request.verbose) {
    performArgs.push(["verbosity", "1"]);
  }
  steps = addCurlStep(steps, "req_perform", [], performArgs, true);

  let rstatsCode = "library(httr2)\n\n";
  rstatsCode += steps.join(" |>\n  ");

  return rstatsCode + "\n";
}
export function toRHttr2Warn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const rHttr = _toRHttr2(requests, warnings);
  return [rHttr, warnings];
}
export function toRHttr2(curlCommand: string | string[]): string {
  return toRHttr2Warn(curlCommand)[0];
}
