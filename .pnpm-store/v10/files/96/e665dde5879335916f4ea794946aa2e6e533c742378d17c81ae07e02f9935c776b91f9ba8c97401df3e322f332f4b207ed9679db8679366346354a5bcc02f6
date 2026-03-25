import { Word, eq, joinWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

import { reprStr as pyreprStr } from "./python/python.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  // "form",
  // "form-string",
]);

function reprStr(s: string): string {
  if (s.includes('"') && !s.includes("'")) {
    return pyreprStr(s, "'");
  }
  return pyreprStr(s, '"');
}
function repr(w: Word): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      args.push("os.getenv(" + reprStr(t.value) + ")");
    } else {
      args.push("io.popen(" + reprStr(t.value) + '):read("*a")');
    }
  }
  return args.join(" .. ");
}

// http://lua-users.org/wiki/TablesTutorial
const VALID_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function reprKey(key: Word | string): string {
  if (key instanceof Word) {
    if (key.isString() && VALID_KEY.test(key.toString())) {
      return key.toString();
    }
    return "[" + repr(key) + "]";
  }
  if (VALID_KEY.test(key)) {
    return key;
  }
  return "[" + reprStr(key) + "]";
}

function jsonToLua(data: any, indent = 0): string {
  if (typeof data === "string") {
    return reprStr(data);
  }
  if (typeof data === "number") {
    return data.toString();
  }
  if (typeof data === "boolean") {
    return data ? "true" : "false";
  }
  if (data === null) {
    return "nil";
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return "{}";
    }
    let code = "{\n";
    for (const item of data) {
      code += "\t".repeat(indent + 1) + jsonToLua(item, indent + 1) + ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "\t".repeat(indent) + "}";
    return code;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      // TODO: not correct https://github.com/rxi/json.lua/issues/23
      return "{}";
    }
    let code = "{\n";
    for (const [key, value] of entries) {
      code +=
        "\t".repeat(indent + 1) +
        reprKey(key) +
        " = " +
        jsonToLua(value, indent + 1) +
        ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "\t".repeat(indent) + "}";
    return code;
  } else {
    throw new Error("Unsupported JSON type: " + typeof data);
  }
}

export function _toLua(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);

  const imports: Set<string> = new Set(["http"]);

  let code = "";
  code += "local body, code, headers, status = http.request";

  if (
    eq(request.urls[0].method, "GET") &&
    !request.data &&
    !request.headers.length &&
    !request.urls[0].auth
  ) {
    code += "(" + repr(request.urls[0].originalUrl) + ")\n";
  } else if (
    eq(request.urls[0].method, "POST") &&
    request.data &&
    !request.urls[0].auth &&
    request.headers.length === 1 &&
    request.headers.has("content-type") &&
    eq(request.headers.get("content-type"), "application/x-www-form-urlencoded")
  ) {
    code += "(\n";
    code += "\t" + repr(request.urls[0].originalUrl) + "\n";
    code += "\t" + repr(request.data) + "\n";
    code += ")\n";
  } else {
    code += "{\n";
    if (!eq(request.urls[0].method, "GET")) {
      code += "\tmethod = " + repr(request.urls[0].method) + ",\n";
    }
    code += "\turl = " + repr(request.urls[0].originalUrl) + ",\n";

    if (request.data) {
      code += "\tsource = ltn12.source.string(";
      if (
        request.headers.getContentType() === "application/json" &&
        request.data.isString()
      ) {
        try {
          code +=
            "json.encode(" +
            jsonToLua(JSON.parse(request.data.toString()), 1) +
            ")";
          imports.add("json");
        } catch (e) {
          code += repr(request.data);
        }
      } else {
        code += repr(request.data);
      }
      code += "),\n";
      imports.add("ltn12");
    }

    if (request.headers.length > 0 || request.urls[0].auth) {
      code += "\theaders = {\n";
      for (const [name, value] of request.headers) {
        if (value === null) {
          continue;
        }
        code += "\t\t" + reprKey(name) + " = " + repr(value) + ",\n";
      }
      if (request.urls[0].auth) {
        code +=
          '\t\tauthentication = "Basic " .. (mime.b64(' +
          repr(joinWords(request.urls[0].auth, ":")) +
          ")),\n";
        imports.add("mime");
      }
      if (code.endsWith(",\n")) {
        code = code.slice(0, -2) + "\n";
      }
      code += "\t},\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }

    // code += "\tsink = ltn12.sink.table(respbody)\n";

    code += "}\n";
  }

  let importCode = "";
  if (imports.size) {
    for (const imp of Array.from(imports).sort()) {
      if (imp === "http") {
        importCode += 'local http = require("socket.http")\n';
      } else {
        importCode += "local " + imp + ' = require("' + imp + '")\n';
      }
    }
  }

  return importCode + "\n" + code;
}

export function toLuaWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const lua = _toLua(requests, warnings);
  return [lua, warnings];
}
export function toLua(curlCommand: string | string[]): string {
  return toLuaWarn(curlCommand)[0];
}
