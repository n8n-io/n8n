import { warnIfPartsIgnored } from "../../Warnings.js";
import { Word, eq, joinWords } from "../../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";
import type { QueryList, QueryDict } from "../../Query.js";
import type { FormParam } from "../../curl/form.js";

import jsescObj from "jsesc";

export const javaScriptSupportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "upload-file",
  "form",
  "form-string",
  "digest",
  "no-digest",
  "next",

  // --no-compressed (the default) is unsupported though
  "compressed",
]);

export const nodeSupportedArgs = new Set([...javaScriptSupportedArgs, "proxy"]);

// https://fetch.spec.whatwg.org/#forbidden-method
export const FORBIDDEN_METHODS = ["CONNECT", "TRACE", "TRACK"];
// https://fetch.spec.whatwg.org/#forbidden-request-header
export const FORBIDDEN_HEADERS = [
  "Accept-Charset",
  "Accept-Encoding",
  "Access-Control-Request-Headers",
  "Access-Control-Request-Method",
  "Connection",
  "Content-Length",
  "Cookie",
  "Cookie2",
  "Date",
  "DNT",
  "Expect",
  "Host",
  "Keep-Alive",
  "Origin",
  "Referer",
  "Set-Cookie",
  "TE",
  "Trailer",
  "Transfer-Encoding",
  "Upgrade",
  "Via",
].map((h) => h.toLowerCase());

// TODO: implement?
export function reprObj(value: object, indentLevel?: number): string {
  const escaped = jsescObj(value, {
    quotes: "single",
    minimal: false,
    compact: false,
    indent: "  ",
    indentLevel: indentLevel ? indentLevel : 0,
  });
  if (typeof value === "string") {
    return "'" + escaped + "'";
  }
  return escaped;
}

export function reprPairs(
  d: [Word, Word][],
  indentLevel = 0,
  indent = "  ",
  list = true,
  imports: JSImports,
): string {
  if (d.length === 0) {
    return list ? "[]" : "{}";
  }

  let code = list ? "[\n" : "{\n";
  for (const [i, [key, value]] of d.entries()) {
    code += indent.repeat(indentLevel + 1);
    if (list) {
      code += "[" + repr(key, imports) + ", " + repr(value, imports) + "]";
    } else {
      code += repr(key, imports) + ": " + repr(value, imports);
    }
    code += i < d.length - 1 ? ",\n" : "\n";
  }
  code += indent.repeat(indentLevel) + (list ? "]" : "}");
  return code;
}
export function reprAsStringToStringDict(
  d: [Word, Word][],
  indentLevel = 0,
  imports: JSImports,
  indent = "  ",
): string {
  return reprPairs(d, indentLevel, indent, false, imports);
}

export function reprAsStringTuples(
  d: [Word, Word][],
  indentLevel = 0,
  imports: JSImports,
  indent = "  ",
): string {
  return reprPairs(d, indentLevel, indent, true, imports);
}

export function reprStringToStringList(
  d: [Word, Word | Word[]][],
  indentLevel = 0,
  imports: JSImports,
  indent = "  ",
  list = true,
): string {
  if (d.length === 0) {
    return list ? "[]" : "{}";
  }

  let code = "{\n";
  for (const [i, [key, value]] of d.entries()) {
    let valueStr;
    if (Array.isArray(value)) {
      valueStr = "[" + value.map((v) => repr(v, imports)).join(", ") + "]";
    } else {
      valueStr = repr(value, imports);
    }

    code += indent.repeat(indentLevel + 1);
    code += repr(key, imports) + ": " + valueStr;
    code += i < d.length - 1 ? ",\n" : "\n";
  }
  code += indent.repeat(indentLevel) + "}";
  return code;
}

// Backtick quotes are not supported
const regexEscape = /'|"|\\|\p{C}|[^ \P{Z}]/gu;
const regexDigit = /[0-9]/;
export function esc(s: string, quote: "'" | '"' = "'"): string {
  return s.replace(regexEscape, (c: string, index: number, string: string) => {
    switch (c[0]) {
      // https://mathiasbynens.be/notes/javascript-escapes#single
      case "\\":
        return "\\\\";
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
      case "'":
      case '"':
        return c === quote ? "\\" + c : c;
      case "\0":
        // \0 is null but \01 is an octal escape
        // if we have ['\0', '1', '2']
        // and we converted it to '\\012', it would be interpreted as octal
        // so it needs to be converted to '\\x0012'
        if (!regexDigit.test(string.charAt(index + 1))) {
          return "\\0";
        }
        break;
    }

    if (c.length === 2) {
      const first = c.charCodeAt(0);
      const second = c.charCodeAt(1);
      return (
        "\\u" +
        first.toString(16).padStart(4, "0") +
        "\\u" +
        second.toString(16).padStart(4, "0")
      );
    }

    const hex = c.charCodeAt(0).toString(16);
    if (hex.length > 2) {
      return "\\u" + hex.padStart(4, "0");
    }
    return "\\x" + hex.padStart(2, "0");
  });
}

export function reprStr(s: string, quote?: "'" | '"'): string {
  if (quote === undefined) {
    quote = "'";
    if (s.includes("'") && !s.includes('"')) {
      quote = '"';
    }
  }
  return quote + esc(s, quote) + quote;
}

export type JSImports = [string, string][];
export function addImport(imports: JSImports, name: string, from: string) {
  // TODO: this is linear
  for (const [n, f] of imports) {
    if (n === name && f === from) return;
  }
  imports.push([name, from]);
}
export function reprImports(imports: JSImports): string {
  let ret = "";
  for (const [name, from] of imports.sort(bySecondElem)) {
    if (name.startsWith("* as")) {
      ret += `import ${name} from ${reprStr(from)};\n`;
    } else {
      ret += `import { ${name} } from ${reprStr(from)};\n`;
    }
  }
  return ret;
}
export function reprImportsRequire(imports: JSImports): string {
  const ret: string[] = [];

  if (imports.length === 0) {
    return "";
  }

  for (const [name, from] of imports.sort(bySecondElem)) {
    if (name.startsWith("* as ")) {
      ret.push(
        `const ${name.slice("* as ".length)} = require(${reprStr(from)});`,
      );
    } else if (name.includes(".")) {
      ret.push(`const ${name} = require(${reprStr(from)}).${name};`);
    } else {
      ret.push(`const ${name} = require(${reprStr(from)});`);
    }
  }
  return ret.join("\n") + "\n";
}

export function repr(w: Word, imports: JSImports): string {
  // Node
  const ret: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      ret.push(reprStr(t));
    } else if (t.type === "variable") {
      ret.push("process.env[" + reprStr(t.value) + "]");
    } else {
      ret.push("execSync(" + reprStr(t.value) + ").stdout");
      addImport(imports, "execSync", "node:child_process");
    }
  }
  return ret.join(" + ");
}

export function reprBrowser(w: Word, warnings: [string, string][]): string {
  const ret: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      ret.push(reprStr(t));
    } else {
      ret.push(reprStr(t.text));
      if (t.type === "variable") {
        warnings.push([
          "browser-has-no-env",
          "Can't access environment variable in browser JS: " +
            JSON.stringify(t.value),
        ]);
      } else {
        warnings.push([
          "browser-has-no-shell",
          "Can't run subcommands in browser JS: " + JSON.stringify(t.value),
        ]);
      }
    }
  }
  return ret.join(" + ");
}

export function reprFetch(
  w: Word,
  isNode: boolean,
  imports: JSImports,
): string {
  if (!isNode) {
    // TODO: warn
    return reprStr(w.toString());
  }
  return repr(w, imports);
}

export function asParseFloat(w: Word, imports: JSImports): string {
  if (w.isString()) {
    const originalValue = w.toString();
    // TODO: reimplement curl's float parsing instead of parseFloat()
    const asFloat = parseFloat(originalValue);
    if (!isNaN(asFloat)) {
      return originalValue;
    }
  }
  return "parseFloat(" + repr(w, imports) + ")";
}
export function asParseFloatTimes1000(w: Word, imports: JSImports): string {
  if (w.isString()) {
    const originalValue = w.toString();
    // TODO: reimplement curl's float parsing instead of parseFloat()
    // TODO: check overflow
    const asFloat = parseFloat(originalValue) * 1000;
    if (!isNaN(asFloat)) {
      return asFloat.toString();
    }
  }
  return "parseFloat(" + repr(w, imports) + ") * 1000";
}
export function asParseInt(w: Word, imports: JSImports): string {
  if (w.isString()) {
    const originalValue = w.toString();
    // TODO: reimplement curl's int parsing instead of parseInt()
    const asInt = parseInt(originalValue);
    if (!isNaN(asInt)) {
      return originalValue;
    }
  }
  return "parseInt(" + repr(w, imports) + ")";
}

export function bySecondElem(a: [string, string], b: [string, string]): number {
  return a[1].localeCompare(b[1]);
}

export function toURLSearchParams(
  query: [QueryList, QueryDict | null | undefined],
  imports: JSImports,
  indent = 1,
): string {
  const [queryList, queryDict] = query;
  const queryObj =
    queryDict && queryDict.every((q) => !Array.isArray(q[1]))
      ? reprAsStringToStringDict(queryDict as [Word, Word][], indent, imports)
      : reprAsStringTuples(queryList, indent, imports);
  return "new URLSearchParams(" + queryObj + ")";
}

export function toDictOrURLSearchParams(
  query: [QueryList, QueryDict | null | undefined],
  imports: JSImports,
  indent = 1,
): string {
  const [queryList, queryDict] = query;

  if (queryDict && queryDict.every((v) => !Array.isArray(v[1]))) {
    return reprAsStringToStringDict(
      queryDict as [Word, Word][],
      indent,
      imports,
    );
  }

  return (
    "new URLSearchParams(" +
    reprAsStringTuples(queryList, indent, imports) +
    ")"
  );
}

export function toFormData(
  multipartUploads: FormParam[],
  imports: JSImports,
  fetchImports: Set<string>,
  warnings: Warnings,
  isNode = true,
): string {
  let code = "new FormData();\n";
  for (const m of multipartUploads) {
    // TODO: use .set() if all names are unique?
    code += "form.append(" + reprFetch(m.name, isNode, imports) + ", ";
    if ("contentFile" in m) {
      if (isNode) {
        if (eq(m.contentFile, "-")) {
          addImport(imports, "* as fs", "fs");
          code += "fs.readFileSync(0).toString()";
          if (m.filename) {
            code += ", " + reprFetch(m.filename, isNode, imports);
          }
        } else {
          fetchImports.add("fileFromSync");
          // TODO: do this in a way that doesn't set filename="" if we don't have filename
          code +=
            "fileFromSync(" + reprFetch(m.contentFile, isNode, imports) + ")";
        }
      } else {
        // TODO: does the second argument get sent as filename="" ?
        code +=
          "File(['<data goes here>'], " +
          reprFetch(m.contentFile, isNode, imports) +
          ")";
        // TODO: (massive todo) we could read the file if we're running in the command line
        warnings.push([
          "--form",
          "you can't read a file for --form/-F in the browser",
        ]);
      }
    } else {
      code += reprFetch(m.content, isNode, imports);
    }
    code += ");\n";
  }
  return code;
}

function getDataString(
  request: Request,
  data: Word,
  isNode: boolean,
  imports: JSImports,
): [string, string | null] {
  const originalStringRepr = reprFetch(data, isNode, imports);

  const contentType = request.headers.getContentType();
  if (contentType === "application/json") {
    try {
      const dataStr = data.toString();
      const parsed = JSON.parse(dataStr);
      // Only bother for arrays and {}
      if (typeof parsed !== "object" || parsed === null) {
        return [originalStringRepr, null];
      }
      const roundtrips = JSON.stringify(parsed) === dataStr;
      const jsonAsJavaScript = reprObj(parsed, 1);

      const dataString = "JSON.stringify(" + jsonAsJavaScript + ")";
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
        return [toURLSearchParams([queryList, queryDict], imports), null];
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
      return getDataString(request, request.dataArray[0], isNode, imports);
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
        parts.push(reprFetch(name, isNode, imports));
      }
      // TODO: use the filetype
      if (eq(filename, "-")) {
        if (isNode) {
          addImport(imports, "* as fs", "fs");
          parts.push("fs.readFileSync(0" + encoding + ")");
        } else {
          // TODO: something else
          // TODO: warn that file needs content
          parts.push("new File([/* contents */], '<stdin>')");
        }
      } else {
        if (isNode) {
          addImport(imports, "* as fs", "fs");
          parts.push(
            "fs.readFileSync(" +
              reprFetch(filename, isNode, imports) +
              encoding +
              ")",
          );
        } else {
          // TODO: warn that file needs content
          parts.push(
            "new File([/* contents */], " +
              reprFetch(filename, isNode, imports) +
              ")",
          );
        }
      }
    }
  }

  if (parts.length === 0) {
    return ["''", null];
  }

  if (parts.length === 1) {
    return [parts[0], null];
  }

  let [start, joiner, end] = ["new ArrayBuffer(", ", ", ")"];
  const totalLength = parts.reduce((a, b) => a + b.length, 0);
  if (totalLength > 80) {
    start += "\n    ";
    joiner = ",\n    ";
    end = "\n  )";
  }
  return [start + parts.join(joiner) + end, null];
}

function requestToJavaScriptOrNode(
  request: Request,
  warnings: Warnings,
  fetchImports: Set<string>,
  imports: JSImports,
  isNode: boolean,
): string {
  warnIfPartsIgnored(request, warnings, {
    multipleUrls: true,
    dataReadsFile: true,
    // Not actually supported, just warned per-URL
    queryReadsFile: true,
  });

  let code = "";

  if (request.multipartUploads) {
    if (isNode) {
      // TODO: remove once Node 16 is EOL'd on 2023-09-11
      fetchImports.add("FormData");
    }
    code +=
      "const form = " +
      toFormData(
        request.multipartUploads,
        imports,
        fetchImports,
        warnings,
        isNode,
      );
    code += "\n";
  }

  // Can delete content-type header
  const [dataString, commentedOutDataString] = getData(
    request,
    isNode,
    imports,
  );

  let fn = "fetch";
  if (request.urls[0].auth && request.authType === "digest") {
    // TODO: if 'Authorization:' header is specified, don't set this
    const [user, password] = request.urls[0].auth;
    addImport(imports, "* as DigestFetch", "digest-fetch");
    code +=
      "const client = new DigestFetch(" +
      reprFetch(user, isNode, imports) +
      ", " +
      reprFetch(password, isNode, imports) +
      ");\n";
    fn = "client.fetch";
  }

  for (const urlObj of request.urls) {
    code += fn + "(" + reprFetch(urlObj.url, isNode, imports);
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
    const method = urlObj.method.toLowerCase();
    const methodStr = urlObj.method.toString();
    if (method.isString() && FORBIDDEN_METHODS.includes(methodStr)) {
      warnings.push([
        "forbidden-method",
        "the method " +
          JSON.stringify(methodStr) +
          " is not allowed in fetch()",
      ]);
    }

    let optionsCode = "";
    if (!eq(method, "get")) {
      // TODO: If you pass a weird method to fetch() it won't uppercase it
      // const methods = []
      // const method = methods.includes(request.method.toLowerCase()) ? request.method.toUpperCase() : request.method
      optionsCode +=
        "  method: " + reprFetch(urlObj.method, isNode, imports) + ",\n";
    }
    if (
      request.headers.length ||
      (urlObj.auth && request.authType === "basic")
    ) {
      optionsCode += "  headers: {\n";
      for (const [headerName, headerValue] of request.headers) {
        optionsCode +=
          "    " +
          reprFetch(headerName, isNode, imports) +
          ": " +
          reprFetch(headerValue || new Word(), isNode, imports) +
          ",\n";
        if (
          !isNode &&
          headerName.isString() &&
          FORBIDDEN_HEADERS.includes(headerName.toString().toLowerCase())
        ) {
          warnings.push([
            "forbidden-header",
            JSON.stringify(headerName.toString()) +
              " header is forbidden in fetch()",
          ]);
        }
      }
      if (urlObj.auth && request.authType === "basic") {
        // TODO: if -H 'Authorization:' is passed, don't set this
        optionsCode +=
          "    'Authorization': 'Basic ' + btoa(" +
          reprFetch(joinWords(urlObj.auth, ":"), isNode, imports) +
          "),\n";
      }

      if (optionsCode.endsWith(",\n")) {
        optionsCode = optionsCode.slice(0, -2);
        optionsCode += "\n";
      }
      optionsCode += "  },\n";
    }

    if (urlObj.uploadFile) {
      if (isNode) {
        fetchImports.add("fileFromSync");
        optionsCode +=
          "  body: fileFromSync(" +
          reprFetch(urlObj.uploadFile, isNode, imports) +
          "),\n";
      } else {
        optionsCode +=
          "  body: File(['<data goes here>'], " +
          reprFetch(urlObj.uploadFile, isNode, imports) +
          "),\n";
        warnings.push([
          "--form",
          "you can't read a file for --upload-file/-F in the browser",
        ]);
      }
    } else if (request.multipartUploads) {
      optionsCode += "  body: form,\n";
    } else if (request.data) {
      if (commentedOutDataString) {
        optionsCode += "  // body: " + commentedOutDataString + ",\n";
      }
      optionsCode += "  body: " + dataString + ",\n";
    }

    if (isNode && request.proxy) {
      // TODO: do this parsing in utils.ts
      const proxy = request.proxy.includes("://")
        ? request.proxy
        : request.proxy.prepend("http://");
      // TODO: could be more accurate
      let [protocol] = proxy.split("://", 2);
      protocol = protocol.toLowerCase();

      if (!protocol.toBool()) {
        protocol = new Word("http");
      }
      if (eq(protocol, "socks")) {
        protocol = new Word("socks4");
        proxy.replace(/^socks/, "socks4");
      }

      if (
        eq(protocol, "socks4") ||
        eq(protocol, "socks5") ||
        eq(protocol, "socks5h") ||
        eq(protocol, "socks4a")
      ) {
        addImport(imports, "{ SocksProxyAgent }", "socks-proxy-agent");
        optionsCode +=
          "  agent: new SocksProxyAgent(" +
          reprFetch(proxy, isNode, imports) +
          "),\n";
      } else if (eq(protocol, "http") || eq(protocol, "https")) {
        addImport(imports, "HttpsProxyAgent", "https-proxy-agent");
        optionsCode +=
          "  agent: new HttpsProxyAgent(" +
          reprFetch(proxy, isNode, imports) +
          "),\n";
      } else {
        warnings.push([
          "--proxy",
          "failed to parse --proxy/-x or unknown protocol: " + protocol,
        ]);
        // or this?
        //   throw new CCError('Unsupported proxy scheme for ' + reprFetch(request.proxy))
      }
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

export function _toJavaScriptOrNode(
  requests: Request[],
  warnings: Warnings,
  isNode: boolean,
): string {
  const fetchImports = new Set<string>();
  const imports: JSImports = [];

  const code = requests
    .map((r) =>
      requestToJavaScriptOrNode(r, warnings, fetchImports, imports, isNode),
    )
    .join("\n");

  let importCode = "";
  if (isNode) {
    importCode += "import fetch";
    if (fetchImports.size) {
      importCode += ", { " + Array.from(fetchImports).sort().join(", ") + " }";
    }
    importCode += " from 'node-fetch';\n";
  }
  if (imports.length) {
    for (const [varName, imp] of Array.from(imports).sort(bySecondElem)) {
      // TODO: check this
      importCode += "import " + varName + " from " + reprStr(imp) + ";\n";
    }
  }

  if (importCode) {
    return importCode + "\n" + code;
  }
  return code;
}

export function _toJavaScript(
  requests: Request[],
  warnings: Warnings = [],
): string {
  return _toJavaScriptOrNode(requests, warnings, false);
}
export function _toNode(requests: Request[], warnings: Warnings = []): string {
  return _toJavaScriptOrNode(requests, warnings, true);
}

export function toJavaScriptWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, javaScriptSupportedArgs, warnings);
  return [_toJavaScript(requests, warnings), warnings];
}
export function toJavaScript(curlCommand: string | string[]): string {
  const [result] = toJavaScriptWarn(curlCommand);
  return result;
}

export function toNodeWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, nodeSupportedArgs, warnings);
  return [_toNode(requests, warnings), warnings];
}
export function toNode(curlCommand: string | string[]): string {
  return toNodeWarn(curlCommand)[0];
}
