import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import {
  reprStr,
  repr,
  reprAsStringToStringDict,
  reprObj,
  asParseFloatTimes1000,
  asParseInt,
  toURLSearchParams,
  type JSImports,
  addImport,
  bySecondElem,
} from "./javascript.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,

  "max-time",
  "connect-timeout",

  "location",
  "no-location",
  "location-trusted", // not exactly supported, just better warning message
  "no-location-trusted",
  "max-redirs",

  "compressed",

  "insecure",

  "http2",
  "http2-prior-knowledge",

  "form",
  "form-string",

  // TODO:
  // "cookie-jar", // and cookie files
  // TODO: tls using https: and agent:
  // TODO: proxy stuff using agent:
  // TODO: methodRewriting: true to match curl?
]);

function getBodyString(
  request: Request,
  imports: JSImports,
): [string | null, string | null] {
  const contentType = request.headers.getContentType();
  // can have things like ; charset=utf-8 which we want to preserve
  const exactContentType = request.headers.get("content-type");

  if (request.multipartUploads) {
    if (eq(exactContentType, "multipart/form-data")) {
      // TODO: comment it out instead?
      request.headers.delete("content-type");
    }
    return ["body: form", null];
  }

  if (!request.data) {
    return [null, null];
  }

  // TODO: @
  const simpleString = "body: " + repr(request.data, imports);

  try {
    if (contentType === "application/json" && request.data.isString()) {
      const dataStr = request.data.toString();
      const parsed = JSON.parse(dataStr);
      const roundtrips = JSON.stringify(parsed) === dataStr;
      const jsonAsJavaScript = "json: " + reprObj(parsed, 1);
      if (roundtrips && eq(exactContentType, "application/json")) {
        request.headers.delete("content-type");
      }
      return [jsonAsJavaScript, roundtrips ? null : simpleString];
    }
    if (contentType === "application/x-www-form-urlencoded") {
      const [queryList, queryDict] = parseQueryString(request.data);
      if (queryDict && queryDict.every((v) => !Array.isArray(v[1]))) {
        if (eq(exactContentType, "application/x-www-form-urlencoded")) {
          request.headers.delete("content-type");
        }
        return [
          "form: " +
            reprAsStringToStringDict(queryDict as [Word, Word][], 1, imports),
          null,
        ];
      }
      if (queryList) {
        return [
          "body: " +
            toURLSearchParams([queryList, null], imports) +
            ".toString()",
          null,
        ];
      }
    }
  } catch {}

  return [simpleString, null];
}

function buildOptionsObject(
  request: Request,
  method: Word,
  methodStr: string,
  methods: string[],
  nonDataMethods: string[],
  warnings: Warnings,
  imports: JSImports,
): string {
  let code = "{\n";

  if (!method.isString || !methods.includes(methodStr.toUpperCase())) {
    code += "  method: " + repr(method, imports) + ",\n";
  }

  if (
    request.urls[0].queryDict &&
    request.urls[0].queryDict.every((v) => !Array.isArray(v[1]))
  ) {
    code +=
      "  searchParams: " +
      reprAsStringToStringDict(
        request.urls[0].queryDict as [Word, Word][],
        1,
        imports,
      ) +
      ",\n";
  } else if (request.urls[0].queryList) {
    code +=
      "  searchParams: " +
      toURLSearchParams([request.urls[0].queryList, null], imports) +
      ",\n";
  }

  const [bodyString, commentedOutBodyString] = getBodyString(request, imports); // can delete headers

  if (request.headers.length) {
    const headers = request.headers.headers.filter((h) => h[1] !== null) as [
      Word,
      Word,
    ][];
    if (headers.length) {
      code +=
        "  headers: " + reprAsStringToStringDict(headers, 1, imports) + ",\n";
    }
  }

  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    code += "  username: " + repr(username, imports) + ",\n";
    if (password.toBool()) {
      code += "  password: " + repr(password, imports) + ",\n";
    }
    if (request.authType !== "basic") {
      // TODO: warn
    }
  }

  if (request.data || request.multipartUploads) {
    if (commentedOutBodyString) {
      code += "  // " + commentedOutBodyString + ",\n";
    }
    code += "  " + bodyString + ",\n";

    // TODO: Does this work for HEAD?
    if (nonDataMethods.includes(methodStr.toUpperCase())) {
      code += "  allowGetBody: true,\n";
    }
  }

  if (request.timeout || request.connectTimeout) {
    code += "    timeout: {\n";
    if (request.timeout) {
      code +=
        "    request: " +
        asParseFloatTimes1000(request.timeout, imports) +
        ",\n";
    }
    if (request.connectTimeout) {
      code +=
        "    connect: " +
        asParseFloatTimes1000(request.connectTimeout, imports) +
        ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
      code += "\n";
    }
    code += "  },\n";
  }

  // By default, curl doesn't follow redirects but got does.
  let followRedirects = request.followRedirects;
  if (followRedirects === undefined) {
    followRedirects = true;
  }
  let maxRedirects = request.maxRedirects
    ? asParseInt(request.maxRedirects, imports)
    : null;
  const hasMaxRedirects =
    followRedirects &&
    maxRedirects &&
    maxRedirects !== "0" &&
    maxRedirects !== "10"; // got default
  if (!followRedirects || maxRedirects === "0") {
    code += "  followRedirect: false,\n";
  } else if (maxRedirects) {
    if (maxRedirects === "-1") {
      maxRedirects = "Infinity";
    }
  }
  if (followRedirects && request.followRedirectsTrusted) {
    warnings.push([
      "--location-trusted",
      // TODO: is this true?
      "got doesn't have an easy way to disable removing the Authorization: header on redirect",
    ]);
  }
  if (hasMaxRedirects) {
    code += "  maxRedirects: " + maxRedirects + ",\n";
  }

  if (request.compressed === false) {
    code += "  decompress: false,\n";
  }

  if (request.insecure) {
    code += "  https: {\n";
    code += "    rejectUnauthorized: false\n";
    code += "  },\n";
  }

  if (request.http2) {
    code += "  http2: true,\n";
  }

  if (code.endsWith(",\n")) {
    code = code.slice(0, -2);
  }
  code += "\n}";
  return code;
}

export function _toNodeGot(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  const imports: JSImports = [];

  let code = "";

  if (request.multipartUploads) {
    code += "const form = new FormData();\n";
    for (const m of request.multipartUploads) {
      code += "form.append(" + repr(m.name, imports) + ", ";
      if ("contentFile" in m) {
        addImport(imports, "* as fs", "fs");
        if (eq(m.contentFile, "-")) {
          code += "fs.readFileSync(0).toString()";
        } else {
          code += "fs.readFileSync(" + repr(m.contentFile, imports) + ")";
        }
        if ("filename" in m && m.filename) {
          code += ", " + repr(m.filename, imports);
        }
      } else {
        code += repr(m.content, imports);
      }
      code += ");\n";
    }
    code += "\n";

    // TODO: remove warning once Node 16 is EOL'd on 2023-09-11
    warnings.push(["node-form-data", "Node 18 is required for FormData"]);
  }

  const method = request.urls[0].method;
  const methodStr = method.toString();
  if (method.isString() && methodStr !== methodStr.toUpperCase()) {
    warnings.push([
      "lowercase-method",
      "got will uppercase the method: " + JSON.stringify(methodStr),
    ]);
  }
  // https://github.com/sindresorhus/got/blob/e24b89669931b36530219b9f49965d07da25a7e6/source/create.ts#L28
  const methods = ["GET", "POST", "PUT", "PATCH", "HEAD", "DELETE"];
  // Got will error if you try sending data with these HTTP methods
  const nonDataMethods = ["GET", "HEAD"];
  code += "const response = await got";
  if (
    method.isString() &&
    methods.includes(methodStr.toUpperCase()) &&
    methodStr.toUpperCase() !== "GET"
  ) {
    code += "." + methodStr.toLowerCase();
  }
  code += "(";

  const url = request.urls[0].queryList
    ? request.urls[0].urlWithoutQueryList
    : request.urls[0].url;
  code += repr(url, imports);

  const needsOptions = !!(
    !method.isString() ||
    !methods.includes(methodStr.toUpperCase()) ||
    request.urls[0].queryList ||
    request.urls[0].queryDict ||
    request.headers.length ||
    request.urls[0].auth ||
    request.multipartUploads ||
    request.data ||
    request.followRedirects ||
    request.maxRedirects ||
    request.compressed ||
    request.insecure ||
    request.http2 ||
    request.timeout ||
    request.connectTimeout
  );
  if (needsOptions) {
    code += ", ";
    code += buildOptionsObject(
      request,
      method,
      methodStr,
      methods,
      nonDataMethods,
      warnings,
      imports,
    );
  }

  code += ");\n";

  let importCode = "import got from 'got';\n";
  for (const [varName, imp] of Array.from(imports).sort(bySecondElem)) {
    importCode += "import " + varName + " from " + reprStr(imp) + ";\n";
  }

  return importCode + "\n" + code;
}
export function toNodeGotWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const nodeGot = _toNodeGot(requests, warnings);
  return [nodeGot, warnings];
}
export function toNodeGot(curlCommand: string | string[]): string {
  return toNodeGotWarn(curlCommand)[0];
}
