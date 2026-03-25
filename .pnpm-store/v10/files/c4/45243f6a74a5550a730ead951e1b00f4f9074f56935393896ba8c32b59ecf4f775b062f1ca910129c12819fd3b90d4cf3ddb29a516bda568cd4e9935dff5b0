import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import { repr } from "./java.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "connect-timeout",
  "location",
  "location-trusted",
  "upload-file",
  "form",
  "form-string",
]);

export function _toJavaOkHttp(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const url = request.urls[0];

  const imports = new Set<string>([
    "java.io.IOException",
    "okhttp3.OkHttpClient",
    "okhttp3.Request",
    "okhttp3.Response",
  ]);

  let javaCode = "";

  javaCode += "OkHttpClient client = new OkHttpClient()";
  const clientLines = [];
  if (request.timeout) {
    clientLines.push(
      "    .callTimeout(" +
        request.timeout.toString() +
        ", TimeUnit.SECONDS)\n",
    );
    imports.add("java.util.concurrent.TimeUnit");
  }
  if (request.connectTimeout) {
    clientLines.push(
      "    .connectTimeout(" +
        request.connectTimeout.toString() +
        ", TimeUnit.SECONDS)\n",
    );
    imports.add("java.util.concurrent.TimeUnit");
  }
  if (request.followRedirects === false) {
    clientLines.push("    .followRedirects(false)\n");
    clientLines.push("    .followSslRedirects(false)\n");
  }
  // TODO: Proxy
  if (clientLines.length) {
    javaCode += ".newBuilder()\n";
    for (const line of clientLines) {
      javaCode += line;
    }
    javaCode += "    .build()";
  }
  javaCode += ";\n";
  javaCode += "\n";

  if (url.auth) {
    const [name, password] = url.auth;
    javaCode +=
      "String credential = Credentials.basic(" +
      repr(name, imports) +
      ", " +
      repr(password, imports) +
      ");\n\n";
    imports.add("okhttp3.Credentials");

    if (request.authType !== "basic") {
      warnings.push([
        "okhttp-unsupported-auth-type",
        "OkHttp doesn't support auth type " + request.authType,
      ]);
    }
  }

  const methodCallArgs = [];
  if (url.uploadFile) {
    if (eq(url.uploadFile, "-") || eq(url.uploadFile, ".")) {
      warnings.push(["upload-stdin", "uploading from stdin isn't supported"]);
    }
    methodCallArgs.push("file");
    javaCode +=
      "File file = new File(" + repr(url.uploadFile, imports) + ");\n\n";
    imports.add("java.io.File");
  } else if (request.multipartUploads) {
    methodCallArgs.push("requestBody");
    javaCode += "RequestBody requestBody = new MultipartBody.Builder()\n";
    javaCode += "    .setType(MultipartBody.FORM)\n";
    for (const m of request.multipartUploads) {
      const args = [repr(m.name, imports)];
      if ("content" in m) {
        args.push(repr(m.content, imports));
      } else {
        if ("filename" in m && m.filename) {
          if (!eq(m.filename, m.contentFile)) {
            args.push(repr(m.filename, imports));
          }
          args.push(
            "RequestBody.create(" +
              '"", ' + // TODO: this is the media type
              "new File(" +
              repr(m.contentFile, imports) +
              "))",
          );
          imports.add("java.io.File");
        } else {
          // TODO: import
          // TODO: probably doesn't work
          args.push("Files.readAllBytes(" + repr(m.contentFile, imports) + ")");
        }
      }
      javaCode += "    .addFormDataPart(" + args.join(", ") + ")\n";
    }
    javaCode += "    .build();\n\n";
    imports.add("okhttp3.RequestBody");
    imports.add("okhttp3.MultipartBody");
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    // TODO: surely --upload-file and this can't be identical,
    // doesn't this ignore url encoding?
    methodCallArgs.push("file");
    javaCode +=
      "File file = new File(" +
      repr(request.dataArray[0].filename, imports) +
      ");\n\n";
    imports.add("java.io.File");
  } else if (request.data) {
    const contentType = request.headers.getContentType();
    if (contentType === "application/x-www-form-urlencoded") {
      const [queryList] = parseQueryString(request.data);
      if (!queryList) {
        methodCallArgs.push("requestBody");
        javaCode +=
          "String requestBody = " + repr(request.data, imports) + ";\n\n";
      } else {
        methodCallArgs.push("formBody");
        javaCode += "RequestBody formBody = new FormBody.Builder()\n";
        for (const [name, value] of queryList) {
          javaCode +=
            "    .add(" +
            repr(name, imports) +
            ", " +
            repr(value, imports) +
            ")\n";
        }
        javaCode += "    .build();\n\n";
        imports.add("okhttp3.FormBody");
        imports.add("okhttp3.RequestBody");
      }
    } else {
      methodCallArgs.push("requestBody");
      javaCode +=
        "String requestBody = " + repr(request.data, imports) + ";\n\n";
    }
  }

  javaCode += "Request request = new Request.Builder()\n";
  javaCode += "    .url(" + repr(url.url, imports) + ")\n";
  const methods = ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"];
  const dataMethods = ["DELETE", "PATCH", "POST", "PUT"];
  const method = url.method;
  let methodCall = "method";
  if (
    !method.isString() ||
    !methods.includes(method.toString()) ||
    // If we appended something to methodCallArgs it means we need to send data
    (methodCallArgs.length && !dataMethods.includes(method.toString()))
  ) {
    methodCallArgs.unshift(repr(method, imports));
  } else {
    methodCall = method.toString().toLowerCase();
  }
  if (methodCall !== "get") {
    javaCode += "    ." + methodCall + "(" + methodCallArgs.join(", ") + ")\n";
  }

  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }
      javaCode +=
        "    .header(" +
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
    javaCode += '    .header("' + authHeader + '", credential)\n';
  }

  javaCode += "    .build();\n";

  javaCode += "\n";
  javaCode += "try (Response response = client.newCall(request).execute()) {\n";
  javaCode +=
    '    if (!response.isSuccessful()) throw new IOException("Unexpected code " + response);\n';
  javaCode += "    response.body().string();\n";
  javaCode += "}\n";

  let preambleCode = "";
  for (const imp of Array.from(imports).sort()) {
    preambleCode += "import " + imp + ";\n";
  }
  if (imports.size) {
    preambleCode += "\n";
  }

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

  return preambleCode + javaCode + "\n";
}
export function toJavaOkHttpWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const java = _toJavaOkHttp(requests, warnings);
  return [java, warnings];
}

export function toJavaOkHttp(curlCommand: string | string[]): string {
  return toJavaOkHttpWarn(curlCommand)[0];
}
