import { warnIfPartsIgnored } from "../Warnings.js";
import { Word, joinWords } from "../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";
import { parseQueryString } from "../Query.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "insecure",
  "no-insecure",
  "next",
]);

const regexEscape = /"|\\|\p{C}|[^ \P{Z}]|#\{/gu;

export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string): string => {
      switch (c[0]) {
        case "\x00":
          return "\\0";
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
        case '"':
          return '\\"';
        case "#":
          return "\\" + c;
      }
      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
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
      args.push("System.get_env(" + reprStr(t.value) + ', "")');
    } else {
      // TODO: strip newline?
      // TODO: use System.cmd(), which needs to be two arguments the command name + list of args
      args.push("elem(System.shell(" + reprStr(t.value) + "), 0)");
    }
  }
  return args.join(" <> ");
}

function addIndent(value: string): string {
  // split on new lines and add 2 spaces of indentation to each line, except empty lines
  return value
    .split("\n")
    .map((line) => (line ? "  " + line : line))
    .join("\n");
}

function getCookies(request: Request): string {
  if (!request.cookies || !request.cookies.length) {
    return "";
  }

  // TODO: this duplicates work, just get it from request.headers
  const cookies = joinWords(
    request.cookies.map((c) => joinWords(c, "=")),
    "; ",
  );
  return `cookie: [${repr(cookies)}]`;
}

function getOptions(request: Request, params: string): [string, string] {
  const hackneyOptions: string[] = [];

  const auth = getBasicAuth(request);
  if (auth) {
    hackneyOptions.push(auth);
  }

  if (request.insecure) {
    hackneyOptions.push(":insecure");
  }

  const cookies = getCookies(request);
  if (cookies) {
    hackneyOptions.push(cookies);
  }

  let hackneyOptionsString = "";
  if (hackneyOptions.length > 1) {
    hackneyOptionsString = `hackney: [\n    ${hackneyOptions.join(
      ",\n    ",
    )}\n  ]`;
  } else if (hackneyOptions.length) {
    hackneyOptionsString = `hackney: [${hackneyOptions[0]}]`;
  }

  const optionsWithoutParams = `[${hackneyOptionsString}]`;
  let options = optionsWithoutParams;
  if (params !== "[]") {
    options = "";
    options += "[\n";
    options += "    params: " + addIndent(params).trim();
    if (hackneyOptionsString) {
      options += ",\n";
      options += "    " + addIndent(hackneyOptionsString).trim();
    }
    options += "\n";
    options += "  ]";
  }
  return [options, optionsWithoutParams];
}

function getBasicAuth(request: Request): string {
  if (!request.urls[0].auth) {
    return "";
  }

  const [user, password] = request.urls[0].auth;
  return `basic_auth: {${repr(user)}, ${repr(password)}}`;
}

function getQueryDict(request: Request): string {
  if (!request.urls[0].queryList || !request.urls[0].queryList.length) {
    return "[]";
  }
  let queryDict = "[\n";
  const queryDictLines: string[] = [];
  for (const [paramName, rawValue] of request.urls[0].queryList) {
    queryDictLines.push(`    {${repr(paramName)}, ${repr(rawValue)}}`);
  }
  queryDict += queryDictLines.join(",\n");
  queryDict += "\n  ]";
  return queryDict;
}

function getHeadersDict(request: Request): string {
  if (!request.headers.length) {
    return "[]";
  }
  let dict = "[\n";
  const dictLines: string[] = [];
  for (const [headerName, headerValue] of request.headers) {
    dictLines.push(
      `    {${repr(headerName)}, ${repr(headerValue ?? new Word())}}`,
    );
  }
  dict += dictLines.join(",\n");
  dict += "\n  ]";
  return dict;
}

function getBody(request: Request): string {
  const formData = getFormDataString(request);
  return formData ? formData : '""';
}

function getFormDataString(request: Request): string {
  if (request.multipartUploads) {
    if (!request.multipartUploads.length) {
      return `{:multipart, []}`;
    }

    const formParams: string[] = [];
    for (const m of request.multipartUploads) {
      if ("contentFile" in m) {
        formParams.push(
          `    {:file, ${repr(m.contentFile)}, {"form-data", [{:name, ${repr(
            m.name,
          )}}, {:filename, Path.basename(${repr(
            m.filename ?? m.contentFile,
          )})}]}, []}`,
        );
      } else {
        formParams.push(`    {${repr(m.name)}, ${repr(m.content)}}`);
      }
    }

    const formStr = formParams.join(",\n");
    if (formStr) {
      return `{:multipart, [
${formStr}
  ]}`;
    }
  }

  if (request.data) {
    return getDataString(request);
  }

  return "";
}

function getDataString(request: Request): string {
  if (!request.data) {
    return "";
  }

  // TODO: JSON with Poison

  if (!request.isDataRaw && request.data.startsWith("@")) {
    const filePath = request.data.slice(1);
    if (request.isDataBinary) {
      return `File.read!(${repr(filePath)})`;
    } else {
      return `{:file, ${repr(filePath)}}`;
    }
  }

  const [parsedQuery] = parseQueryString(request.data);
  if (parsedQuery && parsedQuery.length) {
    const data = parsedQuery.map((p) => {
      const [key, value] = p;
      return `    {${repr(key)}, ${repr(value)}}`;
    });
    return `{:form, [\n${data.join(",\n")}\n  ]}`;
  }

  if (
    request.data.isString() &&
    !request.data.includes("|") &&
    request.data.split("\n", 4).length > 3 &&
    // No trailing whitespace, except possibly on the last line
    !request.data.match(/[^\S\r\n]\n/)
  ) {
    return "~s|" + request.data.toString() + "|";
  }
  return repr(request.data);
}

function requestToElixir(request: Request, warnings: Warnings = []): string {
  warnIfPartsIgnored(request, warnings);
  if (request.cookies) {
    request.headers.delete("cookie");
  }

  // delete!(url, headers \\ [], options \\ [])
  // get!(url, headers \\ [], options \\ [])
  // head!(url, headers \\ [], options \\ [])
  // options!(url, headers \\ [], options \\ [])
  // patch!(url, body, headers \\ [], options \\ [])
  // post!(url, body, headers \\ [], options \\ [])
  // put!(url, body \\ "", headers \\ [], options \\ [])
  const methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"];
  const bodyMethods = ["PATCH", "POST", "PUT"];
  const method = request.urls[0].method;
  const methodStr = method.toString();
  if (!methods.includes(methodStr)) {
    warnings.push([
      "bad-method",
      "Unsupported method " + JSON.stringify(methodStr),
    ]);
  }

  const isBodyMethod = bodyMethods.includes(methodStr);
  const body = getBody(request);
  const headers = getHeadersDict(request);
  const params = getQueryDict(request);
  // params can go in the options argument, but if we're using the full
  // form, put them as a separate argument.
  const [options, optionsWithoutParams] = getOptions(request, params);

  if (isBodyMethod || (body === '""' && methods.includes(methodStr))) {
    // Add args backwards. As soon as we see a non-default value, we have to
    // add all preceding arguments.
    let args: string[] = [];
    let keepArgs = false;
    keepArgs ||= options !== "[]";
    if (keepArgs) {
      args.push(options);
    }
    keepArgs ||= headers !== "[]";
    if (keepArgs) {
      args.push(headers);
    }
    keepArgs ||= body !== '""';
    if (keepArgs && isBodyMethod) {
      args.push(body);
    }
    args.push(repr(request.urls[0].urlWithoutQueryList));
    args = args.reverse();

    let s = "response = HTTPoison." + methodStr.toLowerCase() + "!(";
    if (args.length === 1) {
      // If we just need the method+URL, keep it all on one line
      s += args[0];
    } else {
      s += "\n";
      s += "  " + args.join(",\n  ");
      s += "\n";
    }
    return s + ")\n";
  }

  return `request = %HTTPoison.Request{
  method: :${method.toLowerCase().toString()},
  url: ${repr(request.urls[0].urlWithoutQueryList)},
  body: ${body},
  headers: ${headers},
  options: ${optionsWithoutParams},
  params: ${params}
}

response = HTTPoison.request(request)
`;
}

export function _toElixir(
  requests: Request[],
  warnings: Warnings = [],
): string {
  return requests.map((r) => requestToElixir(r, warnings)).join("\n");
}

export function toElixirWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const elixir = _toElixir(requests, warnings);
  return [elixir, warnings];
}

export function toElixir(curlCommand: string | string[]): string {
  return toElixirWarn(curlCommand)[0];
}
