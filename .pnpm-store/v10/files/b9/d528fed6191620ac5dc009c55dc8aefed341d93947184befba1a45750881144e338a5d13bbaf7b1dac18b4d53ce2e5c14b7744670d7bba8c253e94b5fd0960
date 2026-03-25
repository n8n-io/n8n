import { CCError } from "../utils.js";
import { Word, eq } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";
import type { QueryList, QueryDict } from "../Query.js";
import { Headers } from "../Headers.js";
import type { DataParam } from "../Request.js";
import type { FormParam } from "../curl/form.js";
import { parseQueryString } from "../Query.js";

// "Clojure strings are Java Strings."
// https://clojure.org/reference/data_structures#Strings
import { reprStr } from "./java/java.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",

  // "http0.9",
  // "http1.0",
  // "http1.1",
  // "no-http0.9",

  "insecure",
  "no-insecure",
  "compressed",
  "no-compressed",

  "max-time",
  "connect-timeout",

  "max-redirs",
  "location",
  "no-location",
  "location-trusted",
  "no-location-trusted",

  // "anyauth",
  // "no-anyauth",
  "digest",
  "no-digest",
  // "aws-sigv4",
  // "negotiate",
  // "no-negotiate",
  // "delegation", // GSS/kerberos
  // "service-name", // GSS/kerberos
  "ntlm",
  "no-ntlm",
  "ntlm-wb",
  "no-ntlm-wb",

  // "upload-file",
  // "output",
  // "proxy",
  // "proxy-user",
]);

export function repr(w: Word, importLines: Set<string>): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      // (str) to return empty string if var missing
      // TODO: is there a better way?
      args.push("(str (System/getenv " + reprStr(t.value) + "))");
      // TODO: Seems to be unnecessary
      // importLines.add("(import 'java.lang.System)");
    } else {
      importLines.add("(use '[clojure.java.shell :only [sh]])");
      args.push('(sh "bash" "-c" ' + reprStr(t.value) + ")");
    }
  }
  if (args.length > 1) {
    // TODO: format on multiple lines if it's long enough?
    return "(str " + args.join(" ") + ")";
  }
  return args[0];
}

// https://clojure.org/reference/reader#_symbols
// https://clojure.org/reference/reader#_literals
function safeAsKeyword(s: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9*+!\-_'?<>=]*$/.test(s);
}

function reprQueryDict(query: QueryDict, importLines: Set<string>): string {
  return (
    "{" +
    query
      .map((q) => {
        const key = q[0].toString();
        if (!q[0].isString() || !safeAsKeyword(key)) {
          throw new CCError(
            "can't use query key as Clojure keyword: " + JSON.stringify(key),
          );
        }
        return (
          ":" +
          key +
          " " +
          (Array.isArray(q[1])
            ? "[" + q[1].map((qq) => repr(qq, importLines)).join(" ") + "]"
            : repr(q[1], importLines))
        );
      })
      .join("\n ") +
    "}"
  );
}

function reprQueryList(query: QueryList, importLines: Set<string>): string {
  // TODO: this is only necessary if there are repeated keys
  return (
    "[" +
    query
      .map(
        (q) =>
          "[" + repr(q[0], importLines) + " " + repr(q[1], importLines) + "]",
      )
      .join("\n ") +
    "]"
  );
}

function rerpQuery(
  queryList: QueryList | null | undefined,
  queryDict: QueryDict | null | undefined,
  importLines: Set<string>,
): string | null {
  if (queryDict) {
    try {
      return reprQueryDict(queryDict, importLines);
    } catch {}
  }
  if (queryList) {
    try {
      return reprQueryList(queryList, importLines);
    } catch {}
  }
  return null;
}

function reprHeaders(headers: Headers, importLines: Set<string>): string {
  const lines = headers.headers
    // Can't be null
    .map(
      // TODO: convert to keywords and lowercase known headers
      // TODO: :content-type is a top-level key and changes how the body is interpreted
      (h) => repr(h[0], importLines) + " " + repr(h[1] as Word, importLines),
    );
  return "{" + lines.join(",\n ") + "}";
}

function indent(s: string, indent: number): string {
  const withSpaces = "\n" + " ".repeat(indent);
  return s.replace(/\n/g, withSpaces);
}

function reprJson(
  obj: Word | Word[] | string | number | boolean | object | null,
  importLines?: Set<string>,
): string {
  if (importLines && obj instanceof Word) {
    return repr(obj, importLines);
  }
  switch (typeof obj) {
    case "string":
      return reprStr(obj);
    case "number":
      return obj.toString(); // TODO
    case "boolean":
      return obj ? "true" : "false";
    case "object":
      if (obj === null) {
        return "nil";
      }
      if (Array.isArray(obj)) {
        const objReprs = obj.map((o) => reprJson(o));
        const totalLength = objReprs.reduce((a, b) => a + b.length, 0);
        if (totalLength < 100) {
          return "[" + objReprs.join(" ") + "]";
        }
        return "[" + indent(objReprs.join("\n"), 1) + "]";
      } else {
        const objReprs = Object.entries(obj).map(([k, v]) => {
          if (!safeAsKeyword(k)) {
            throw new CCError(
              "can't use JSON key as Clojure keyword: " + JSON.stringify(k),
            );
          }
          // TODO: indent logic is wrong?
          return ":" + k + " " + indent(reprJson(v), 1 + k.length + 1);
        });
        const totalLength = objReprs.reduce((a, b) => a + b.length, 0);
        if (totalLength < 100 && objReprs.every((o) => !o.includes("\n"))) {
          return "{" + objReprs.join(" ") + "}";
        }
        return "{" + indent(objReprs.join("\n"), 1) + "}";
      }
    default:
      throw new CCError("unexpect type in JSON: " + typeof obj);
  }
}

function addDataString(
  params: Params,
  request: Request,
  data: Word,
  importLines: Set<string>,
) {
  const contentType = request.headers.getContentType();
  const exactContentType = request.headers.get("content-type");
  if (contentType === "application/json") {
    const dataStr = data.toString();
    const parsed = JSON.parse(dataStr);
    // Only convert arrays and {} as Clojure objects
    if (typeof parsed !== "object" || parsed === null) {
      params["body"] = repr(data, importLines);
      return;
    }
    const roundtrips = JSON.stringify(parsed) === dataStr;
    const jsonAsClojure = reprJson(parsed);
    const originalAsStr = repr(data, importLines);
    params["form-params"] = jsonAsClojure;
    importLines.add("(require '[cheshire.core :as json])");
    if (!roundtrips) {
      params["commented-body"] = originalAsStr; // commented-body is a special case
    }
    if (eq(exactContentType, "application/json")) {
      request.headers.delete("content-type");
    }
    // Put this line after the commented body so that the option map's closing }) isn't commented out
    params["content-type"] = ":json";
    if (eq(request.headers.get("accept"), "application/json")) {
      request.headers.delete("accept");
      params["accept"] = ":json";
    }
    return;
  }

  if (contentType === "application/x-www-form-urlencoded") {
    const [queryList, queryDict] = parseQueryString(data);
    const formParams = rerpQuery(queryList, queryDict, importLines);
    if (formParams !== null) {
      if (eq(exactContentType, "application/x-www-form-urlencoded")) {
        request.headers.delete("content-type");
      }
      // TODO: check roundtrip, add a comment
      params["form-params"] = formParams;
      return;
    }
  }

  params["body"] = repr(data, importLines);
}

function addData(
  params: Params,
  request: Request,
  data: DataParam[],
  importLines: Set<string>,
) {
  if (data.length === 1 && data[0] instanceof Word && data[0].isString()) {
    try {
      return addDataString(params, request, data[0], importLines);
    } catch {}
  }

  const parts = [];
  for (const d of data) {
    if (d instanceof Word) {
      parts.push(repr(d, importLines));
    } else {
      const { filetype, name, filename } = d;
      if (filetype === "urlencode" && name) {
        // TODO: add this to the previous Word
        parts.push(repr(name, importLines));
      }
      if (eq(filename, "-")) {
        // TODO: does this work?
        parts.push("(slurp *in*)");
      } else {
        parts.push(
          "(clojure.java.io/file " + repr(filename, importLines) + ")",
        );
      }
    }
  }
  if (parts.length === 1) {
    params["body"] = parts[0];
  } else {
    // TODO: this probably doesn't work with files
    // TODO: this needlessly nests str if there are variables/subcommands
    params["body"] = "(str " + parts.join(" ") + ")";
  }
}

function reprMultipart(
  form: FormParam[],
  importLines: Set<string>,
  warnings: Warnings,
): string {
  const parts = [];
  for (const f of form) {
    let part = "{:name " + repr(f.name, importLines);
    if ("content" in f) {
      part += " :content " + repr(f.content, importLines);
    } else {
      part +=
        " :content (clojure.java.io/file " +
        repr(f.contentFile, importLines) +
        ")";
      if (f.filename && !eq(f.filename, f.contentFile)) {
        warnings.push([
          "cant-fake-filename",
          "there's no way to send the filename " +
            JSON.stringify(f.filename.toString()) +
            " instead of " +
            JSON.stringify(f.contentFile.toString()),
        ]);
      }
    }
    parts.push(part + "}");
  }
  return "[" + parts.join("\n ") + "]";
}

type Params = { [key: string]: string };
export function _toClojure(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings, { dataReadsFile: true });

  // TODO: merge require statements
  const importLines = new Set<string>([
    "(require '[clj-http.client :as client])",
  ]);

  const methods = new Set([
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "COPY",
    "MOVE",
    "PATCH",
  ]);
  const dataMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

  const method = request.urls[0].method;
  const methodStr = method.toString();
  const params: Params = {};
  let fn;
  if (method.isString() && methods.has(methodStr)) {
    fn = "client/" + methodStr.toLowerCase();
  } else {
    // TODO: do all the other params still work?
    fn = "client/request";
    params["url"] = ""; // placeholder so that it comes first
    params["method"] = repr(method, importLines);
  }

  let url = request.urls[0].url; // TODO: .urlWithOriginalQuery?
  try {
    const queryParams = rerpQuery(
      request.urls[0].queryList,
      request.urls[0].queryDict,
      importLines,
    );

    if (queryParams) {
      params["query-params"] = queryParams;
      url = request.urls[0].urlWithoutQueryList;
    }
  } catch {}

  // addData() can delete headers, but to put them before the body we add a placeholder here
  params["headers"] = "";

  if (request.urls[0].auth) {
    const [user, pass] = request.urls[0].auth;
    const authParam = {
      basic: "basic-auth",
      digest: "digest-auth",
      // TODO: should be ["user" "pass" "host" "domain"]
      // TODO: warn
      ntlm: "ntlm-auth",
      "ntlm-wb": "ntlm-auth",

      // TODO: error
      negotiate: "basic-auth",
      bearer: "basic-auth",
      "aws-sigv4": "basic-auth",
      none: "basic-auth",
    }[request.authType];

    params[authParam] =
      "[" + repr(user, importLines) + " " + repr(pass, importLines) + "]";
  }

  if (request.multipartUploads) {
    params["multipart"] = reprMultipart(
      request.multipartUploads,
      importLines,
      warnings,
    );
    // TODO: above warning probably also applies here
  } else if (request.dataArray && request.data) {
    // Can delete headers
    addData(params, request, request.dataArray, importLines);
    if (!dataMethods.has(methodStr)) {
      warnings.push([
        "data-not-posted",
        "clj-http doesn't send data with " + methodStr + " requests",
      ]);
    }
  }

  if (request.headers.length) {
    // TODO: clojure http supports duplicate headers, they don't need to be merged
    params["headers"] = reprHeaders(request.headers, importLines);
  } else {
    delete params["headers"];
  }

  if (request.compressed === false) {
    params[":decompress-body"] = "false";
  }

  if (request.insecure) {
    params["insecure?"] = "true";
  }

  if (request.followRedirects === false) {
    params["redirect-strategy"] = ":none";
  } else if (request.followRedirects) {
    if (request.followRedirectsTrusted) {
      // TODO: is this right? Docs link 404's
      params["redirect-strategy"] = ":lax";
    }
  }
  if (request.maxRedirects) {
    params["max-redirects"] = request.maxRedirects.toString();
  }

  const times1000 = (n: Word, importLines: Set<string>) => {
    if (n.isString()) {
      // TODO: this throws away text after the number
      const asFloat = parseFloat(n.toString());
      if (!isNaN(asFloat)) {
        return (asFloat * 1000).toString();
      }
    }
    return "(* (Float/parseFloat " + repr(n, importLines) + ") 1000)";
  };
  if (request.timeout) {
    const timeout = times1000(request.timeout, importLines);
    params["socket-timeout"] = timeout;
    params["connection-timeout"] = timeout;
  }
  if (request.connectTimeout) {
    params["connection-timeout"] = times1000(
      request.connectTimeout,
      importLines,
    );
  }

  let code = "(" + fn;

  if (fn === "client/request") {
    params["url"] = repr(url, importLines);
  } else {
    code += " " + repr(url, importLines);
  }

  const paramLines = [];
  let param, value;
  for ([param, value] of Object.entries(params)) {
    let commentOut = false;
    if (param === "commented-body") {
      commentOut = true;
      param = "body";
    }
    const key = ":" + param + " ";
    let paramStr = key + indent(value, key.length);
    if (commentOut) {
      paramStr = paramStr.replace(/^/gm, ";; ");
    }
    paramLines.push(paramStr);
  }
  if (paramLines.length) {
    let paramStart = code.length + 1;
    if (code.length > 70) {
      paramStart = 1 + fn.length + 1;
      code += "\n" + " ".repeat(paramStart);
    } else {
      code += " ";
    }
    // +1 for the outer "{"
    code += indent("{" + paramLines.join("\n") + "}", paramStart + 1);
  }

  return [...importLines].sort().join("\n") + "\n\n" + code + ")\n";
}

export function toClojureWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const clojure = _toClojure(requests, warnings);
  return [clojure, warnings];
}
export function toClojure(curlCommand: string | string[]): string {
  return toClojureWarn(curlCommand)[0];
}
