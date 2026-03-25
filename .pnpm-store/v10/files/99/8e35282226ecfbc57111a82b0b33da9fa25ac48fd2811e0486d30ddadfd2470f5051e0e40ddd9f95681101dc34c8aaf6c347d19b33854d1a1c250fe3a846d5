import { Word, eq, mergeWords } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";

import {
  repr,
  asFloat,
  printImports,
  formatHeaders,
  formatDataAsJson,
  type OSVars,
} from "./python.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "insecure",
  "no-insecure",
  "upload-file",
]);

export function _toPythonHttp(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  const osVars: OSVars = {};
  const imports = new Set<string>();

  let code = "";
  if (eq(request.urls[0].urlObj.scheme, "https")) {
    code += "conn = http.client.HTTPSConnection(";
  } else {
    code += "conn = http.client.HTTPConnection(";
  }
  const classArgs = [repr(request.urls[0].urlObj.host, osVars, imports)];
  if (request.urls[0].urlObj.port) {
    // TODO
    // args.push(asInt(request.urls[0].urlObj.port, osVars, imports));
  }
  if (request.timeout) {
    classArgs.push(`timeout=${asFloat(request.timeout, osVars, imports)}`);
  }
  if (request.insecure && eq(request.urls[0].urlObj.scheme, "https")) {
    classArgs.push("context=ssl._create_unverified_context()");
    imports.add("ssl");
  }

  let joinedClassArgs = classArgs.join(", ");
  if (joinedClassArgs.length > 80) {
    joinedClassArgs = "\n    " + classArgs.join(",\n    ") + "\n";
  }
  code += joinedClassArgs + ")\n";

  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;
    if (request.authType === "basic") {
      // TODO: generate Python code that does the encoding
      const authHeader =
        "Basic " + btoa(`${user.toString()}:${password.toString()}`);
      request.headers.setIfMissing("Authorization", authHeader);
      imports.add("");
    }
  }
  if (request.headers.length) {
    // TODO: commentedOutHeaders
    // TODO: inconsistent trailing comma
    code += formatHeaders(request.headers, {}, osVars, imports);
  }

  let dataAsJson, jsonRoundtrips;
  const contentType = request.headers.get("content-type");
  const isJson =
    request.dataArray &&
    request.dataArray.length === 1 &&
    contentType &&
    contentType.split(";")[0].toString().trim() === "application/json";
  if (isJson && request.dataArray) {
    [dataAsJson, jsonRoundtrips] = formatDataAsJson(
      request.dataArray[0],
      imports,
      osVars,
    );
  }
  if (dataAsJson) {
    code += dataAsJson;
  }

  code += "conn.request(";
  const args = [
    repr(request.urls[0].method, osVars, imports),
    repr(
      mergeWords(request.urls[0].urlObj.path, request.urls[0].urlObj.query),
      osVars,
      imports,
    ),
  ];
  if (dataAsJson) {
    args.push("json.dumps(json_data)");
    if (!jsonRoundtrips && request.data) {
      args.push("# " + repr(request.data, osVars, imports));
    }
    imports.add("json");
  } else if (request.urls[0].uploadFile) {
    if (
      eq(request.urls[0].uploadFile, "-") ||
      eq(request.urls[0].uploadFile, ".")
    ) {
      args.push("sys.stdin.buffer"); // TODO
      // args.push("sys.stdin.buffer.read()"); // TODO: read() necessary?
      imports.add("sys");
    } else {
      args.push(
        "open(" +
          repr(request.urls[0].uploadFile, osVars, imports, false, true) +
          ", 'rb')",
      );
    }
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    args.push(
      "open(" +
        repr(request.dataArray[0].filename, osVars, imports, false, true) +
        ", 'rb')",
    );
  } else if (request.data) {
    args.push(repr(request.data, osVars, imports));
  }
  if (request.headers.length) {
    if (args.length === 2) {
      args.push("headers=headers");
    } else {
      args.push("headers");
    }
  }

  let joinedArgs = args.join(", ");
  if (joinedArgs.length > 80) {
    joinedArgs = "\n    " + args.join(",\n    ") + "\n";
  }
  code += joinedArgs + ")\n";

  code += "response = conn.getresponse()\n";

  let importCode = "import http.client\n";
  importCode += printImports(imports);
  importCode += "\n";

  return importCode + code;
}

export function toPythonHttpWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toPythonHttp(requests, warnings);
  return [code, warnings];
}
export function toPythonHttp(curlCommand: string | string[]): string {
  return toPythonHttpWarn(curlCommand)[0];
}
