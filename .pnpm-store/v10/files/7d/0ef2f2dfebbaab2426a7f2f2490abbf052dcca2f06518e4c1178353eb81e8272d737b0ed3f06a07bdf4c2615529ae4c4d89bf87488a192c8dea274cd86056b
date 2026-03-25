import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { wordDecodeURIComponent, parseQueryString } from "../../Query.js";
import type { QueryList } from "../../Query.js";

import { reprStr as pyrepr } from "../python/python.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "insecure",
  "no-insecure",
]);

const RESERVED_WORDS = new Set([
  "if",
  "else",
  "repeat",
  "while",
  "function",
  "for",
  "in",
  "next",
  "break",
  "TRUE",
  "FALSE",
  "NULL",
  "Inf",
  "NaN",
  "NA",
  "NA_integer_",
  "NA_real_",
  "NA_complex_",
  "NA_character_",
]);

// backtick quote names
const regexBacktickEscape = /`|\\|\p{C}|[^ \P{Z}]/gu;
export function reprBacktick(s: Word | string): string {
  if (s instanceof Word) {
    if (!s.isString()) {
      // TODO: warn
    }

    s = s.toString();
  }

  if (
    (s.match(/^[a-zA-Z][a-zA-Z0-9._]*$/) ||
      s.match(/^\.[a-zA-Z][a-zA-Z0-9._]*$/)) &&
    !RESERVED_WORDS.has(s)
  ) {
    return s;
  }

  return (
    "`" +
    s.replace(regexBacktickEscape, (c: string): string => {
      switch (c) {
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
        case "\\":
          return "\\\\";
        case "`":
          return "\\`";
      }
      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 2) {
        return "\\x" + hex.padStart(2, "0");
      }
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
      }
      return "\\U" + hex.padStart(8, "0");
    }) +
    "`"
  );
}

// https://stat.ethz.ch/R-manual/R-devel/doc/manual/R-lang.html#Literal-constants
export function reprStr(s: string): string {
  // R prefers double quotes
  const quote = s.includes('"') && !s.includes("'") ? "'" : '"';
  return pyrepr(s, quote);
}

export function repr(w: Word): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      args.push("Sys.getenv(" + reprStr(t.value) + ")");
    } else {
      args.push("system(" + reprStr(t.value) + ", intern = TRUE)");
    }
  }
  if (args.length === 1) {
    return args[0];
  }
  return "paste0(" + args.join(", ") + ")";
}

export function toNumeric(w: Word): string {
  if (w.isString()) {
    const s = w.toString();
    // TODO: better check
    if (parseFloat(s).toString() === s) {
      return s;
    }
  }
  return "as.numeric(" + repr(w) + ")";
}

function getCookieDict(request: Request): string | null {
  if (!request.cookies) {
    return null;
  }
  let cookieDict = "cookies = c(\n";

  const lines: string[] = [];
  for (const [key, value] of request.cookies) {
    try {
      // httr percent-encodes cookie values
      const decoded = wordDecodeURIComponent(value.replace(/\+/g, " "));
      lines.push("  " + reprBacktick(key) + " = " + repr(decoded));
    } catch {
      return null;
    }
  }
  cookieDict += lines.join(",\n");
  cookieDict += "\n)\n";

  request.headers.delete("Cookie");
  return cookieDict;
}

function getQueryList(request: Request): string | undefined {
  if (request.urls[0].queryList === undefined) {
    return undefined;
  }

  let queryList = "params = list(\n";
  queryList += request.urls[0].queryList
    .map((param) => {
      const [key, value] = param;
      return "  " + reprBacktick(key) + " = " + repr(value);
    })
    .join(",\n");
  queryList += "\n)\n";
  return queryList;
}

function getFilesString(request: Request): string | undefined {
  if (!request.multipartUploads) {
    return undefined;
  }
  // http://docs.rstats-requests.org/en/master/user/quickstart/#post-a-multipart-encoded-file
  let filesString = "files = list(\n";
  filesString += request.multipartUploads
    .map((m) => {
      let fileParam;
      if ("contentFile" in m) {
        // filesString += "    " + reprBacktick(multipartKey) + " (" + repr(fileName) + ", upload_file(" + repr(fileName) + "))";
        fileParam =
          "  " +
          reprBacktick(m.name) +
          " = upload_file(" +
          repr(m.contentFile) +
          ")";
      } else {
        fileParam = "  " + reprBacktick(m.name) + " = " + repr(m.content) + "";
      }
      return fileParam;
    })
    .join(",\n");
  filesString += "\n)\n";

  return filesString;
}

export function _toR(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);

  const cookieDict = getCookieDict(request);

  let headerDict;
  if (request.headers.length) {
    const hels: string[] = [];
    headerDict = "headers = c(\n";
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue !== null) {
        hels.push("  " + reprBacktick(headerName) + " = " + repr(headerValue));
      }
    }
    headerDict += hels.join(",\n");
    headerDict += "\n)\n";
  }

  const queryList = getQueryList(request);

  let dataString;
  let dataIsList;
  let filesString;
  if (request.multipartUploads) {
    filesString = getFilesString(request);
  } else if (request.data) {
    if (request.data.startsWith("@") && !request.isDataRaw) {
      const filePath = request.data.slice(1);
      dataString = "data = upload_file(" + repr(filePath) + ")";
    } else {
      const [parsedQueryString] = parseQueryString(request.data);
      // repeat to satisfy type checker
      dataIsList = parsedQueryString && parsedQueryString.length;
      if (dataIsList) {
        dataString = "data = list(\n";
        dataString += (parsedQueryString as QueryList)
          .map((q) => {
            const [key, value] = q;
            return "  " + reprBacktick(key) + " = " + repr(value);
          })
          .join(",\n");
        dataString += "\n)\n";
      } else {
        dataString = "data = " + repr(request.data) + "\n";
      }
    }
  }
  const url = request.urls[0].queryList
    ? request.urls[0].urlWithoutQueryList
    : request.urls[0].url;

  let requestLine = "res <- httr::";

  // TODO: GET() and HEAD() don't support sending data, detect and use VERB() instead
  if (
    ["GET", "HEAD", "PATCH", "PUT", "DELETE", "POST"].includes(
      request.urls[0].method.toString(),
    )
  ) {
    requestLine += request.urls[0].method.toString() + "(";
  } else {
    requestLine += "VERB(" + repr(request.urls[0].method) + ", ";
    if (!eq(request.urls[0].method, request.urls[0].method.toUpperCase())) {
      warnings.push([
        "non-uppercase-method",
        "httr will uppercase the method: " +
          JSON.stringify(request.urls[0].method.toString()),
      ]);
    }
  }
  requestLine += "url = " + repr(url);

  let requestLineBody = "";
  if (headerDict) {
    requestLineBody += ", httr::add_headers(.headers=headers)";
  }
  if (request.urls[0].queryList) {
    requestLineBody += ", query = params";
  }
  if (cookieDict) {
    requestLineBody += ", httr::set_cookies(.cookies = cookies)";
  }
  if (request.multipartUploads) {
    requestLineBody += ', body = files, encode = "multipart"';
  } else if (request.data) {
    requestLineBody += ", body = data";
    if (dataIsList) {
      requestLineBody += ', encode = "form"';
    }
  }
  if (request.insecure) {
    requestLineBody += ", config = httr::config(ssl_verifypeer = FALSE)";
  }
  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;
    requestLineBody +=
      ", httr::authenticate(" + repr(user) + ", " + repr(password) + ")";
  }
  requestLineBody += ")";

  requestLine += requestLineBody;

  let rstatsCode = "";
  rstatsCode += "library(httr)\n\n";
  if (cookieDict) {
    rstatsCode += cookieDict + "\n";
  }
  if (headerDict) {
    rstatsCode += headerDict + "\n";
  }
  if (queryList !== undefined) {
    rstatsCode += queryList + "\n";
  }
  if (dataString) {
    rstatsCode += dataString + "\n";
  } else if (filesString) {
    rstatsCode += filesString + "\n";
  }
  rstatsCode += requestLine;

  return rstatsCode + "\n";
}
export function toRWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const rHttr = _toR(requests, warnings);
  return [rHttr, warnings];
}
export function toR(curlCommand: string | string[]): string {
  return toRWarn(curlCommand)[0];
}
