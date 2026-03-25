import { Word, eq, joinWords } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "insecure",
  "no-insecure",
  "compressed",
  "no-compressed",
  "digest",
  "no-digest",
  "location",
  "no-location",
  // "location-trusted",
  // "no-location-trusted",
  "form",
  "form-string",
  "proxy",
  "proxy-user",
  "unix-socket",
]);

// https://www.php.net/manual/en/language.types.string.php
// https://www.php.net/manual/en/language.types.string.php#language.types.string.details
// https://www.unicode.org/reports/tr44/#GC_Values_Table
// https://unicode.org/Public/UNIDATA/UnicodeData.txt
// https://en.wikipedia.org/wiki/Plane_(Unicode)#Overview
const regexSingleEscape = /'|\\/gu;
const regexDoubleEscape = /"|\$|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  let [quote, regex] = ["'", regexSingleEscape];
  if ((s.includes("'") && !s.includes('"')) || /[^\x20-\x7E]/.test(s)) {
    [quote, regex] = ['"', regexDoubleEscape];
  }

  return (
    quote +
    s.replace(regex, (c: string) => {
      switch (c) {
        // https://www.php.net/manual/en/language.types.string.php#language.types.string.syntax.double
        case "$":
          return quote === "'" ? "$" : "\\$";
        case "\\":
          return "\\\\";
        case "'":
        case '"':
          return c === quote ? "\\" + c : c;
        // The rest of these should not appear in single quotes
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\v":
          return "\\v";
        case "\x1B":
          return "\\e";
        case "\f":
          return "\\f";
      }

      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length > 2) {
        return "\\u{" + hex + "}";
      }
      return "\\x" + hex.padStart(2, "0");
    }) +
    quote
  );
}

export function repr(w: Word): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      args.push("getenv(" + reprStr(t.value) + ") ?? " + reprStr(""));
    } else if (t.type === "command") {
      // TODO: use backticks instead
      args.push("shell_exec(" + reprStr(t.value) + ")");
    }
  }
  return args.join(" . ");
}

export function _toPhp(requests: Request[], warnings: Warnings = []): string {
  // TODO: only reading one file is supported
  const request = getFirst(requests, warnings, { dataReadsFile: true });

  let cookieString;
  if (request.headers.has("cookie")) {
    cookieString = request.headers.get("cookie");
    request.headers.delete("cookie");
  }

  let phpCode = "<?php\n";
  phpCode += "$ch = curl_init();\n";
  phpCode +=
    "curl_setopt($ch, CURLOPT_URL, " + repr(request.urls[0].url) + ");\n";
  phpCode += "curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n";
  phpCode +=
    "curl_setopt($ch, CURLOPT_CUSTOMREQUEST, " +
    repr(request.urls[0].method) +
    ");\n";

  if (request.compressed) {
    request.headers.setIfMissing("Accept-Encoding", "gzip");
  }
  if (request.headers.length) {
    let headersArrayCode = "[\n";

    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }
      headersArrayCode +=
        "    " + repr(joinWords([headerName, headerValue], ": ")) + ",\n";
    }

    headersArrayCode += "]";
    phpCode +=
      "curl_setopt($ch, CURLOPT_HTTPHEADER, " + headersArrayCode + ");\n";
  }

  if (cookieString) {
    phpCode +=
      "curl_setopt($ch, CURLOPT_COOKIE, " + repr(cookieString) + ");\n";
  }

  if (request.urls[0].auth && ["basic", "digest"].includes(request.authType)) {
    const authType =
      request.authType === "digest" ? "CURLAUTH_DIGEST" : "CURLAUTH_BASIC";
    phpCode += "curl_setopt($ch, CURLOPT_HTTPAUTH, " + authType + ");\n";
    phpCode +=
      "curl_setopt($ch, CURLOPT_USERPWD, " +
      repr(joinWords(request.urls[0].auth, ":")) +
      ");\n";
  }

  if (request.data || request.multipartUploads) {
    let requestDataCode = "";
    if (request.multipartUploads) {
      requestDataCode = "[\n";
      for (const m of request.multipartUploads) {
        requestDataCode += "    " + repr(m.name) + " => ";
        if ("contentFile" in m) {
          requestDataCode += "new CURLFile(" + repr(m.contentFile);
          if (m.contentType) {
            requestDataCode += ", " + repr(m.contentType);
          }
          if (m.filename && !eq(m.filename, m.contentFile)) {
            if (!m.contentType) {
              // This actually sets it to the default, application/octet-stream
              requestDataCode += ", null";
            }
            requestDataCode += ", " + repr(m.filename);
          }
          requestDataCode += ")";
        } else {
          if ("filename" in m && m.filename) {
            requestDataCode += "new CURLStringFile(" + repr(m.content);
            requestDataCode += ", " + repr(m.filename);
            if (m.contentType) {
              requestDataCode += ", " + repr(m.contentType);
            }
            requestDataCode += ")";
          } else {
            requestDataCode += repr(m.content);
          }
        }
        requestDataCode += ",\n";
      }
      requestDataCode += "]";
    } else if (request.isDataBinary && request.data!.charAt(0) === "@") {
      // TODO: do this properly with .dataArray
      requestDataCode =
        "file_get_contents(" + repr(request.data!.slice(1)) + ")";
    } else {
      requestDataCode = repr(request.data!);
    }
    phpCode +=
      "curl_setopt($ch, CURLOPT_POSTFIELDS, " + requestDataCode + ");\n";
  }

  if (request.proxy) {
    phpCode +=
      "curl_setopt($ch, CURLOPT_PROXY, " + repr(request.proxy) + ");\n";
    if (request.proxyAuth) {
      phpCode +=
        "curl_setopt($ch, CURLOPT_PROXYUSERPWD, " +
        repr(request.proxyAuth) +
        ");\n";
    }
  }

  if (request.timeout) {
    phpCode +=
      "curl_setopt($ch, CURLOPT_TIMEOUT, " +
      (parseInt(request.timeout.toString(), 10) || 0) +
      ");\n";
  }

  if (request.unixSocket) {
    phpCode +=
      "curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, " +
      repr(request.unixSocket) +
      ");\n";
  }

  if (request.followRedirects) {
    phpCode += "curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);\n";
  }

  if (request.insecure) {
    phpCode += "curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);\n";
    phpCode += "curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);\n";
  }

  phpCode += "\n$response = curl_exec($ch);\n\n";

  phpCode += "curl_close($ch);\n";
  return phpCode;
}

export function toPhpWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const php = _toPhp(requests, warnings);
  return [php, warnings];
}
export function toPhp(curlCommand: string | string[]): string {
  return toPhpWarn(curlCommand)[0];
}
