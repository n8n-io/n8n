import { has, isInt } from "../utils.js";
import { Word, eq, joinWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "compressed",
  "form",
  "form-string",
  "http0.9",
  "http1.0",
  "http1.1",
  "insecure",
  "no-compressed",
  "no-digest",
  "no-http0.9",
  "no-insecure",
  "proxy",
  "upload-file",
  // "output",
  // "proxy-user",
]);

// https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/strings/
const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string): string => {
      switch (c) {
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
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
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
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
      }
      // Shouldn't happen
      return "\\U" + hex.padStart(8, "0");
    }) +
    '"'
  );
}

export function repr(w: Word, imports: Set<string>): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      args.push("Environment.GetEnvironmentVariable(" + reprStr(t.value) + ")");
      imports.add("System");
    } else {
      // TODO: this needs to be two arguments the command name + list of args
      args.push("System.Diagnostics.Process.Start(" + reprStr(t.value) + ")");
      imports.add("System.Diagnostics");
    }
  }
  return args.join(" + ");
}

export function _toCSharp(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  const imports = new Set<string>(["System.Net.Http"]);

  const methods = {
    DELETE: "Delete",
    GET: "Get",
    PATCH: "Patch",
    POST: "Post",
    PUT: "Put",
  };
  const moreMethods = {
    DELETE: "Delete",
    GET: "Get",
    HEAD: "Head",
    OPTIONS: "Options",
    PATCH: "Patch",
    POST: "Post",
    PUT: "Put",
    TRACE: "Trace",
  };
  const method = request.urls[0].method.toString();
  let methodStr =
    "new HttpMethod(" + repr(request.urls[0].method, imports) + ")";
  if (has(moreMethods, method)) {
    methodStr = "HttpMethod." + moreMethods[method];
  }

  const simple =
    has(methods, method) &&
    !(
      request.headers.length ||
      (request.urls[0].auth && request.authType === "basic") ||
      request.multipartUploads ||
      request.data ||
      request.urls[0].uploadFile ||
      request.urls[0].output
    );

  let s = "";

  if (request.insecure || request.proxy || request.compressed) {
    s += "HttpClientHandler handler = new HttpClientHandler();\n";
    if (request.insecure) {
      s +=
        "handler.ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator;\n";
    }
    if (request.proxy) {
      // TODO: probably need to parse the value a bit
      // TODO: , true) ?
      s +=
        "handler.Proxy = new WebProxy(" + repr(request.proxy, imports) + ");\n";
    }
    if (request.compressed) {
      s += "handler.AutomaticDecompression = DecompressionMethods.All;\n";
    }
    s += "\n";
    s += "HttpClient client = new HttpClient(handler);\n\n";
  } else {
    s += "HttpClient client = new HttpClient();\n\n";
  }

  if (simple) {
    if (method === "GET") {
      s +=
        "string responseBody = await client.GetStringAsync(" +
        repr(request.urls[0].url, imports) +
        ");\n";
    } else {
      s +=
        "HttpResponseMessage response = await client." +
        methods[method] +
        "Async(" +
        repr(request.urls[0].url, imports) +
        ");\n";
      s += "response.EnsureSuccessStatusCode();\n";
      s +=
        "string responseBody = await response.Content.ReadAsStringAsync();\n";
    }
    return s;
  }

  s +=
    "HttpRequestMessage request = new HttpRequestMessage(" +
    methodStr +
    ", " +
    repr(request.urls[0].url, imports) +
    ");\n";

  // https://docs.microsoft.com/en-us/dotnet/api/system.net.http.headers.httpcontentheaders
  const contentHeaders = {
    "content-length": "ContentLength",
    "content-location": "ContentLocation",
    "content-md5": "ContentMD5",
    "content-range": "ContentRange",
    "content-type": "ContentType",
    expires: "Expires",
    "last-modified": "LastModified",
  };
  const reqHeaders = request.headers.headers.filter(
    (h) => !Object.keys(contentHeaders).includes(h[0].toLowerCase().toString()),
  );
  const reqContentHeaders = request.headers.headers.filter((h) =>
    Object.keys(contentHeaders).includes(h[0].toLowerCase().toString()),
  );

  if (
    reqHeaders.length ||
    (request.urls[0].auth && request.authType === "basic")
  ) {
    s += "\n";
    for (const [headerName, headerValue] of reqHeaders) {
      if (headerValue === null) {
        continue;
      }
      if (["accept-encoding"].includes(headerName.toLowerCase().toString())) {
        s += "// ";
      }
      s +=
        "request.Headers.Add(" +
        repr(headerName, imports) +
        ", " +
        repr(headerValue, imports) +
        ");\n";
    }
    if (request.urls[0].auth && request.authType === "basic") {
      // TODO: add request.rawAuth?
      s +=
        'request.Headers.Add("Authorization", "Basic " + Convert.ToBase64String(System.Text.ASCIIEncoding.ASCII.GetBytes(' +
        repr(joinWords(request.urls[0].auth, ":"), imports) +
        ")));\n";
    }
    s += "\n";
  }

  if (request.urls[0].uploadFile) {
    s +=
      "request.Content = new ByteArrayContent(File.ReadAllBytes(" +
      repr(request.urls[0].uploadFile, imports) +
      "));\n";
  } else if (request.multipartUploads) {
    s += "\n";
    // TODO: get boundary from header
    s += "MultipartFormDataContent content = new MultipartFormDataContent();\n";
    for (const m of request.multipartUploads) {
      // MultipartRequest syntax looks like this:
      //   content.Add(HttpContent(content), name, filename);
      // TODO: wrap name in extra "" to match curl?
      const name = repr(m.name, imports); // TODO: what if name is empty string?
      const sentFilename = "filename" in m && m.filename;
      s += "content.Add(new ";
      if ("contentFile" in m) {
        if (eq(m.contentFile, "-")) {
          if (request.stdinFile) {
            s +=
              "ByteArrayContent(File.ReadAllBytes(" +
              repr(request.stdinFile, imports) +
              ")), " +
              name;
            if (sentFilename) {
              s += ", Path.GetFileName(" + repr(sentFilename, imports) + ")";
            }
            s += ");\n";
          } else if (request.stdin) {
            s += "StringContent(" + repr(request.stdin, imports) + "), " + name;
            if (sentFilename) {
              s += ", Path.GetFileName(" + repr(sentFilename, imports) + ")";
            }
            s += ");\n";
          } else {
            // TODO: read entire stdin
            s += "StringContent(Console.ReadLine()), " + name;
            if (sentFilename) {
              s += ", Path.GetFileName(" + repr(sentFilename, imports) + ")";
            }
            s += ");\n";
          }
        } else {
          s +=
            "ByteArrayContent(File.ReadAllBytes(" +
            repr(m.contentFile, imports) +
            ")), " +
            name;
          if (sentFilename) {
            s += ", Path.GetFileName(" + repr(sentFilename, imports) + ")";
          }
          s += ");\n";
        }
      } else {
        s +=
          "StringContent(" + repr(m.content, imports) + "), " + name + ");\n";
      }
    }
    s += "request.Content = content;\n";
  } else if (request.data) {
    // TODO: parse
    if (!request.isDataRaw && request.data.startsWith("@")) {
      // TODO: stdin
      s +=
        "request.Content = new StringContent(File.ReadAllText(" +
        repr(request.data.slice(1), imports) +
        ').Replace("\\n", string.Empty).Replace("\\r", string.Empty));\n';
    } else {
      s +=
        "request.Content = new StringContent(" +
        repr(request.data, imports) +
        ");\n";
    }
  } else if (request.headers.has("content-type")) {
    // This needs to be at the end.
    // If the request has no content, you can't set the content-type
    s += 'request.Content = new StringContent("");\n';
  }

  if (reqContentHeaders.length) {
    for (const [headerName, headerValue] of reqContentHeaders) {
      if (headerValue === null) {
        continue;
      }
      const headerNameLower = headerName.toLowerCase().toString();
      if (headerNameLower === "content-type") {
        imports.add("System.Net.Http.Headers");
        if (headerValue.includes(";")) {
          s +=
            "request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(" +
            repr(headerValue, imports) +
            ");\n";
        } else {
          s +=
            "request.Content.Headers.ContentType = new MediaTypeHeaderValue(" +
            repr(headerValue, imports) +
            ");\n";
        }
      } else if (headerNameLower === "content-length") {
        if (headerValue.isString() && !isInt(headerValue.toString())) {
          warnings.push([
            "content-length-not-int",
            "Content-Length header value is not a number: " +
              repr(headerValue, imports),
          ]);
        }
        s +=
          "// request.Content.Headers.ContentLength = " +
          headerValue.split("\n")[0].toString() + // TODO: might have variable
          ";\n";
      } else if (has(contentHeaders, headerNameLower)) {
        // placate type checker
        // TODO: none of these are actually strings.
        s +=
          "request.Content.Headers." +
          contentHeaders[headerNameLower] +
          " = " +
          repr(headerValue, imports) +
          ";\n";
      }
    }
  }

  if (
    request.urls[0].uploadFile ||
    request.data ||
    request.multipartUploads ||
    reqContentHeaders.length
  ) {
    s += "\n";
  }

  s += "HttpResponseMessage response = await client.SendAsync(request);\n";
  s += "response.EnsureSuccessStatusCode();\n";
  s += "string responseBody = await response.Content.ReadAsStringAsync();\n";

  if (imports.size) {
    s = "using " + [...imports].sort().join(";\nusing ") + ";\n\n" + s;
  }
  return s;
}
export function toCSharpWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const cSharp = _toCSharp(requests, warnings);
  return [cSharp, warnings];
}
export function toCSharp(curlCommand: string | string[]): string {
  return toCSharpWarn(curlCommand)[0];
}
