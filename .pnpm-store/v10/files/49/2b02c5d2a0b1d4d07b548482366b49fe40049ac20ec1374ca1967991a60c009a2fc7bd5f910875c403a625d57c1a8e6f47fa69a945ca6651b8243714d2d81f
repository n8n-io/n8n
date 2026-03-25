import { CCError } from "../utils.js";
import { warnIfPartsIgnored } from "../Warnings.js";
import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, RequestUrl, Warnings } from "../parse.js";
import { Headers } from "../Headers.js";
import { parseQueryString } from "../Query.js";

import { repr, reprStr } from "./wget.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",

  "location",
  "no-location",
  "location-trusted",
  "no-location-trusted",
  "max-redirs",

  "ciphers",
  "insecure",
  "cert",
  "key",
  "cacert",
  "capath",

  "proxy",
  // "proxy-user", // not supported
  "noproxy", // not supported, just better error

  "timeout",
  "connect-timeout",

  // Wget picks the auth and some it doesn't support but there's a more
  // specific error message for those.
  "anyauth",
  "no-anyauth",
  "digest",
  "no-digest",
  // "aws-sigv4", // not supported
  "negotiate",
  "no-negotiate",
  "delegation", // GSS/kerberos
  // "service-name", // GSS/kerberos, not supported
  "ntlm",
  "no-ntlm",
  "ntlm-wb",
  "no-ntlm-wb",

  // HTTPie looks for a netrc file by default
  // TODO: this doesn't work
  "no-netrc", // only explicitly disabling netrc has an effect,

  "verbose",
  "silent",

  // "output",
  "upload-file",

  "next",
]);

function escapeHeader(name: Word): Word {
  // TODO: more complicated, have to check that it's not already backslashed
  // and not all values might be representable
  return name.replace("=", "\\=");
}
function escapeHeaderValue(value: Word): Word {
  if ((value.startsWith("="), value.startsWith("@"))) {
    value = value.prepend("\\");
  }
  return value;
}

function escapeJsonName(name: string, isFirstKey = false): string {
  name = name
    .replace("\\", "\\\\")
    .replace("[", "\\[")
    .replace("]", "\\]")
    .replace(":", "\\:") // both := need to be escaped individually or you get weird results
    .replace("=", "\\=");

  // "A regular integer in a path (e.g [10]) means an array index;
  // but if you want it to be treated as a string, you can escape
  // the whole number by using a backslash (\) prefix."
  // TODO: check this regex
  if (!isFirstKey && /^\d+$/.test(name)) {
    name = "\\" + name;
  }
  return name;
}
function escapeJsonStr(value: string): string {
  // The backslash only has an effect on some characters and not
  // the backslash itself, so it seems like there's no way to send a literal '\='
  // value = value.replace("\\=", "\\\\=");
  if (value.startsWith("\\=")) {
    throw new CCError(
      "Unrepresentable JSON string: " +
        JSON.stringify(value) +
        ' (starts with "\\=")',
    );
  }
  if (value.startsWith("\\@")) {
    throw new CCError(
      "Unrepresentable JSON string: " +
        JSON.stringify(value) +
        ' (starts with "\\@")',
    );
  }
  if (value.startsWith("=") || value.startsWith("@")) {
    value = "\\" + value;
  }
  return value;
}
function toJson(obj: any, key = ""): string[] {
  if (obj === null) {
    return [reprStr(key) + ":=null"];
  } else if (typeof obj === "boolean") {
    return [reprStr(key) + ":=" + obj.toString()];
  } else if (typeof obj === "number") {
    return [reprStr(key) + ":=" + reprStr(obj.toString())];
  } else if (typeof obj === "string") {
    return [reprStr(key) + "=" + reprStr(escapeJsonStr(obj))];
  } else if (Array.isArray(obj)) {
    if (!obj.length) {
      return [reprStr(key) + ":=" + "[]"];
    }
    return obj.map((item) => toJson(item, key + "[]")).flat();
  } else {
    if (!Object.keys(obj).length) {
      return [reprStr(key) + ":=" + "{}"];
    }
    return Object.entries(obj)
      .map(([name, value]) =>
        toJson(
          value,
          key
            ? key + "[" + escapeJsonName(name) + "]"
            : escapeJsonName(name, true),
        ),
      )
      .flat();
  }
}
function jsonAsHttpie(flags: string[], items: string[], data: string) {
  let json;
  try {
    json = JSON.parse(data);
  } catch {}
  // Only non-empty, top-level objects and arrays can be serialized as command line arguments
  if (
    (typeof json === "object" && json !== null && Object.keys(json).length) ||
    (Array.isArray(json) && json.length)
  ) {
    let jsonItems;
    try {
      jsonItems = toJson(json);
    } catch {}
    if (jsonItems) {
      for (const jsonItem of jsonItems) {
        items.push(jsonItem);
      }
      return;
    }
  }
  flags.push("--raw " + (reprStr(data) || "''"));
}

function escapeQueryName(name: Word): Word {
  // an unquoted ":" turns into ": "
  return name.replace("\\", "\\\\").replace(":", "\\:").replace("=", "\\=");
}
function escapeQueryValue(value: Word): Word {
  // TODO: the backslash only has an effect on some characters and not
  // the backslash itself, so it seems like there's no way to send a literal '\='
  // value = value.replace("\\=", "\\\\=");
  if ((value.startsWith("="), value.startsWith("@"))) {
    value = value.prepend("\\");
  }
  return value;
}
function urlencodedAsHttpie(flags: string[], items: string[], data: Word) {
  let queryList;
  try {
    [queryList] = parseQueryString(data);
  } catch {}
  if (!queryList) {
    flags.push("--raw " + (repr(data) || "''"));
    return;
  }

  flags.push("--form");
  for (const [name, value] of queryList) {
    items.push(
      repr(mergeWords(escapeQueryName(name), "=", escapeQueryValue(value))),
    );
  }
}

function formatData(
  flags: string[],
  items: string[],
  data: Word,
  headers: Headers,
) {
  const contentType = headers.getContentType();
  if (contentType === "application/json" && data.isString()) {
    jsonAsHttpie(flags, items, data.toString());
  } else if (contentType === "application/x-www-form-urlencoded") {
    urlencodedAsHttpie(flags, items, data);
  } else {
    flags.push("--raw " + (repr(data) || "''"));
  }
}

// TODO: does this work?
function escapeFormName(name: Word): Word {
  return name.replace("\\", "\\\\").replace("@", "\\@").replace("=", "\\=");
}

function requestToHttpie(
  request: Request,
  url: RequestUrl,
  warnings: Warnings,
): string {
  const flags: string[] = [];
  let method: string | null = null;
  let urlArg = url.url;
  const items: string[] = [];

  if (url.uploadFile || request.data || request.multipartUploads) {
    if (!eq(url.method, "POST")) {
      method = repr(url.method);
    }
  } else if (!eq(url.method, "GET")) {
    method = repr(url.method);
  }

  // TODO: don't merge headers
  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        items.push(repr(mergeWords(escapeHeader(headerName), ":")));
      } else if (!headerValue.toBool()) {
        items.push(repr(mergeWords(escapeHeader(headerName), ";")));
      } else {
        items.push(
          repr(
            mergeWords(
              escapeHeader(headerName),
              ":",
              escapeHeaderValue(headerValue),
            ),
          ),
        );
      }
    }
  }

  if (url.auth) {
    const [user, password] = url.auth;

    if (request.authType === "digest") {
      flags.push("-A digest");
    } else if (request.authType === "ntlm" || request.authType === "ntlm-wb") {
      flags.push("--auth-type=ntlm");
      warnings.push([
        "httpie-ntlm",
        "NTLM auth requires the httpie-ntlm plugin",
      ]);
    } else if (request.authType === "negotiate") {
      flags.push("--auth-type=negotiate");
      warnings.push([
        "httpie-negotiate",
        "SPNEGO (GSS Negotiate) auth requires the httpie-negotiate plugin",
      ]);
      // TODO: is this the same thing?
      // } else if (request.authType === "aws-sigv4") {
      //   warnings.push([
      //     "httpie-ntlm",
      //     "aws-sigv4 auth is not supported and requires the httpie-aws-auth plugin",
      //   ]);
    } else if (request.authType !== "basic") {
      warnings.push([
        "httpie-unsupported-auth",
        "HTTPie doesn't support " + request.authType + " authentication",
      ]);
    }
    // TODO: -A bearer -a token

    flags.push("-a " + repr(mergeWords(user, ":", password)));
  }

  if (url.queryList) {
    urlArg = url.urlWithoutQueryList;
    for (const [name, value] of url.queryList) {
      items.push(
        repr(mergeWords(escapeQueryName(name), "==", escapeQueryValue(value))),
      );
    }
  }

  if (url.uploadFile) {
    if (eq(url.uploadFile, "-") || eq(url.uploadFile, ".")) {
      warnings.push([
        "httpie-stdin",
        "pass in the file contents to HTTPie through stdin",
      ]);
    } else {
      items.push("@" + repr(url.uploadFile));
    }
  } else if (request.multipartUploads) {
    flags.push("--multipart");
    for (const m of request.multipartUploads) {
      if ("content" in m) {
        items.push(repr(escapeFormName(m.name)) + "=" + repr(m.content));
      } else {
        if ("filename" in m && m.filename) {
          items.push(repr(escapeFormName(m.name)) + "@" + repr(m.filename));
          if (!eq(m.filename, m.contentFile)) {
            warnings.push([
              "httpie-multipart-fake-filename",
              "HTTPie doesn't support multipart uploads that read a certain filename but send a different filename",
            ]);
          }
        } else {
          items.push(repr(escapeFormName(m.name)) + "=@" + repr(m.contentFile));
        }
      }
    }
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    // TODO: surely --upload-file and this can't be identical,
    // doesn't this ignore url encoding?
    items.push("@" + repr(request.dataArray[0].filename));
  } else if (request.data) {
    formatData(flags, items, request.data, request.headers);
  }

  if (request.followRedirects || request.followRedirectsTrusted) {
    flags.push("--follow");
  }
  if (request.maxRedirects && request.maxRedirects.toString() !== "30") {
    // TODO: escape/parse?
    flags.push("--max-redirects=" + repr(request.maxRedirects));
  }

  if (request.netrc === "ignored") {
    flags.push("--ignore-netrc");
  }

  if (request.proxy) {
    flags.push("--proxy=http:" + repr(request.proxy));
    flags.push("--proxy=https:" + repr(request.proxy));
  }
  if (request.proxyAuth) {
    // TODO: add to proxy URL
  }
  if (request.noproxy) {
    warnings.push([
      "httpie-noproxy",
      "HTTPie requires passing noproxy through environment variables: " +
        JSON.stringify(request.noproxy.toString()),
    ]);
  }

  if (request.insecure) {
    flags.push("--verify=no");
  }
  if (request.cacert) {
    flags.push("--verify=" + repr(request.cacert));
  }
  if (request.capath) {
    flags.push("--verify=" + repr(request.capath));
  }

  if (request.cert) {
    flags.push("--cert=" + repr(request.cert[0]));
  }
  if (request.key) {
    flags.push("--cert-key=" + repr(request.key));
  }
  if (request.cert && request.cert[1]) {
    flags.push("--cert-key-pass=" + repr(request.cert[1]));
  }
  // TODO: --ssl= for the version
  if (request.ciphers) {
    flags.push("--ciphers=" + repr(request.ciphers));
  }

  if (request.connectTimeout) {
    flags.push("--timeout=" + repr(request.connectTimeout));
  }
  if (request.timeout) {
    if (request.connectTimeout) {
      warnings.push([
        "httpie-timeout-with-connect-timeout",
        "ignoring --timeout because HTTPie's timeout is more similar to curl's --connect-timeout",
      ]);
    } else {
      flags.push("--timeout=" + repr(request.timeout));
      // warn that this is not for the whole request
      warnings.push([
        "httpie-timeout",
        "HTTPie's timeout is just for the connection, not for the whole request",
      ]);
    }
  }

  if (request.verbose) {
    flags.push("--verbose");
  }
  if (request.silent) {
    flags.push("--quiet");
  }

  function localhostShorthand(u: Word): Word {
    if (u.startsWith("localhost:")) {
      return u.slice("localhost".length);
    } else if (u.startsWith("localhost/") || eq(u, "localhost")) {
      return u.slice("localhost".length).prepend(":");
    }
    return u;
  }
  let command = "http";
  if (urlArg.startsWith("https://")) {
    command = "https";
    urlArg = localhostShorthand(urlArg.slice("https://".length));
  } else if (urlArg.startsWith("http://")) {
    urlArg = localhostShorthand(urlArg.slice("http://".length));
  }

  if (url.output) {
    // TODO: pipe output
  }

  if (method) {
    flags.push(method);
  }
  // If any of the field names or headers starts with a dash, add a -- argument
  // TODO: this might have edge cases
  if (items.some((i) => i.startsWith("-"))) {
    items.unshift("--");
  }
  const args = [...flags, repr(urlArg), ...items];
  const multiline =
    args.length > 3 || args.reduce((a, b) => a + b.length, 0) > 80 - 5;
  const joiner = multiline ? " \\\n  " : " ";
  return command + " " + args.join(joiner) + "\n";
}

export function _toHttpie(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const commands = [];

  for (const request of requests) {
    warnIfPartsIgnored(request, warnings, {
      dataReadsFile: true,
      // HTTPie has its own session.json file format
      // cookieFiles: true,
      multipleUrls: true,
    });
    if (
      request.dataReadsFile &&
      request.dataArray &&
      request.dataArray.length &&
      (request.dataArray.length > 1 ||
        (!(request.dataArray[0] instanceof Word) && request.dataArray[0].name))
    ) {
      warnings.push([
        "unsafe-data",
        "the generated data content is wrong, " +
          // TODO: might not come from "@"
          JSON.stringify("@" + request.dataReadsFile) +
          " means read the file " +
          JSON.stringify(request.dataReadsFile),
      ]);
    }

    for (const url of request.urls) {
      commands.push(requestToHttpie(request, url, warnings));
    }
  }
  return commands.join("\n\n");
}

export function toHttpieWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const httpie = _toHttpie(requests, warnings);
  return [httpie, warnings];
}

export function toHttpie(curlCommand: string | string[]): string {
  return toHttpieWarn(curlCommand)[0];
}
