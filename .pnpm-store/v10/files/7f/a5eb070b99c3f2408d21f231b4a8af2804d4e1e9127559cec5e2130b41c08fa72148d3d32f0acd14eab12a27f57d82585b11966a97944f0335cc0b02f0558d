import { Word, eq } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "max-redirs",
  "location",
  "no-location",
  // "location-trusted",
  // "no-location-trusted",
]);

const INDENTATION = " ".repeat(4);
function indent(line: string, level = 1): string {
  return INDENTATION.repeat(level) + line;
}

// https://doc.rust-lang.org/reference/tokens.html
const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string): string => {
      switch (c) {
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\0":
          return "\\0";
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
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

export function repr(w: Word, imports: Set<string>): string {
  const ret: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      ret.push(reprStr(t));
    } else if (t.type === "variable") {
      ret.push("env::var(" + reprStr(t.value) + ').unwrap_or("")');
      imports.add("std::env");
    } else {
      // TODO: tokenize subcommand
      // .new() is only passed the command name, args are given with .arg().arg() or .args([])
      ret.push("Command::new(" + reprStr(t.value) + ").output().stdout");
      imports.add("std::process::Command");
    }
  }
  if (ret.length === 1) {
    return ret[0];
  }
  return "[" + ret.join(", ") + "].concat()";
}

export function _toRust(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);

  const imports = new Set<string>();
  const lines: string[] = [];
  lines.push("", "fn main() -> Result<(), Box<dyn std::error::Error>> {");

  if (request.headers.length) {
    lines.push(indent("let mut headers = header::HeaderMap::new();"));
    const headerEnum: { [key: string]: string } = {
      cookie: "header::COOKIE",
    };
    for (const [headerName, headerValue] of request.headers) {
      const enumValue = headerEnum[headerName.toLowerCase().toString()];
      const name = enumValue || `"${headerName}"`;
      if (headerValue !== null) {
        lines.push(
          indent(
            `headers.insert(${name}, ${repr(
              headerValue,
              imports,
            )}.parse().unwrap());`,
          ),
        );
      }
    }
    lines.push("");
  }

  if (request.multipartUploads) {
    lines.push(indent("let form = multipart::Form::new()"));
    const parts = request.multipartUploads.map((m) => {
      if ("contentFile" in m) {
        return indent(
          `.file(${repr(m.name, imports)}, ${repr(m.contentFile, imports)})?`,
          2,
        );
      }
      return indent(
        `.text(${repr(m.name, imports)}, ${repr(m.content, imports)})`,
        2,
      );
    });
    parts[parts.length - 1] += ";";
    lines.push(...parts, "");
  }

  if (!request.followRedirects) {
    lines.push(indent("let client = reqwest::blocking::Client::builder()"));
    lines.push(indent(".redirect(reqwest::redirect::Policy::none())", 2));
    lines.push(indent(".build()", 2));
    lines.push(indent(".unwrap();", 2));
  } else if (typeof request.maxRedirects === "undefined") {
    // Curl's default is following 50 redirects, reqwest's is 10
    lines.push(indent("let client = reqwest::blocking::Client::new();"));
  } else {
    lines.push(indent("let client = reqwest::blocking::Client::builder()"));
    if (eq(request.maxRedirects, "-1")) {
      lines.push(
        indent(
          ".redirect(reqwest::redirect::Policy::custom(|attempt| { attempt.follow() }))",
          2,
        ),
      );
    } else {
      // Insert the --max-redirs value as-is, hoping it's a valid integer
      lines.push(
        indent(
          ".redirect(reqwest::redirect::Policy::limited(" +
            request.maxRedirects.trim().toString() +
            "))",
          2,
        ),
      );
    }
    lines.push(indent(".build()", 2));
    lines.push(indent(".unwrap();", 2));
  }

  const reqwestMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];
  if (reqwestMethods.includes(request.urls[0].method.toString())) {
    lines.push(
      indent(
        `let res = client.${request.urls[0].method.toLowerCase()}(${repr(
          request.urls[0].url,
          imports,
        )})`,
      ),
    );
  } else {
    lines.push(
      indent(
        `let res = client.request(${repr(
          request.urls[0].method,
          imports,
        )}, ${repr(request.urls[0].url, imports)})`,
      ),
    );
  }

  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;
    lines.push(
      indent(
        `.basic_auth(${repr(user, imports)}, Some(${repr(password, imports)}))`,
        2,
      ),
    );
  }

  if (request.headers.length) {
    lines.push(indent(".headers(headers)", 2));
  }

  if (request.multipartUploads) {
    lines.push(indent(".multipart(form)", 2));
  } else if (request.data) {
    if (request.data && request.data.indexOf("\n") !== -1) {
      // Use raw strings for multiline content
      lines.push(
        indent('.body(r#"', 2),
        request.data.toString(), // TODO: this is wrong
        '"#',
        indent(")", 2),
      );
    } else {
      lines.push(indent(`.body(${repr(request.data, imports)})`, 2));
    }
  }

  lines.push(
    indent(".send()?", 2),
    indent(".text()?;", 2),
    indent('println!("{}", res);'),
    "",
    indent("Ok(())"),
    "}",
  );

  const preambleLines = ["extern crate reqwest;"];
  {
    // Generate imports.
    const imports = [
      { want: "header", condition: !!request.headers.length },
      { want: "blocking::multipart", condition: !!request.multipartUploads },
    ]
      .filter((i) => i.condition)
      .map((i) => i.want);

    if (imports.length > 1) {
      preambleLines.push(`use reqwest::{${imports.join(", ")}};`);
    } else if (imports.length) {
      preambleLines.push(`use reqwest::${imports[0]};`);
    }
  }
  for (const imp of Array.from(imports).sort()) {
    preambleLines.push("use " + imp + ";");
  }

  return [...preambleLines, ...lines].join("\n") + "\n";
}
export function toRustWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const rust = _toRust(requests, warnings);
  return [rust, warnings];
}
export function toRust(curlCommand: string | string[]): string {
  return toRustWarn(curlCommand)[0];
}
