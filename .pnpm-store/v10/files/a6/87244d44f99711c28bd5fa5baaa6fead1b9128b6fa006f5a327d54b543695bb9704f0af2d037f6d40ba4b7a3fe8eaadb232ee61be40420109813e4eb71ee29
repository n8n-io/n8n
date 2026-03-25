import { CCError } from "../utils.js";
import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";
import { parseQueryString } from "../Query.js";

import {
  parse as jsonParseLossless,
  stringify as jsonStringifyLossless,
  isLosslessNumber,
} from "lossless-json";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "no-compressed",
  "insecure",
  "no-insecure",
  "upload-file",
  "connect-timeout",
  "timeout",
  "retry",
  "location",
  "max-redirs",

  "form",
  "form-string",
]);

// https://docs.julialang.org/en/v1/manual/strings/
// https://en.wikipedia.org/wiki/C_syntax#Backslash_escapes
const regexEscape = /\$|\\|"|\p{C}|[^ \P{Z}]/gu;
const regexHexDigit = /[0-9a-fA-F]/;
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string, index: number, string: string) => {
      switch (c) {
        case "$":
          return "\\$";
        case "\\":
          return "\\\\";
        case "\x07":
          return "\\a";
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\v":
          return "\\v";
        case '"':
          return '\\"';
      }

      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 2) {
        return "\\x" + hex.padStart(2, "0");
      }
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
      }
      if (regexHexDigit.test(string.charAt(index + 1))) {
        return "\\U" + hex.padStart(8, "0");
      }
      return "\\U" + hex;
    }) +
    '"'
  );
}

export function repr(w: Word): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      args.push("ENV[" + reprStr(t.value) + "]");
    } else {
      // TODO: escape
      args.push("read(`" + t.value.toString() + "`, String)");
    }
  }
  return args.join(" * ");
}

function jsonAsJulia(
  obj: string | number | boolean | object | null,
  indent = 0,
): string {
  if (isLosslessNumber(obj)) {
    // TODO: why is it undefined
    const numAsStr = jsonStringifyLossless(obj) as string;
    return numAsStr;
  }

  switch (typeof obj) {
    case "string":
      return reprStr(obj);
    case "number":
      // If the number in the JSON file is very large, it'll turn into Infinity
      if (!isFinite(obj)) {
        throw new CCError("found Infitiny in JSON");
      }
      return obj.toString();
    case "boolean":
      return obj.toString();
    case "object":
      if (obj === null) {
        return "nothing";
      }
      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          return "[]";
        }
        let s = "[\n";
        for (const item of obj) {
          s += " ".repeat(indent + 4) + jsonAsJulia(item, indent + 4) + ",\n";
        }
        if (s.endsWith(",\n")) {
          s = s.slice(0, -2) + "\n";
        }
        s += " ".repeat(indent) + "]";
        return s;
      }

      if (Object.keys(obj).length === 0) {
        return "Dict()";
      }
      {
        // TODO: this causes keys to be sent out of order
        let s = "Dict(\n";
        for (const [k, v] of Object.entries(obj)) {
          // repr() because JSON keys must be strings.
          s +=
            " ".repeat(indent + 4) +
            reprStr(k) +
            " => " +
            jsonAsJulia(v, indent + 4) +
            ",\n";
        }
        if (s.endsWith(",\n")) {
          s = s.slice(0, -2) + "\n";
        }
        s += " ".repeat(indent) + ")";
        return s;
      }
    default:
      throw new CCError(
        "unexpected object type that shouldn't appear in JSON: " + typeof obj,
      );
  }
}

function formatData(request: Request, imports: Set<string>): [string, string] {
  if (!request.dataArray) {
    return ["", ""]; // placate type-checker
  }

  const contentType = request.headers.getContentType();
  // TODO: delete Content-Type header when it's what Julia will send anyway
  if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    request.dataArray[0] instanceof Word &&
    request.dataArray[0].isString()
  ) {
    if (contentType === "application/json") {
      try {
        const jsonData = jsonParseLossless(
          request.dataArray[0].toString(),
        ) as any;
        const result = jsonAsJulia(jsonData);
        imports.add("JSON");
        return [result, "JSON.json(body)"];
      } catch {}
    } else if (contentType === "application/x-www-form-urlencoded") {
      const [queryList] = parseQueryString(request.dataArray[0]);
      if (queryList) {
        let code = "Dict(\n";
        for (const [k, v] of queryList) {
          if (v === null) {
            continue;
          }
          code += "    " + repr(k) + " => " + repr(v) + ",\n";
        }
        if (code.endsWith(",\n")) {
          code = code.slice(0, -2) + "\n";
        }
        code += ")";
        return [code, "body"];
      }
    }
  }

  const formattedItems = [];
  for (const item of request.dataArray) {
    if (item instanceof Word) {
      formattedItems.push(repr(item));
    } else {
      let formattedItem = "";
      if (item.name) {
        formattedItem += repr(mergeWords(item.name, "=")) + " * ";
      }
      const filename = eq(item.filename, "-") ? "stdin" : repr(item.filename);
      if (item.filetype === "data") {
        formattedItem += "replace(read(" + filename + ', String), "\\n" => "")';
      } else {
        // TODO: binary files shouldn't be read as string
        formattedItem += "read(" + filename + ", String)";
      }
      formattedItems.push(formattedItem);
    }
  }
  return [formattedItems.join(" * \n    "), "body"];
}

export function _toJulia(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings, { dataReadsFile: true });
  let code = "";

  const imports = new Set<string>(["HTTP"]);

  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"];
  const method = request.urls[0].method;
  let fn = "HTTP.request";
  const args = [];
  if (method.isString() && methods.includes(method.toString())) {
    fn = "HTTP." + method.toString().toLowerCase();
  } else {
    args.push(repr(method));
  }

  let url = repr(request.urls[0].url);
  let hasQuery = false;
  if (request.urls[0].queryList) {
    // TODO: use Dict() when no repeated keys
    code += "query = [\n";
    for (const [k, v] of request.urls[0].queryList) {
      code += "    " + repr(k) + " => " + repr(v) + ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "]\n\n";

    url = repr(request.urls[0].urlWithoutQueryList);
    hasQuery = true;
  }
  args.push(url);

  const hasHeaders = request.headers.length || request.urls[0].auth;
  if (hasHeaders) {
    code += "headers = Dict(\n";
    for (const [k, v] of request.headers) {
      if (v === null) {
        continue;
      }
      code += "    " + repr(k) + " => " + repr(v) + ",\n";
    }
    if (request.urls[0].auth) {
      code +=
        '    "Authorization" => "Basic " * base64encode(' +
        repr(
          mergeWords(request.urls[0].auth[0], ":", request.urls[0].auth[1]),
        ) +
        "),\n";
      imports.add("Base64");
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += ")\n\n";
    args.push("headers");
  }

  let bodyArg = null;
  if (request.urls[0].uploadFile) {
    if (eq(request.urls[0].uploadFile, "-")) {
      bodyArg = "stdin";
    } else {
      code += "body = open(" + repr(request.urls[0].uploadFile) + ', "r")\n\n';
      bodyArg = "body";
    }
  } else if (request.multipartUploads) {
    code += "form = HTTP.Form(\n";
    code += "    Dict(\n";
    for (const f of request.multipartUploads) {
      code += "        " + repr(f.name) + " => ";
      if ("content" in f) {
        code += repr(f.content) + ",\n";
      } else {
        if (!f.contentType && f.filename && eq(f.contentFile, f.filename)) {
          code += "open(" + repr(f.contentFile) + "),\n";
        } else if (!f.filename) {
          // There's no way to change Content-Type without sending a filename
          code += "read(" + repr(f.contentFile) + ", String),\n";
        } else {
          code += "HTTP.Multipart(";
          if (eq(f.contentFile, f.filename)) {
            code += repr(f.filename);
          } else {
            code += repr(f.contentFile);
          }
          code += ", open(" + repr(f.contentFile) + ")";
          if (f.contentType) {
            code += ", " + repr(f.contentType);
          }
          code += "),\n";
        }
      }
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "    )\n";
    code += ")\n\n";
    bodyArg = "form";
  } else if (request.dataArray && request.dataArray.length) {
    let bodyCode;
    [bodyCode, bodyArg] = formatData(request, imports);
    code += "body = " + bodyCode + "\n\n";
  }
  if (bodyArg) {
    if (!hasHeaders) {
      args.push("[]");
    }
    args.push(bodyArg);
  }

  if (hasQuery) {
    args.push("query=query");
  }

  if (request.timeout) {
    args.push("readtimeout=" + request.timeout.toString());
    warnings.push([
      "not-read-timeout",
      "curl has no read timeout, using Julia's `readtimeout` instead",
    ]);
  }
  if (request.compressed === false) {
    args.push("decompress=false");
  }
  if (request.retry) {
    args.push("retries=" + request.retry.toString());
  }
  if (request.followRedirects === false) {
    args.push("redirect=false");
  }
  if (request.maxRedirects) {
    args.push("redirect_limit=" + request.maxRedirects.toString());
  }
  if (request.insecure) {
    args.push("require_ssl_verification=false");
  }

  if (request.verbose) {
    args.push("verbose=1");
  }

  code += "resp = " + fn + "(";
  const oneLineArgs = args.join(", ");
  if (
    ((fn === "HTTP.request" && args.length > 2) ||
      (fn !== "HTTP.request" && args.length > 1)) &&
    oneLineArgs.length > 70
  ) {
    code += "\n    " + args.join(",\n    ");
    code += "\n)\n";
  } else {
    code += oneLineArgs + ")\n";
  }

  let importCode = "";
  if (imports.size) {
    importCode = "using " + Array.from(imports).sort().join(", ") + "\n\n";
  }

  return importCode + code;
}

export function toJuliaWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toJulia(requests, warnings);
  return [code, warnings];
}
export function toJulia(curlCommand: string | string[]): string {
  return toJuliaWarn(curlCommand)[0];
}
