import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([...COMMON_SUPPORTED_ARGS, "max-time"]);

// https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/
const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string): string => {
      switch (c) {
        case "\x00":
          return "\\0";
        case "\\":
          return "\\\\";
        case "\t":
          return "\\t";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case '"':
          return '\\"';
      }
      const hex = (c.codePointAt(0) as number).toString(16);
      return "\\u{" + hex + "}";
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
      args.push(
        "(ProcessInfo.processInfo.environment[" + reprStr(t.value) + '] ?? "")',
      );
    } else {
      args.push("exec(" + reprStr(t.value) + ")");
      // TODO: add exec()
    }
  }
  return args.join(" + ");
}

function reprJson(data: any, indent = 0): string {
  if (typeof data === "string") {
    return reprStr(data);
  } else if (typeof data === "number") {
    return data.toString();
  } else if (typeof data === "boolean") {
    return data ? "true" : "false";
  } else if (data === null) {
    return "nil";
  } else if (Array.isArray(data)) {
    if (data.length === 0) {
      return "[]";
    }
    let code = "[\n";
    for (const item of data) {
      code += "    ".repeat(indent + 1) + reprJson(item, indent + 1) + ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "    ".repeat(indent) + "]";
    return code;
  } else if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return "[:]";
    }
    let code = "[\n";
    for (const [key, value] of entries) {
      code +=
        "    ".repeat(indent + 1) +
        reprStr(key) +
        ": " +
        reprJson(value, indent + 1) +
        ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "    ".repeat(indent) + "]";
    return code;
  } else {
    throw new Error("Unsupported JSON type: " + typeof data);
  }
}

function formatData(request: Request, data: Word): [string, string] {
  const contentType = request.headers.getContentType();
  if (contentType === "application/x-www-form-urlencoded" && data.isString()) {
    const [first, ...rest] = data.split("&");
    let code =
      "let data = NSMutableData(data: " +
      repr(first) +
      ".data(using: .utf8)!)\n";
    for (const part of rest) {
      code +=
        "data.append(" +
        repr(mergeWords("&", part)) +
        ".data(using: .utf8)!)\n";
    }
    return [code, "request.httpBody = data as Data\n"];
  } else if (contentType === "application/json" && data.isString()) {
    const dataStr = data.toString();
    let parsed;
    try {
      parsed = JSON.parse(dataStr);
      const roundtrips = JSON.stringify(parsed) === dataStr;
      // Only convert arrays and {} to Swift types
      if (
        Array.isArray(parsed) ||
        (typeof parsed === "object" && parsed !== null)
      ) {
        let code = "";
        code += "let jsonData = " + reprJson(parsed);
        if (Array.isArray(parsed)) {
          // TODO: narrow type
          code += " as [Any]\n";
        } else {
          code += " as [String : Any]\n";
        }

        code +=
          "let data = try! JSONSerialization.data(withJSONObject: jsonData, options: [])\n";
        if (!roundtrips) {
          code += "// let data = " + repr(data) + ".data(using: .utf8)\n";
        }
        return [code, "request.httpBody = data as Data\n"];
      }
    } catch {}
  }
  return ["", "request.httpBody = " + repr(data) + ".data(using: .utf8)\n"];
}

export function _toSwift(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);

  let code = "import Foundation\n\n";

  let dataCode, dataArgCode;
  if (request.data) {
    [dataCode, dataArgCode] = formatData(request, request.data);
    if (dataCode) {
      code += dataCode + "\n";
    }
  }

  code += "let url = URL(string: " + repr(request.urls[0].url) + ")!\n";
  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    code += "\n";
    code += "let username = " + repr(username) + "\n";
    code += "let password = " + repr(password) + "\n";
    code +=
      'let loginString = String(format: "\\(username):\\(password)", username, password)\n';
    code += "let loginData = loginString.data(using: String.Encoding.utf8)!\n";
    code += "let base64LoginString = loginData.base64EncodedString()\n";
    code += "\n";
  }
  if (request.headers.length || request.urls[0].auth) {
    code += "let headers = [\n";
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }
      code += "    " + repr(headerName) + ": " + repr(headerValue) + ",\n";
    }
    if (request.urls[0].auth) {
      const authHeader = request.headers.lowercase
        ? "authorization"
        : "Authorization";
      code += '    "' + authHeader + '": "Basic \\(base64LoginString)",\n';
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2) + "\n";
    }
    code += "]\n";
  }
  code += "\n";

  code += "var request = URLRequest(url: url";
  if (request.timeout && !eq(request.timeout, "60.0")) {
    // TODO: must be double?
    code += ", timeoutInterval: " + request.timeout.toString();
  }
  code += ")\n";

  if (!eq(request.urls[0].method, "GET")) {
    code += "request.httpMethod = " + repr(request.urls[0].method) + "\n";
  }

  if (request.headers.length) {
    code += "request.allHTTPHeaderFields = headers\n";
  }

  if (dataArgCode) {
    code += dataArgCode;
  }

  code += "\n";
  code +=
    "let task = URLSession.shared.dataTask(with: request) { (data, response, error) in\n";
  code += "    if let error = error {\n";
  code += "        print(error)\n";
  code += "    } else if let data = data {\n";
  code += "        let str = String(data: data, encoding: .utf8)\n";
  code += '        print(str ?? "")\n';
  code += "    }\n";
  code += "}\n";
  code += "\n";
  code += "task.resume()\n";

  return code;
}

export function toSwiftWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toSwift(requests, warnings);
  return [code, warnings];
}
export function toSwift(curlCommand: string | string[]): string {
  return toSwiftWarn(curlCommand)[0];
}
