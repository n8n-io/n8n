import { Word } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([...COMMON_SUPPORTED_ARGS]);

// https://v2.ocaml.org/manual/lex.html#sss:stringliterals
const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string) => {
      switch (c) {
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\b":
          return "\\b";
      }
      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 2) {
        return "\\x" + hex.padStart(2, "0");
      }
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
      // TODO: can raise Not_found
      args.push("(Sys.getenv " + reprStr(t.value) + ")");
    } else if (t.type === "command") {
      // TODO: doesn't return the output
      args.push("(Sys.command " + reprStr(t.value) + ")");
    }
  }
  if (args.length === 1) {
    return args[0];
  }
  return "(" + args.join(" ^ ") + ")";
}

export function _toOCaml(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);

  let code = "";
  code += "open Lwt\n";
  code += "open Cohttp\n";
  code += "open Cohttp_lwt_unix\n";
  code += "\n";

  const method = request.urls[0].method;
  const methodStr = method.toString();
  // https://github.com/mirage/ocaml-cohttp/blob/b0104b407e631b5a1e51c626a75af17cc6f33369/cohttp/src/code.ml#L5-L15
  const methodConstants = [
    "GET",
    "POST",
    "HEAD",
    "DELETE",
    "PATCH",
    "PUT",
    "OPTIONS",
    "TRACE",
    "CONNECT",
  ];
  // https://github.com/mirage/ocaml-cohttp/blob/b0104b407e631b5a1e51c626a75af17cc6f33369/cohttp-lwt/src/s.ml#L220
  const methodFns = ["HEAD", "GET", "DELETE", "POST", "PUT", "PATCH"];
  const bodyMethods = ["POST", "PUT", "PATCH"];

  // TODO: Client.post_form
  code += "let uri = Uri.of_string " + repr(request.urls[0].url) + " in\n";

  if (!method.isString() || !methodConstants.includes(methodStr)) {
    code += "let meth = Code.method_of_string " + repr(method) + " in\n";
  }

  const hasBody = Boolean(request.data);

  if (request.headers.length === 1 && !request.urls[0].auth) {
    const [key, value] = request.headers.headers[0];
    if (value !== null) {
      code +=
        "let headers = Header.init_with " +
        repr(key) +
        " " +
        repr(value) +
        " in\n";
    }
  } else if (request.headers.length || request.urls[0].auth) {
    code += "let headers = Header.init ()";
    for (const header of request.headers) {
      const [key, value] = header;
      if (value !== null) {
        code += "\n  |> fun h -> Header.add h " + repr(key) + " " + repr(value);
      }
    }
    if (request.urls[0].auth) {
      const [user, pass] = request.urls[0].auth;
      code +=
        "\n  |> fun h -> Header.add_authorization h (`Basic (" +
        repr(user) +
        ", " +
        repr(pass) +
        "))";
    }
    code += " in\n";
  }

  if (request.data) {
    code +=
      "let body = Cohttp_lwt.Body.of_string " + repr(request.data) + " in\n";
  }
  // TODO: --upload-file
  // TODO: request.multipartUploads

  let fn = "Client.call";
  const args = [];
  if (request.headers.length || request.urls[0].auth) {
    args.push("~headers");
  }
  if (hasBody) {
    args.push("~body");
  }
  if (!method.isString() || !methodConstants.includes(methodStr)) {
    args.push("meth");
  } else {
    if (
      methodFns.includes(methodStr) &&
      (!hasBody || bodyMethods.includes(methodStr))
    ) {
      fn = "Client." + methodStr.toLowerCase();
    } else {
      args.push("`" + methodStr);
    }
  }
  args.push("uri");

  code += fn + " " + args.join(" ") + "\n";
  code += ">>= fun (resp, body) ->\n";
  code += "  (* Do stuff with the result *)\n";

  return code;
}

export function toOCamlWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toOCaml(requests, warnings);
  return [code, warnings];
}
export function toOCaml(curlCommand: string | string[]): string {
  return toOCamlWarn(curlCommand)[0];
}
