import { Word, eq, mergeWords, joinWords } from "../../shell/Word.js";
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

// TODO: @
function _getDataString(
  data: Word,
  contentType: string | null | undefined,
  imports: JSImports,
): [string, string | null] {
  const originalStringRepr = repr(data, imports);

  if (contentType === "application/json" && data.isString()) {
    const dataStr = data.toString();
    const parsed = JSON.parse(dataStr);
    // Only format arrays and {} as JavaScript objects
    if (typeof parsed !== "object" || parsed === null) {
      return [originalStringRepr, null];
    }
    const roundtrips = JSON.stringify(parsed) === dataStr;
    const jsonAsJavaScript = "JSON.stringify(" + reprObj(parsed, 1) + ")";
    return [jsonAsJavaScript, roundtrips ? null : originalStringRepr];
  }
  if (contentType === "application/x-www-form-urlencoded") {
    const query = parseQueryString(data);
    if (query[0]) {
      // if (
      //   eq(exactContentType, "application/x-www-form-urlencoded; charset=utf-8")
      // ) {
      //   exactContentType = null;
      // }
      // TODO: check roundtrip, add a comment
      return [toURLSearchParams(query, imports) + ".toString()", null];
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

export function _toNodeHttp(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const imports: JSImports = [];

  let importCode = "";
  let code = "";
  let options = "";

  const method = request.urls[0].method;
  if (!eq(method, "GET")) {
    options += "  method: " + repr(method, imports) + ",\n";
  }

  if (!eq(request.urls[0].method.toUpperCase(), method)) {
    warnings.push([
      "method-case",
      "http uppercases the method, so it will be changed to " +
        JSON.stringify(method.toUpperCase().toString()),
    ]);
  }

  const url = request.urls[0].url;

  let dataString, commentedOutDataString;
  let formString;
  const contentType = request.headers.getContentType();
  if (request.multipartUploads) {
    formString = getFormString(request.multipartUploads, imports);
    code += formString;
    // Node 18's native FormData doesn't have .pipe() or .getHeaders()
    importCode += "import FormData from 'form-data';\n";
  } else if (request.data) {
    [dataString, commentedOutDataString] = getDataString(
      request.data,
      contentType,
      imports,
    );
  }

  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    options +=
      "  auth: " + repr(joinWords([username, password], ":"), imports) + ",\n";
  }

  // TODO: warn about unsent headers
  if (request.headers.length) {
    options += "  headers: {\n";
    for (const [key, value] of request.headers) {
      if (value === null) {
        continue;
      }
      options +=
        "    " + repr(key, imports) + ": " + repr(value, imports) + ",\n";
    }
    if (formString) {
      options += "    ...form.getHeaders(),\n";
    }
    if (options.endsWith(",\n")) {
      options = options.slice(0, -2);
      options += "\n";
    }
    options += "  },\n";
  } else if (formString) {
    options += "  headers: form.getHeaders(),\n";
  }

  if (request.timeout) {
    options +=
      "  timeout: " + asParseFloatTimes1000(request.timeout, imports) + ",\n";
    // TODO: warn about differences from curl
  }

  if (options.endsWith(",\n")) {
    options = options.slice(0, -2);
    options += "\n";
  }

  const urlObj = request.urls[0].urlObj;
  let optArg = repr(url, imports);
  if (options) {
    code += "const options = {\n";
    code += "  hostname: " + repr(urlObj.host, imports) + ",\n";
    if (urlObj.host.includes(":")) {
      // TODO
      // code += "  port: " + repr(request.urls[0].urlObj.port, imports) + ",\n";
      warnings.push([
        "node-http-port",
        "Parsing the port out of the hostname is not supported. If you get an ENOTFOUND error, you'll need to do it manually",
      ]);
    }
    const path = mergeWords(urlObj.path, urlObj.query);
    if (path.toBool()) {
      code += "  path: " + repr(path, imports) + ",\n";
    }
    // code += "  protocol: " + repr(urlObj.scheme, imports) + ",\n";
    code += options;
    code += "};\n";
    code += "\n";

    optArg = "options";
  }

  const module = urlObj.scheme.toString() === "https" ? "https" : "http";
  const fn =
    eq(method, "GET") && !dataString && !commentedOutDataString && !formString
      ? "get"
      : "request";
  code +=
    "const req = " + module + "." + fn + "(" + optArg + ", function (res) {\n";
  code += "  const chunks = [];\n";
  code += "\n";
  code += "  res.on('data', function (chunk) {\n";
  code += "    chunks.push(chunk);\n";
  code += "  });\n";
  code += "\n";
  code += "  res.on('end', function () {\n";
  code += "    const body = Buffer.concat(chunks);\n";
  code += "    console.log(body.toString());\n";
  code += "  });\n";
  code += "});\n";

  if (commentedOutDataString) {
    code += "\n// req.write(" + commentedOutDataString + ");";
  }
  if (dataString) {
    code += "\nreq.write(" + dedent(dataString) + ");\n";
  } else if (formString) {
    code += "\nform.pipe(req);\n";
  }
  if (fn !== "get" && !formString) {
    code += "req.end();\n";
  }

  importCode = "import " + module + " from '" + module + "';\n" + importCode;
  importCode += reprImports(imports);
  importCode += "\n";

  return importCode + code;
}

export function toNodeHttpWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toNodeHttp(requests, warnings);
  return [code, warnings];
}
export function toNodeHttp(curlCommand: string | string[]): string {
  return toNodeHttpWarn(curlCommand)[0];
}
