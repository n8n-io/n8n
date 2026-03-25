import { warnIfPartsIgnored } from "../../Warnings.js";
import { Word, eq, joinWords } from "../../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import {
  repr,
  asParseInt,
  asParseFloatTimes1000,
  toURLSearchParams,
  reprObj,
  toDictOrURLSearchParams,
  type JSImports,
  addImport,
  reprImports,
  FORBIDDEN_METHODS,
} from "./javascript.js";

import { getFormString } from "./jquery.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "upload-file",
  "form",
  "form-string",
  "next",

  // --no-compressed (the default) is unsupported though
  "compressed",

  "upload-file",

  "retry",
  "max-time",
]);

function getDataString(
  request: Request,
  data: Word,
  imports: JSImports,
): [string, string | null] {
  const originalStringRepr = "body: " + repr(data, imports);

  const contentType = request.headers.getContentType();
  if (contentType === "application/json") {
    try {
      const dataStr = data.toString();
      const parsed = JSON.parse(dataStr);
      const roundtrips = JSON.stringify(parsed) === dataStr;
      const jsonAsJavaScript = reprObj(parsed, 1);

      const dataString = "json: " + jsonAsJavaScript;
      return [dataString, roundtrips ? null : originalStringRepr];
    } catch {
      return [originalStringRepr, null];
    }
  }
  if (contentType === "application/x-www-form-urlencoded") {
    try {
      const [queryList, queryDict] = parseQueryString(data);
      if (queryList) {
        // Technically node-fetch sends
        // application/x-www-form-urlencoded;charset=utf-8
        // TODO: handle repeated content-type header
        if (
          eq(
            request.headers.get("content-type"),
            "application/x-www-form-urlencoded",
          )
        ) {
          request.headers.delete("content-type");
        }
        // TODO: check roundtrip, add a comment
        // TODO: this isn't a dict anymore
        return [
          "body: " + toURLSearchParams([queryList, queryDict], imports),
          null,
        ];
      }
      return [originalStringRepr, null];
    } catch {
      return [originalStringRepr, null];
    }
  }
  return [originalStringRepr, null];
}

export function getData(
  request: Request,
  isNode: boolean,
  imports: JSImports,
): [string, string | null] {
  if (!request.dataArray || request.multipartUploads) {
    return ["", null];
  }

  if (
    request.dataArray.length === 1 &&
    request.dataArray[0] instanceof Word &&
    request.dataArray[0].isString()
  ) {
    try {
      return getDataString(request, request.dataArray[0], imports);
    } catch {}
  }

  const parts = [];
  const hasBinary = request.dataArray.some(
    (d) => !(d instanceof Word) && d.filetype === "binary",
  );
  const encoding = hasBinary ? "" : ", 'utf-8'";
  for (const d of request.dataArray) {
    if (d instanceof Word) {
      parts.push(repr(d, imports));
    } else {
      const { filetype, name, filename } = d;
      if (filetype === "urlencode" && name) {
        // TODO: add this to the previous Word
        parts.push(repr(name, imports));
      }
      // TODO: use the filetype
      if (eq(filename, "-")) {
        parts.push("fs.readFileSync(0" + encoding + ")");
      } else {
        parts.push(
          "fs.readFileSync(" + repr(filename, imports) + encoding + ")",
        );
      }
      addImport(imports, "* as fs", "fs");
    }
  }

  if (parts.length === 0) {
    return ["body: ''", null];
  }

  if (parts.length === 1) {
    return ["body: " + parts[0], null];
  }

  let start = "new ArrayBuffer(";
  let joiner = ", ";
  let end = ")";
  const totalLength = parts.reduce((a, b) => a + b.length, 0);
  if (totalLength > 80) {
    start += "\n    ";
    joiner = ",\n    ";
    end = "\n  )";
  }
  return ["body: " + start + parts.join(joiner) + end, null];
}

function requestToKy(
  request: Request,
  warnings: Warnings,
  imports: JSImports,
): string {
  warnIfPartsIgnored(request, warnings, {
    multipleUrls: true,
    dataReadsFile: true,
    // Not actually supported, just warned per-URL
    queryReadsFile: true,
  });

  let code = "";

  if (request.multipartUploads) {
    code += getFormString(request.multipartUploads, imports);
  }

  // Can delete content-type header
  const [dataString, commentedOutDataString] = getData(request, true, imports);

  for (const urlObj of request.urls) {
    let optionsCode = "";

    const method = urlObj.method;
    const methodStr = urlObj.method.toString();
    const nonDataMethods = ["GET", "HEAD"];
    const methods = ["GET", "POST", "PUT", "PATCH", "HEAD", "DELETE"];

    const url = urlObj.queryList ? urlObj.urlWithoutQueryList : urlObj.url;

    if (method.isString() && methods.includes(methodStr)) {
      const fn = methodStr.toLowerCase().toString();
      code += "ky." + fn + "(" + repr(url, imports);
    } else {
      code += "ky(" + repr(url, imports);
      optionsCode += "  method: " + repr(method, imports) + ",\n";

      if (method.isString() && FORBIDDEN_METHODS.includes(methodStr)) {
        warnings.push([
          "forbidden-method",
          "the method " +
            JSON.stringify(methodStr) +
            " is not allowed in fetch() and therefore Ky",
        ]);
      }
    }

    if (urlObj.queryList) {
      optionsCode +=
        "searchParams: " +
        toDictOrURLSearchParams([urlObj.queryList, urlObj.queryDict], imports);
    }
    if (urlObj.queryReadsFile) {
      warnings.push([
        "unsafe-query",
        // TODO: better wording
        "the URL query string is not correct, " +
          JSON.stringify("@" + urlObj.queryReadsFile) +
          " means it should read the file " +
          JSON.stringify(urlObj.queryReadsFile),
      ]);
    }

    if (
      request.headers.length ||
      (urlObj.auth && request.authType === "basic")
    ) {
      optionsCode += "  headers: {\n";
      for (const [headerName, headerValue] of request.headers) {
        optionsCode +=
          "    " +
          repr(headerName, imports) +
          ": " +
          repr(headerValue || new Word(), imports) +
          ",\n";
      }
      if (urlObj.auth && request.authType === "basic") {
        // TODO: if -H 'Authorization:' is passed, don't set this
        optionsCode +=
          "    'Authorization': 'Basic ' + btoa(" +
          repr(joinWords(urlObj.auth, ":"), imports) +
          "),\n";
      }

      if (optionsCode.endsWith(",\n")) {
        optionsCode = optionsCode.slice(0, -2);
        optionsCode += "\n";
      }
      optionsCode += "  },\n";
    }

    if (urlObj.uploadFile) {
      addImport(imports, "* as fs", "fs");
      optionsCode +=
        "  body: fs.readFileSync(" + repr(urlObj.uploadFile, imports) + "),\n";
    } else if (request.multipartUploads) {
      optionsCode += "  body: form,\n";
    } else if (request.data) {
      if (commentedOutDataString) {
        optionsCode += "  // " + commentedOutDataString + ",\n";
      }
      optionsCode += "  " + dataString + ",\n";
    }
    if (
      method.isString() &&
      methodStr in nonDataMethods &&
      (urlObj.uploadFile || request.data || request.multipartUploads)
    ) {
      warnings.push([
        "non-data-method",
        "Ky doesn't support sending data with GET or HEAD requests",
      ]);
    }

    if (request.retry) {
      optionsCode += "  retry: " + asParseInt(request.retry, imports);
    }

    if (request.timeout) {
      optionsCode +=
        "  timeout: " + asParseFloatTimes1000(request.timeout, imports);
    }

    if (optionsCode) {
      if (optionsCode.endsWith(",\n")) {
        optionsCode = optionsCode.slice(0, -2);
      }
      code += ", {\n";
      code += optionsCode;
      code += "\n}";
    }

    code += ");\n";
  }

  // TODO: generate some code for the output, like .json() if 'Accept': 'application/json'

  return code;
}

export function _toNodeKy(requests: Request[], warnings?: Warnings): string {
  const imports: JSImports = [];
  const code = requests
    .map((r) => requestToKy(r, warnings || [], imports))
    .join("\n");

  const importCode = "import ky from 'ky';\n" + reprImports(imports);
  return importCode + "\n" + code;
}

export function toNodeKyWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toNodeKy(requests, warnings);
  return [code, warnings];
}
export function toNodeKy(curlCommand: string | string[]): string {
  return toNodeKyWarn(curlCommand)[0];
}
