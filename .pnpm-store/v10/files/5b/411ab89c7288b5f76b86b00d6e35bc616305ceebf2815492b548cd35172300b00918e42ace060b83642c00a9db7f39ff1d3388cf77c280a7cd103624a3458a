import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "connect-timeout",
  "location",
  // "location-trusted",
  "upload-file",
  // TODO
  // "form",
  // "form-string",
  "http2",
]);

// https://docs.oracle.com/javase/specs/jls/se7/html/jls-3.html#jls-3.10.6
// https://docs.oracle.com/javase/specs/jls/se7/html/jls-3.html#jls-3.3
// Also used for Clojure
const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
const regexDigit = /[0-9]/; // it's 0-7 actually but that would generate confusing code
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string, index: number, string: string) => {
      switch (c) {
        case "\\":
          return "\\\\";
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

      if (c === "\0" && !regexDigit.test(string.charAt(index + 1))) {
        return "\\0";
      }
      return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
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
      args.push("System.getenv(" + reprStr(t.value) + ")");
      imports.add("java.lang.System");
    } else {
      args.push("exec(" + reprStr(t.value) + ")");
      imports.add("java.lang.Runtime");
      imports.add("java.util.Scanner");
    }
  }
  return args.join(" + ");
}

export function _toJava(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);
  const url = request.urls[0];

  const imports = new Set<string>([
    "java.net.URI",
    "java.net.http.HttpClient",
    "java.net.http.HttpRequest",
    "java.net.http.HttpResponse",
    "java.io.IOException",
  ]);

  let javaCode = "";

  javaCode += "HttpClient client = ";

  const clientLines = [];
  if (request.followRedirects) {
    // .NEVER is the default
    // .ALWAYS will follow redirect from HTTPS to HTTP, which isn't what --location-trusted does
    clientLines.push("    .followRedirects(HttpClient.Redirect.NORMAL)\n");
  } else if (request.followRedirects === false) {
    clientLines.push("    .followRedirects(HttpClient.Redirect.NEVER)\n");
  }
  if (request.connectTimeout) {
    // TODO: won't work if it's a float
    clientLines.push(
      "    .connectTimeout(Duration.ofSeconds(" +
        request.connectTimeout.toString() +
        "))\n",
    );
    imports.add("java.time.Duration");
  }
  // TODO: Proxy
  if (clientLines.length) {
    javaCode += "HttpClient.newBuilder()\n";
    for (const line of clientLines) {
      javaCode += line;
    }
    javaCode += "    .build()";
  } else {
    javaCode += "HttpClient.newHttpClient()";
  }
  javaCode += ";\n";
  javaCode += "\n";

  const methodCallArgs = [];
  if (url.uploadFile) {
    if (eq(url.uploadFile, "-") || eq(url.uploadFile, ".")) {
      warnings.push(["upload-stdin", "uploading from stdin isn't supported"]);
    }
    methodCallArgs.push(
      "BodyPublishers.ofFile(Paths.get(" + repr(url.uploadFile, imports) + "))",
    );
    imports.add("java.net.http.HttpRequest.BodyPublishers");
    imports.add("java.nio.file.Paths");
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    // TODO: surely --upload-file and this can't be identical,
    // doesn't this ignore url encoding?
    methodCallArgs.push(
      "BodyPublishers.ofFile(Paths.get(" +
        repr(request.dataArray[0].filename, imports) +
        "))",
    );
    imports.add("java.net.http.HttpRequest.BodyPublishers");
    imports.add("java.nio.file.Paths");
  } else if (request.data) {
    methodCallArgs.push(
      "BodyPublishers.ofString(" + repr(request.data, imports) + ")",
    );
    imports.add("java.net.http.HttpRequest.BodyPublishers");
  }

  if (url.auth) {
    const [name, password] = url.auth;
    javaCode +=
      "String credentials = " +
      repr(name, imports) +
      ' + ":" + ' +
      repr(password, imports) +
      ";\n";
    javaCode +=
      'String auth = "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes());\n\n';
    imports.add("java.util.Base64");

    if (request.authType !== "basic") {
      warnings.push([
        "unsupported-auth-type",
        `"${request.authType}" authentication is not supported`,
      ]);
    }
  }

  javaCode += "HttpRequest request = HttpRequest.newBuilder()\n";
  javaCode += "    .uri(URI.create(" + repr(url.url, imports) + "))\n";
  const methods = ["DELETE", "GET", "POST", "PUT"];
  const dataMethods = ["POST", "PUT"];
  const method = url.method;
  let methodCall = "method";
  if (
    !method.isString() ||
    !methods.includes(method.toString()) ||
    // If we appended something to methodCallArgs it means we need to send data
    (methodCallArgs.length && !dataMethods.includes(method.toString()))
  ) {
    if (!methodCallArgs.length) {
      methodCallArgs.push("HttpRequest.BodyPublishers.noBody()");
    }
    methodCallArgs.unshift(repr(method, imports));
  } else {
    if (!methodCallArgs.length && dataMethods.includes(method.toString())) {
      methodCallArgs.push("HttpRequest.BodyPublishers.noBody()");
    }
    methodCall = method.toString();
  }
  javaCode += "    ." + methodCall + "(" + methodCallArgs.join(", ") + ")\n";

  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }
      javaCode +=
        "    .setHeader(" +
        repr(headerName, imports) +
        ", " +
        repr(headerValue, imports) +
        ")\n";
    }
  }
  if (url.auth) {
    const authHeader = request.headers.lowercase
      ? "authorization"
      : "Authorization";
    javaCode += '    .setHeader("' + authHeader + '", auth)\n';
  }

  if (request.http2) {
    javaCode += "    .version(HttpClient.Version.HTTP_2)\n";
    // TODO: more granular control
  }
  if (request.timeout) {
    // TODO: won't work if it's a float
    javaCode +=
      "    .timeout(Duration.ofSeconds(" + request.timeout.toString() + "))\n";
    imports.add("java.time.Duration");
  }

  javaCode += "    .build();\n";
  javaCode += "\n";
  javaCode +=
    "HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n";

  let preambleCode = "";
  for (const imp of Array.from(imports).sort()) {
    preambleCode += "import " + imp + ";\n";
  }
  if (imports.size) {
    preambleCode += "\n";
  }

  // preambleCode += "class Main {\n";
  if (imports.has("java.lang.Runtime")) {
    // Helper function that runs a bash command and always returns a string
    preambleCode += "public static String exec(String cmd) {\n";
    preambleCode += "    try {\n";
    preambleCode += "        Process p = Runtime.getRuntime().exec(cmd);\n";
    preambleCode += "        p.waitFor();\n";
    preambleCode +=
      '        Scanner s = new Scanner(p.getInputStream()).useDelimiter("\\\\A");\n';
    preambleCode += '        return s.hasNext() ? s.next() : "";\n';
    preambleCode += "    } catch (Exception e) {\n";
    preambleCode += '        return "";\n';
    preambleCode += "    }\n";
    preambleCode += "}\n";
    preambleCode += "\n";
  }
  // preambleCode +=
  //   "    public static void main(String[] args) throws Exception {\n";

  // return preambleCode + javaCode + "    }\n" + "}" + "\n";
  return preambleCode + javaCode;
}
export function toJavaWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const java = _toJava(requests, warnings);
  return [java, warnings];
}

export function toJava(curlCommand: string | string[]): string {
  return toJavaWarn(curlCommand)[0];
}
