import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "insecure",
  "no-insecure",
  "upload-file",
  "max-redirs",
  "max-time",
  "form",
  "form-string",
]);

// http://www.dispersiondesign.com/articles/perl/perl_escape_characters
// https://perldoc.perl.org/perlrebackslash
const needsEscaping = /\p{C}|[^ \P{Z}]/gu;
const regexEscape = /\$|@|"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  if (!needsEscaping.test(s)) {
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'";
  }
  return (
    '"' +
    s.replace(regexEscape, (c: string) => {
      switch (c) {
        case "$":
          return "\\$";
        case "@":
          return "\\@";
        // Escaping backslashes is optional (unless it's the last character)
        case "\\":
          return "\\\\";
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
        // New in perl 5.10.0
        case "\v":
          return "\\v";
        case '"':
          return '\\"';
      }

      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 2) {
        return "\\x" + hex.padStart(2, "0");
      }
      return "\\x{" + hex + "}";
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
      // TODO: put in string?
      args.push("$ENV{" + t.value + "}");
    } else {
      // TODO: escape
      args.push("`" + t.value + "`");
    }
  }
  return args.join(" . ");
}

const hashKeySafe = /^[a-zA-Z]+$/u;
export function reprHashKey(w: Word): string {
  if (
    w.tokens.length === 1 &&
    typeof w.tokens[0] === "string" &&
    hashKeySafe.test(w.tokens[0])
  ) {
    return w.tokens[0];
  }
  return repr(w);
}

export function _toPerl(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);
  const method = request.urls[0].method;
  const methodStr = method.toString();

  if (
    method.isString() &&
    ["GET", "HEAD"].includes(methodStr) &&
    !request.headers.length &&
    !request.urls[0].auth &&
    !request.data &&
    !request.multipartUploads &&
    !request.insecure &&
    !request.timeout &&
    !request.maxRedirects
  ) {
    let code = "use LWP::Simple;\n";
    code +=
      "$content = " +
      methodStr.toLowerCase() +
      "(" +
      repr(request.urls[0].url) +
      ");\n";
    return code;
  }

  const methods = ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"];
  const helperFunction = method.isString() && methods.includes(methodStr);

  let code = "use LWP::UserAgent;\n";
  if (request.urls[0].auth) {
    code += "use MIME::Base64;\n";
  }
  if (!helperFunction) {
    code += "require HTTP::Request;\n";
  }
  if (request.urls[0].uploadFile) {
    code += "use File::Slurp;\n";
  }
  code += "\n";

  code += "$ua = LWP::UserAgent->new(";
  const uaArgs = [];
  if (request.insecure) {
    uaArgs.push("ssl_opts => { verify_hostname => 0 }");
  }
  if (request.timeout) {
    uaArgs.push("timeout => " + request.timeout.toString());
  }
  if (request.maxRedirects) {
    uaArgs.push("max_redirect => " + request.maxRedirects.toString());
  }
  if (uaArgs.length > 1) {
    code += "\n    " + uaArgs.join(",\n    ") + "\n";
  } else {
    code += uaArgs.join(", ");
  }
  code += ");\n";

  const args = [];
  if (!helperFunction) {
    code += "$request = HTTP::Request->new(";
    args.push(repr(method));
    args.push(repr(request.urls[0].url));
  } else {
    code += "$response = $ua->" + methodStr.toLowerCase() + "(";
    args.push(repr(request.urls[0].url));
    if (request.headers.length || request.urls[0].auth) {
      for (const [k, v] of request.headers) {
        if (v === null) {
          continue;
        }
        args.push(reprHashKey(k) + " => " + repr(v));
      }
      if (request.urls[0].auth) {
        args.push(
          'Authorization => "Basic " . MIME::Base64::encode(' +
            repr(
              mergeWords(request.urls[0].auth[0], ":", request.urls[0].auth[1]),
            ) +
            ")",
        );
      }
    }
    if (request.urls[0].uploadFile) {
      args.push(
        "Content => read_file(" + repr(request.urls[0].uploadFile) + ")",
      );
    } else if (request.multipartUploads) {
      args.push("Content_Type => 'form-data'");
      const lines = [];
      for (const m of request.multipartUploads) {
        if ("content" in m) {
          lines.push(reprHashKey(m.name) + " => " + repr(m.content));
        } else if (!("filename" in m)) {
          // TODO: use File::Slurp;
          lines.push(
            reprHashKey(m.name) + " => read_file(" + repr(m.contentFile) + ")",
          );
        } else {
          let line = reprHashKey(m.name) + " => [" + repr(m.contentFile);
          if (m.filename && !eq(m.filename, m.contentFile)) {
            line += ", " + repr(m.filename);
          }
          lines.push(line + "]");
        }
      }

      args.push(
        "Content => [\n        " + lines.join(",\n        ") + "\n    ]",
      );
    } else if (request.data) {
      // TODO: parseQueryString
      args.push("Content => " + repr(request.data));
    }
  }

  if (
    (!helperFunction && args.length > 2) ||
    (helperFunction && args.length > 1)
  ) {
    code += "\n    " + args.join(",\n    ") + "\n";
  } else {
    code += args.join(", ");
  }
  code += ");\n";

  if (!helperFunction) {
    code += "$response = $ua->request($request);\n";
  }

  return code;
}

export function toPerlWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toPerl(requests, warnings);
  return [code, warnings];
}
export function toPerl(curlCommand: string | string[]): string {
  return toPerlWarn(curlCommand)[0];
}
