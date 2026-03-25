import { parse, COMMON_SUPPORTED_ARGS } from "../parse.js";
import { warnIfPartsIgnored } from "../Warnings.js";
import { Word, eq } from "../shell/Word.js";
import type { Request, RequestUrl, Warnings } from "../parse.js";
import { parseQueryString } from "../Query.js";

// https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules
// https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_special_characters
// https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-string-substitutions
const unprintableChars = /\p{C}|[^ \P{Z}]/gu;
const regexDoubleEscape = /\$|`|"|\p{C}|[^ \P{Z}]/gu;
export function escapeStr(s: string, quote: '"' | "'"): string {
  if (quote === '"') {
    return s.replace(regexDoubleEscape, (c: string) => {
      switch (c) {
        case "\x00":
          return "`0";
        case "\x07":
          return "`a";
        case "\b":
          return "`b";
        case "\x1B":
          return "`e";
        case "\f":
          return "`f";
        case "\n":
          return "`n";
        case "\r":
          return "`r";
        case "\t":
          return "`t";
        case "\v":
          return "`v";
        case "$":
          return "`$";
        case "`":
          return "``";
        case '"':
          return '`"'; // also '""'
      }

      const hex = (c.codePointAt(0) as number).toString(16);
      return "`u{" + hex + "}";
    });
  }

  return s.replace("'", "''");
}

export function repr(w: Word): string {
  let quote: '"' | "'" = '"';
  if (
    w.tokens.length === 1 &&
    typeof w.tokens[0] === "string" &&
    !unprintableChars.test(w.tokens[0]) &&
    w.tokens[0].includes("'") &&
    !w.tokens[0].includes('"')
  ) {
    quote = "'";
  }

  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(escapeStr(t, quote));
    } else if (t.type === "variable") {
      // TODO: this will lead to syntax errors
      args.push(t.text);
    } else {
      // TODO: this will lead to syntax errors
      if (t.text.startsWith("$(") && t.text.endsWith(")")) {
        args.push(t.text);
      } else {
        args.push("$(" + t.text + ")");
      }
    }
  }

  if (w.tokens.length === 1 && typeof w.tokens[0] !== "string") {
    return args.join("");
  }
  return quote + args.join("") + quote;
}

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "upload-file",
  "output",

  "location",
  "location-trusted",
  "max-redirs",

  "proxy",

  "insecure",

  "max-time",

  "keepalive",

  "http2",
  "http3",
]);

function requestToPowershell(
  request: Request,
  url: RequestUrl,
  restMethod: boolean,
  warnings: Warnings,
): string {
  let code = "";
  const command = restMethod ? "Invoke-RestMethod" : "Invoke-WebRequest";
  const args: string[][] = [];

  const method = url.method;
  const methodStr = url.method.toString();

  if (
    url.queryList &&
    url.queryDict &&
    url.queryDict.every((q) => !Array.isArray(q[1])) &&
    method.isString() &&
    methodStr === "GET" &&
    !(url.uploadFile || request.data || request.multipartUploads)
  ) {
    code += "$body = @{\n";
    for (const [name, value] of url.queryList) {
      // TODO: repeated keys
      // TODO: values require escaping
      code += "    " + repr(name) + " = " + repr(value) + "\n";
    }
    code += "}\n";
    args.push(["-Uri", repr(url.urlWithoutQueryList)]);
    args.push(["-Body", "$body"]);

    warnings.push([
      "data-get",
      "the -Body will be sent in the URL as a query string",
    ]);
  } else {
    args.push(["-Uri", repr(url.url)]);
  }

  const methods = {
    DEFAULT: "Default",
    DELETE: "Delete",
    GET: "Get",
    HEAD: "Head",
    MERGE: "Merge",
    OPTIONS: "Options",
    PATCH: "Patch",
    POST: "Post",
    PUT: "Put",
    TRACE: "Trace",
  } as const;
  if (url.method.isString() && methodStr === "GET") {
    // the default
  } else if (url.method.isString() && methodStr in methods) {
    args.push(["-Method", methods[methodStr as keyof typeof methods]]);
  } else {
    args.push(["-CustomMethod", repr(method)]);
  }

  if (request.cookies) {
    code +=
      "$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession\n";
    for (const [name, value] of request.cookies) {
      code += "$cookie = New-Object System.Net.Cookie\n";
      code += "$cookie.Name = " + repr(name) + "\n";
      code += "$cookie.Value = " + repr(value) + "\n";
      // TODO: if host contains a port, it won't send cookies
      code += "$cookie.Domain = " + repr(url.urlObj.host) + "\n";
      code += "$session.Cookies.Add($cookie)\n";
    }
    args.push(["-WebSession", "$session"]);
    request.headers.delete("Cookie");
  }

  const headerArgs: string[][] = [];
  const headerLines = [];
  for (const [headerName, headerValue] of request.headers) {
    if (headerValue === null) {
      continue;
    }
    if (headerName.toLowerCase().toString() === "content-type") {
      headerArgs.push(["-ContentType", repr(headerValue)]);
    } else if (headerName.toLowerCase().toString() === "user-agent") {
      headerArgs.push(["-UserAgent", repr(headerValue)]);
    } else {
      // TODO: check value and pass -SkipHeaderValidation if necessary
      headerLines.push(repr(headerName) + " = " + repr(headerValue));
    }
  }
  if (url.auth) {
    const [username, password] = url.auth;
    code += "$username = " + repr(username) + "\n";
    code +=
      "$password = ConvertTo-SecureString " +
      repr(password) +
      " -AsPlainText -Force\n";
    code +=
      "$credential = New-Object System.Management.Automation.PSCredential($username, $password)\n";
    args.push(["-Credential", "$credential"]);
    args.push(["-Authentication", "Basic"]);
    // TODO: mostly to make compare_requests.ts work
    if (url.urlObj.scheme.toString() === "http") {
      args.push(["-AllowUnencryptedAuthentication"]);
    }
  }
  if (headerLines.length) {
    code += "$headers = @{\n";
    code += "    " + headerLines.join("\n    ") + "\n";
    code += "}\n";
    args.push(["-Headers", "$headers"]);
  }
  args.push(...headerArgs);

  if (url.uploadFile) {
    if (eq(url.uploadFile, "-") || eq(url.uploadFile, ".")) {
      // warnings.push([
      //   "upload-stdin",
      //   "pass in the file contents through stdin",
      // ]);
    }
    args.push(["-InFile", repr(url.uploadFile)]);
  } else if (request.multipartUploads) {
    code += "$form = @{\n";
    for (const m of request.multipartUploads) {
      if ("content" in m) {
        code += "    " + repr(m.name) + " = " + repr(m.content) + "\n";
      } else {
        if ("filename" in m && m.filename && !eq(m.filename, m.contentFile)) {
          warnings.push([
            "powershell-multipart-fake-filename",
            "PowerShell doesn't support multipart uploads that read a certain filename but send a different filename",
          ]);
        }
        code +=
          "    " + repr(m.name) + " = Get-Item " + repr(m.contentFile) + "\n";
      }
    }
    code += "}\n";
    args.push(["-Form", "$form"]);
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    args.push(["-InFile", repr(request.dataArray[0].filename)]);
  } else if (request.data) {
    const contentType = request.headers.getContentType();
    if (contentType === "application/x-www-form-urlencoded") {
      let queryList, queryDict;
      try {
        [queryList, queryDict] = parseQueryString(request.data);
      } catch {}
      if (
        queryList &&
        queryDict &&
        queryDict.every((q) => !Array.isArray(q[1]))
      ) {
        code += "$body = @{\n";
        for (const [name, value] of queryList) {
          // TODO: repeated keys
          // TODO: values require escaping
          code += "    " + repr(name) + " = " + repr(value) + "\n";
        }
        code += "}\n";
        args.push(["-Body", "$body"]);
      } else {
        args.push(["-Body", repr(request.data)]);
        if (methodStr === "POST" && request.data.includes("=")) {
          warnings.push([
            "post-string",
            "all -Body text after the first '=' will be escaped",
          ]);
        }
      }
    } else {
      // TODO: values require escaping
      args.push(["-Body", repr(request.data)]);

      if (methodStr === "POST" && request.data.includes("=")) {
        warnings.push([
          "post-string",
          "all -Body text after the first '=' will be escaped",
        ]);
      }
    }
    if (methodStr === "GET") {
      warnings.push([
        "data-get",
        "the -Body will be sent in the URL as a query string",
      ]);
    }
  }

  if (request.followRedirects === false) {
    args.push(["-MaximumRedirection", "0"]);
  } else if (request.maxRedirects && request.maxRedirects.toString() !== "5") {
    // TODO: escape/parse?
    args.push(["-MaximumRedirection", request.maxRedirects.toString()]);
  }
  if (request.followRedirectsTrusted) {
    args.push(["-PreserveAuthorizationOnRedirect"]);
  }

  if (request.proxy) {
    args.push(["-Proxy", repr(request.proxy)]);
  }
  if (request.proxyAuth) {
    // TODO: -ProxyCredential
  }
  if (request.noproxy) {
    // TODO: these are different
    // args.push(["-NoProxy"])
  }

  if (request.insecure) {
    args.push(["-SkipCertificateCheck"]);
  }

  if (request.timeout) {
    args.push(["-TimeoutSec", request.timeout.toString()]);
  }
  if (request.keepAlive === false) {
    args.push(["-DisableKeepAlive"]);
  }

  if (request.http2) {
    args.push(["-HttpVersion", "2.0"]);
  } else if (request.http3) {
    args.push(["-HttpVersion", "3.0"]);
  }

  if (url.output) {
    args.push(["-OutFile", repr(url.output)]);
  }

  const multiline =
    args.length > 3 || args.reduce((a, b) => a + b.length, 0) > 80 - 5;
  const joiner = multiline ? " `\n    " : " ";
  return (
    code +
    "$response = " +
    command +
    " " +
    args.map((a) => a.join(" ")).join(joiner) +
    "\n"
  );
}

function toPowershell(
  requests: Request[],
  restMethod = true,
  warnings: Warnings = [],
): string {
  const commands = [];

  for (const request of requests) {
    warnIfPartsIgnored(request, warnings, {
      dataReadsFile: true,
      // cookieFiles: true,
      multipleUrls: true,
    });
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

    for (const url of request.urls) {
      commands.push(requestToPowershell(request, url, restMethod, warnings));
    }
  }
  return commands.join("\n\n");
}

export function _toPowershellWebRequest(
  requests: Request[],
  warnings: Warnings = [],
): string {
  return toPowershell(requests, false, warnings);
}

export function toPowershellWebRequestWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toPowershellWebRequest(requests, warnings);
  return [code, warnings];
}
export function toPowershellWebRequest(curlCommand: string | string[]): string {
  return toPowershellWebRequestWarn(curlCommand)[0];
}

export function _toPowershellRestMethod(
  requests: Request[],
  warnings: Warnings = [],
): string {
  return toPowershell(requests, true, warnings);
}

export function toPowershellRestMethodWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toPowershellRestMethod(requests, warnings);
  return [code, warnings];
}
export function toPowershellRestMethod(curlCommand: string | string[]): string {
  return toPowershellWebRequestWarn(curlCommand)[0];
}
