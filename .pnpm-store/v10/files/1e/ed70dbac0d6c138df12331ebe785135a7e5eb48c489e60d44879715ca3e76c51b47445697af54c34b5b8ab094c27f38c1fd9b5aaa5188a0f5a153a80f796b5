import { CCError, has } from "../../utils.js";
import { warnIfPartsIgnored } from "../../Warnings.js";
import { Word, eq } from "../../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString, type QueryDict } from "../../Query.js";

// https://ruby-doc.org/stdlib-2.7.0/libdoc/net/http/rdoc/Net/HTTP.html
// https://github.com/ruby/net-http/tree/master/lib/net
// https://github.com/augustl/net-http-cheat-sheet

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "http0.9",
  "http1.0",
  "http1.1",
  "insecure",
  "no-digest",
  "no-http0.9",
  "no-insecure",
  "output",
  "proxy",
  "proxy-user",
  "upload-file",
  "next",
]);

// https://docs.ruby-lang.org/en/3.1/syntax/literals_rdoc.html#label-Strings
const regexSingleEscape = /'|\\/gu;
const regexDoubleEscape = /"|\\|\p{C}|[^ \P{Z}]|#[{@$]/gu;
const regexCurlyEscape = /\}|\\|\p{C}|[^ \P{Z}]|#[{@$]/gu; // TODO: escape { ?
const regexDigit = /[0-9]/;
export function reprStr(s: string, quote?: "'" | '"' | "{}"): string {
  if (quote === undefined) {
    quote = "'";
    if (s.match(/\p{C}|[^ \P{Z}]/gu) || (s.includes("'") && !s.includes('"'))) {
      quote = '"';
    }
  }
  const regexEscape =
    quote === "'"
      ? regexSingleEscape
      : quote === '"'
        ? regexDoubleEscape
        : regexCurlyEscape;

  const startQuote = quote[0];
  const endQuote = quote === "{}" ? quote[1] : quote[0];

  return (
    startQuote +
    s.replace(regexEscape, (c: string, index: number, string: string) => {
      switch (c[0]) {
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
        case "\x1B":
          return "\\e";
        case "\\":
          return "\\\\";
        case "'":
          return "\\'";
        case '"':
          return '\\"';
        case "#":
          return "\\" + c;
        case "}":
          return "\\}";
        case "\0":
          // \0 is null but \01 would be an octal escape
          if (!regexDigit.test(string.charAt(index + 1))) {
            return "\\0";
          }
          break;
      }

      const codePoint = c.codePointAt(0) as number;
      const hex = codePoint.toString(16);
      if (hex.length <= 2 && codePoint < 0x7f) {
        return "\\x" + hex.padStart(2, "0");
      }
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
      }
      return "\\u{" + hex + "}";
    }) +
    endQuote
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
      args.push("%x" + reprStr(t.value, "{}"));
    }
  }
  return args.join(" + ");
}

// https://gist.github.com/misfo/1072693 but simplified
function validSymbol(s: Word): boolean {
  // TODO: can also start with @ $ and end with ! = ? are those special?
  return s.isString() && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s.toString());
}

export function reprSymbol(s: Word): string {
  if (!validSymbol(s)) {
    return repr(s);
  }
  return s.toString();
}

export function objToRuby(
  obj: Word | Word[] | string | number | boolean | object | null,
  indent = 0,
): string {
  if (obj instanceof Word) {
    return repr(obj);
  }
  switch (typeof obj) {
    case "string":
      return reprStr(obj);
    case "number":
      return obj.toString();
    case "boolean":
      return obj ? "true" : "false";
    case "object":
      if (obj === null) {
        return "nil";
      }
      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          return "[]";
        } else {
          let s = "[\n";
          for (const [i, item] of obj.entries()) {
            s += " ".repeat(indent + 2) + objToRuby(item, indent + 2);
            s += i === obj.length - 1 ? "\n" : ",\n";
          }
          s += " ".repeat(indent) + "]";
          return s;
        }
      } else {
        if (Object.keys(obj).length === 0) {
          return "{}";
        }
        let s = "{\n";
        const objEntries = Object.entries(obj);
        for (const [i, [k, v]] of objEntries.entries()) {
          // reprStr() because JSON keys must be strings.
          s +=
            " ".repeat(indent + 2) +
            reprStr(k) +
            " => " +
            objToRuby(v, indent + 2);
          s += i === objEntries.length - 1 ? "\n" : ",\n";
        }
        s += " ".repeat(indent) + "}";
        return s;
      }
    default:
      throw new CCError(
        "unexpected object type that shouldn't appear in JSON: " + typeof obj,
      );
  }
}

export function queryToRubyDict(q: QueryDict, indent = 0) {
  if (q.length === 0) {
    return "{}";
  }

  let s = "{\n";
  for (const [i, [k, v]] of q.entries()) {
    s += " ".repeat(indent + 2) + repr(k) + " => " + objToRuby(v, indent + 2);
    s += i === q.length - 1 ? "\n" : ",\n";
  }
  s += " ".repeat(indent) + "}";
  return s;
}

export function getDataString(request: Request): [string, boolean] {
  if (!request.data) {
    return ["", false];
  }

  if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    const { filetype, filename } = request.dataArray[0];

    if (eq(filename, "-")) {
      if (filetype === "binary") {
        // TODO: read stdin in binary
        // https://ruby-doc.org/core-2.3.0/IO.html#method-i-binmode
        // TODO: .delete("\\r\\n") ?
        return ['req.body = STDIN.read.delete("\\n")\n', false];
      } else {
        return ['req.body = STDIN.read.delete("\\n")\n', false];
      }
    }

    switch (filetype) {
      case "binary":
        return [
          // TODO: What's the difference between binread() and read()?
          // TODO: .delete("\\r\\n") ?
          "req.body = File.binread(" + repr(filename) + ').delete("\\n")\n',
          false,
        ];
      case "data":
      case "json":
        return [
          "req.body = File.read(" + repr(filename) + ').delete("\\n")\n',
          false,
        ];
      case "urlencode":
        // TODO: urlencode
        return [
          "req.body = File.read(" + repr(filename) + ').delete("\\n")\n',
          false,
        ];
    }
  }

  const contentTypeHeader = request.headers.get("content-type");
  const isJson =
    contentTypeHeader &&
    eq(contentTypeHeader.split(";")[0].trim(), "application/json");
  if (isJson && request.data.isString()) {
    try {
      const dataAsStr = request.data.toString();
      const dataAsJson = JSON.parse(dataAsStr);
      if (typeof dataAsJson === "object" && dataAsJson !== null) {
        // TODO: we actually want to know how it's serialized by Ruby's builtin
        // JSON formatter but this is hopefully good enough.
        const roundtrips = JSON.stringify(dataAsJson) === dataAsStr;
        let code = "";
        if (!roundtrips) {
          code += "# The object won't be serialized exactly like this\n";
          code += "# req.body = " + repr(request.data) + "\n";
        }
        code += "req.body = " + objToRuby(dataAsJson) + ".to_json\n";
        return [code, true];
      }
    } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, queryAsDict] = parseQueryString(request.data);
  if (!request.isDataBinary && queryAsDict) {
    // If the original request contained %20, Ruby will encode them as "+"
    return ["req.set_form_data(" + queryToRubyDict(queryAsDict) + ")\n", false];
  }

  return ["req.body = " + repr(request.data) + "\n", false];
}

export function getFilesString(request: Request): string {
  if (!request.multipartUploads) {
    return "";
  }

  const multipartUploads = request.multipartUploads.map((m) => {
    // https://github.com/psf/requests/blob/2d5517682b3b38547634d153cea43d48fbc8cdb5/requests/models.py#L117
    //
    // net/http's multipart syntax looks like this:
    // [[name, file, {filename: filename}]]
    const name = repr(m.name); // TODO: what if name is empty string?
    const sentFilename = "filename" in m && m.filename && repr(m.filename);
    if ("contentFile" in m) {
      if (eq(m.contentFile, "-")) {
        if (request.stdinFile) {
          return [
            name,
            "File.open(" + repr(request.stdinFile) + ")",
            sentFilename,
          ];
        } else if (request.stdin) {
          return [name, repr(request.stdin), sentFilename];
        }
        // TODO: does this work?
        return [name, "STDIN", sentFilename];
      } else if (m.contentFile === m.filename) {
        // TODO: curl will look at the file extension to determine each content-type
        return [name, "File.open(" + repr(m.contentFile) + ")"];
      }
      return [name, "File.open(" + repr(m.contentFile) + ")", sentFilename];
    }
    return [name, repr(m.content), sentFilename];
  });

  let filesString = "req.set_form(\n";
  if (multipartUploads.length === 0) {
    filesString += "  [],\n";
  } else {
    filesString += "  [\n";
    for (const [i, [name, content, filename]] of multipartUploads.entries()) {
      filesString += "    [\n";
      filesString += "      " + name + ",\n";
      filesString += "      " + content;
      if (typeof filename === "string") {
        filesString += ",\n";
        filesString += "      {filename: " + filename + "}\n";
      } else {
        filesString += "\n";
      }
      if (i === multipartUploads.length - 1) {
        filesString += "    ]\n";
      } else {
        filesString += "    ],\n";
      }
    }
    filesString += "  ],\n";
  }
  // TODO: what if there's other stuff in the content type?
  filesString += "  'multipart/form-data'\n";
  // TODO: charset
  filesString += ")\n";

  return filesString;
}

function requestToRuby(
  request: Request,
  warnings: Warnings,
  imports: Set<string>,
): string {
  warnIfPartsIgnored(request, warnings, { dataReadsFile: true });
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

  let code = "";

  const methods = {
    GET: "Get",
    HEAD: "Head",
    POST: "Post",
    PATCH: "Patch",
    PUT: "Put",
    PROPPATCH: "Proppatch",
    LOCK: "Lock",
    UNLOCK: "Unlock",
    OPTIONS: "Options",
    PROPFIND: "Propfind",
    DELETE: "Delete",
    MOVE: "Move",
    COPY: "Copy",
    MKCOL: "Mkcol",
    TRACE: "Trace",
  };

  if (
    request.urls[0].queryDict &&
    request.urls[0].queryDict.every((q) => validSymbol(q[0]))
  ) {
    code += "uri = URI(" + repr(request.urls[0].urlWithoutQueryList) + ")\n";
    code += "params = {\n";
    for (const [key, value] of request.urls[0].queryDict) {
      // TODO: warn that %20 becomes +
      code += "  :" + key.toString() + " => " + objToRuby(value, 2) + ",\n";
    }
    code += "}\n";
    code += "uri.query = URI.encode_www_form(params)\n\n";
  } else {
    code += "uri = URI(" + repr(request.urls[0].url) + ")\n";
  }

  const simple = !(
    request.headers.length ||
    request.urls[0].auth ||
    request.multipartUploads ||
    request.data ||
    request.urls[0].uploadFile ||
    request.insecure ||
    request.proxy ||
    request.urls[0].output
  );
  const method = request.urls[0].method;
  if (method.isString() && has(methods, method.toString())) {
    if (method.toString() === "GET" && simple) {
      code += "res = Net::HTTP.get_response(uri)\n";
      return code;
    } else {
      code += "req = Net::HTTP::" + methods[method.toString()] + ".new(uri)\n";
    }
  } else {
    code +=
      "req = Net::HTTPGenericRequest.new(" +
      repr(request.urls[0].method) +
      ", true, true, uri)\n";
  }

  if (request.urls[0].auth && request.authType === "basic") {
    code +=
      "req.basic_auth " +
      repr(request.urls[0].auth[0]) +
      ", " +
      repr(request.urls[0].auth[1]) +
      "\n";
  }

  let reqBody;
  if (request.urls[0].uploadFile) {
    if (
      eq(request.urls[0].uploadFile, "-") ||
      eq(request.urls[0].uploadFile, ".")
    ) {
      reqBody = "req.body = STDIN.read\n";
    } else {
      reqBody =
        "req.body = File.read(" + repr(request.urls[0].uploadFile) + ")\n";
    }
  } else if (request.multipartUploads) {
    reqBody = getFilesString(request);
    request.headers.delete("content-type");
  } else if (request.data) {
    let importJson = false;
    [reqBody, importJson] = getDataString(request);
    if (importJson) {
      imports.add("json");
    }
  }

  const contentType = request.headers.get("content-type");
  if (contentType !== null && contentType !== undefined) {
    // If the content type has stuff after the content type, like
    // application/x-www-form-urlencoded; charset=UTF-8
    // then we generate misleading code here because the charset won't be sent.
    code += "req.content_type = " + repr(contentType) + "\n";
    request.headers.delete("content-type");
  }
  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (
        ["accept-encoding", "content-length"].includes(
          headerName.toLowerCase().toString(),
        )
      ) {
        code += "# ";
      }
      // TODO: nil?
      code +=
        "req[" +
        repr(headerName) +
        "] = " +
        repr(headerValue ?? new Word("nil")) +
        "\n";
    }
  }

  if (reqBody) {
    code += "\n" + reqBody;
  }

  code += "\n";
  if (request.proxy) {
    const proxy = request.proxy.includes("://")
      ? request.proxy
      : request.proxy.prepend("http://");
    code += "proxy = URI(" + repr(proxy) + ")\n";
  }
  code += "req_options = {\n";
  code += "  use_ssl: uri.scheme == 'https'";
  if (request.insecure) {
    imports.add("openssl");
    code += ",\n";
    code += "  verify_mode: OpenSSL::SSL::VERIFY_NONE\n";
  } else {
    code += "\n";
  }
  code += "}\n";
  if (!request.proxy) {
    code +=
      "res = Net::HTTP.start(uri.hostname, uri.port, req_options) do |http|\n";
  } else {
    if (request.proxyAuth) {
      const [proxyUser, proxyPassword] = request.proxyAuth.split(":", 2);
      code +=
        "res = Net::HTTP.start(uri.hostname, uri.port, proxy.hostname, proxy.port, " +
        repr(proxyUser) +
        ", " +
        repr(proxyPassword || "") +
        ", req_options) do |http|\n";
    } else {
      code +=
        "res = Net::HTTP.new(uri.hostname, uri.port, proxy.hostname, proxy.port, req_options).start do |http|\n";
    }
  }
  code += "  http.request(req)\n";
  code += "end";

  if (request.urls[0].output && !eq(request.urls[0].output, "/dev/null")) {
    if (eq(request.urls[0].output, "-")) {
      code += "\nputs res.body";
    } else {
      code += "\nFile.write(" + repr(request.urls[0].output) + ", res.body)";
    }
  }

  return code + "\n";
}

export function _toRuby(requests: Request[], warnings: Warnings = []): string {
  const imports = new Set<string>();

  const code = requests
    .map((r) => requestToRuby(r, warnings, imports))
    .join("\n\n");

  let prelude = "require 'net/http'\n";
  for (const imp of Array.from(imports).sort()) {
    prelude += "require '" + imp + "'\n";
  }
  return prelude + "\n" + code;
}

export function toRubyWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const ruby = _toRuby(requests, warnings);
  return [ruby, warnings];
}

export function toRuby(curlCommand: string | string[]): string {
  return toRubyWarn(curlCommand)[0];
}
