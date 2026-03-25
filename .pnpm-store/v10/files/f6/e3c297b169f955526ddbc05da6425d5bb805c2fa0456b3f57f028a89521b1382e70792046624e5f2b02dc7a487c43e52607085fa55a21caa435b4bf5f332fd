import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import {
  repr,
  reprObj,
  asParseFloatTimes1000,
  toURLSearchParams,
  type JSImports,
  reprImports,
} from "./javascript.js";

import { dedent, getFormString } from "./jquery.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "max-time",
]);

function _getDataString(
  data: Word,
  contentType: string | null | undefined,
  imports: JSImports,
): [string, string | null] {
  const originalStringRepr = repr(data, imports);

  if (contentType === "application/json" && data.isString()) {
    const dataStr = data.toString();
    const parsed = JSON.parse(dataStr);
    // Only convert arrays and {} to JS objects
    if (typeof parsed !== "object" || parsed === null) {
      return [originalStringRepr, null];
    }
    const roundtrips = JSON.stringify(parsed) === dataStr;
    const jsonAsJavaScript = "JSON.stringify(" + reprObj(parsed, 1) + ")";
    return [jsonAsJavaScript, roundtrips ? null : originalStringRepr];
  }
  if (contentType === "application/x-www-form-urlencoded") {
    const [queryList, queryDict] = parseQueryString(data);
    if (queryList) {
      // TODO: check roundtrip, add a comment
      return [toURLSearchParams([queryList, queryDict], imports), null];
    }
  }
  return [originalStringRepr, null];
}

export function getDataString(
  data: Word,
  contentType: string | null | undefined,
  imports: JSImports,
): [string, string | null] {
  let dataString: string | null = null;
  let commentedOutDataString: string | null = null;
  try {
    [dataString, commentedOutDataString] = _getDataString(
      data,
      contentType,
      imports,
    );
  } catch {}
  if (!dataString) {
    dataString = repr(data, imports);
  }
  return [dataString, commentedOutDataString];
}

export function _toJavaScriptXHR(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const imports: JSImports = [];

  let code = "";

  // data: passed with these methods is ignored
  const nonDataMethods = ["GET", "HEAD"];
  const method = request.urls[0].method;
  const methodStr = method.toString();

  if (!eq(request.urls[0].method.toUpperCase(), method)) {
    warnings.push([
      "method-case",
      "XHR uppercases the method, so it will be changed to " +
        JSON.stringify(method.toUpperCase().toString()),
    ]);
  }

  const hasData = request.data || request.multipartUploads;

  const url = request.urls[0].url;

  const contentType = request.headers.getContentType();
  if (request.multipartUploads) {
    code += getFormString(request.multipartUploads, imports);
  } else if (request.data) {
    // might delete content-type header
    const [dataString, commentedOutDataString] = getDataString(
      request.data,
      contentType,
      imports,
    );
    if (commentedOutDataString) {
      code += "// const data = " + commentedOutDataString + ";\n";
    }
    if (dataString) {
      code += "const data = " + dedent(dataString) + ";\n\n";
    }
  }
  if (nonDataMethods.includes(methodStr) && hasData) {
    warnings.push([
      "data-with-get",
      "XHR doesn't send data with GET or HEAD requests",
    ]);
  }

  code += "let xhr = new XMLHttpRequest();\n";
  code += "xhr.withCredentials = true;\n";
  code += "xhr.open(";
  const openArgs = [repr(method, imports), repr(url, imports)];
  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    openArgs.push("true", repr(username, imports), repr(password, imports));
    code += "\n  ";
    code += openArgs.join(",\n  ");
    code += "\n";
  } else {
    code += openArgs.join(", ");
  }
  code += ");\n";

  // TODO: keep content-type header if it's not multipart/form-data
  // TODO: warn about unsent headers
  if (request.headers.length) {
    for (const [key, value] of request.headers) {
      if (value === null) {
        continue;
      }
      code +=
        "xhr.setRequestHeader(" +
        repr(key, imports) +
        ", " +
        repr(value, imports) +
        ");\n";
    }
  }

  if (request.timeout) {
    code +=
      "xhr.timeout = " +
      asParseFloatTimes1000(request.timeout, imports) +
      ";\n";
  }

  code += "\n";
  code += "xhr.onload = function() {\n";
  code += "  console.log(xhr.response);\n";
  code += "};\n";
  code += "\n";

  if (request.multipartUploads) {
    code += "xhr.send(form);\n";
  } else if (request.data) {
    code += "xhr.send(data);\n";
  } else {
    code += "xhr.send();\n";
  }

  let importCode = reprImports(imports);
  if (importCode) {
    importCode += "\n";
  }

  return importCode + code;
}

export function toJavaScriptXHRWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toJavaScriptXHR(requests, warnings);
  return [code, warnings];
}
export function toJavaScriptXHR(curlCommand: string | string[]): string {
  return toJavaScriptXHRWarn(curlCommand)[0];
}
