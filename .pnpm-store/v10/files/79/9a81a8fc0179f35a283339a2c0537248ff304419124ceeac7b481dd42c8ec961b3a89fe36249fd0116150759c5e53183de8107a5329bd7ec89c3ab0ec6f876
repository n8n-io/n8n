import { Word, eq } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";
import { parseQueryString } from "../Query.js";

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

// The only difference from Java is that in Kotlin the $ needs to be escaped
// https://kotlinlang.org/docs/java-to-kotlin-idioms-strings.html#concatenate-strings
// https://docs.oracle.com/javase/specs/jls/se7/html/jls-3.html#jls-3.10.6
// https://docs.oracle.com/javase/specs/jls/se7/html/jls-3.html#jls-3.3
const regexEscape = /\$|"|\\|\p{C}|[^ \P{Z}]/gu;
const regexDigit = /[0-9]/; // it's 0-7 actually but that would generate confusing code
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string, index: number, string: string) => {
      switch (c) {
        case "$":
          return "\\$";
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

// TODO: anything different here?
export function repr(w: Word, imports: Set<string>): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      args.push("System.getenv(" + reprStr(t.value) + ') ?: ""');
      imports.add("java.lang.System");
    } else {
      args.push("exec(" + reprStr(t.value) + ")");
      imports.add("java.lang.Runtime");
      imports.add("java.util.Scanner");
    }
  }
  return args.join(" + ");
}

export function _toKotlin(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const url = request.urls[0];

  const imports = new Set<string>([
    "java.io.IOException",
    "okhttp3.OkHttpClient",
    "okhttp3.Request",
  ]);

  let kotlinCode = "";

  kotlinCode += "val client = OkHttpClient()";
  const clientLines = [];
  if (request.timeout) {
    // TODO: floats don't work here
    clientLines.push(
      "  .callTimeout(" + request.timeout.toString() + ", TimeUnit.SECONDS)\n",
    );
    imports.add("java.util.concurrent.TimeUnit");
  }
  if (request.connectTimeout) {
    clientLines.push(
      "  .connectTimeout(" +
        request.connectTimeout.toString() +
        ", TimeUnit.SECONDS)\n",
    );
    imports.add("java.util.concurrent.TimeUnit");
  }
  if (request.followRedirects === false) {
    clientLines.push("  .followRedirects(false)\n");
    clientLines.push("  .followSslRedirects(false)\n");
  }
  // TODO: Proxy
  if (clientLines.length) {
    kotlinCode += ".newBuilder()\n";
    for (const line of clientLines) {
      kotlinCode += line;
    }
    kotlinCode += "  .build()";
  }
  kotlinCode += "\n\n";

  if (url.auth) {
    const [name, password] = url.auth;
    kotlinCode +=
      "val credential = Credentials.basic(" +
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
  const contentType = request.headers.getContentType();
  const exactContentType = request.headers.get("content-type");
  if (url.uploadFile) {
    if (eq(url.uploadFile, "-") || eq(url.uploadFile, ".")) {
      warnings.push(["upload-stdin", "uploading from stdin isn't supported"]);
    }
    if (exactContentType) {
      kotlinCode +=
        "val MEDIA_TYPE = " +
        repr(exactContentType, imports) +
        ".toMediaType()\n\n";
      imports.add("okhttp3.MediaType.Companion.toMediaType");
    }
    methodCallArgs.push("file.asRequestBody(MEDIA_TYPE)");
    kotlinCode += "val file = File(" + repr(url.uploadFile, imports) + ")\n\n";
    imports.add("java.io.File");
    imports.add("okhttp3.RequestBody.Companion.asRequestBody");
  } else if (request.multipartUploads) {
    methodCallArgs.push("requestBody");
    kotlinCode += "val requestBody = MultipartBody.Builder()\n";
    kotlinCode += "  .setType(MultipartBody.FORM)\n";
    for (const m of request.multipartUploads) {
      const args = [repr(m.name, imports)];
      if ("content" in m) {
        args.push(repr(m.content, imports));
      } else {
        if ("filename" in m && m.filename) {
          args.push(repr(m.filename, imports));
          args.push(
            "File(" + repr(m.contentFile, imports) + ").asRequestBody()", // TODO: content type here
          );
          imports.add("java.io.File");
          imports.add("okhttp3.RequestBody.Companion.asRequestBody");
        } else {
          // TODO: import
          // TODO: probably doesn't work
          args.push("Files.readAllBytes(" + repr(m.contentFile, imports) + ")");
        }
      }
      kotlinCode += "  .addFormDataPart(" + args.join(", ") + ")\n";
    }
    kotlinCode += "  .build()\n\n";
    imports.add("okhttp3.MultipartBody");
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    // TODO: surely --upload-file and this can't be identical,
    // doesn't this ignore url encoding?
    if (exactContentType) {
      kotlinCode +=
        "val MEDIA_TYPE = " +
        repr(exactContentType, imports) +
        ".toMediaType()\n\n";
      imports.add("okhttp3.MediaType.Companion.toMediaType");
    }
    methodCallArgs.push("file.asRequestBody(MEDIA_TYPE)");
    imports.add("okhttp3.RequestBody.Companion.asRequestBody");
    kotlinCode +=
      "val file = File(" +
      repr(request.dataArray[0].filename, imports) +
      ")\n\n";
    imports.add("java.io.File");
  } else if (request.data) {
    if (contentType === "application/x-www-form-urlencoded") {
      const [queryList] = parseQueryString(request.data);
      if (!queryList) {
        if (exactContentType) {
          kotlinCode +=
            "val MEDIA_TYPE = " +
            repr(exactContentType, imports) +
            ".toMediaType()\n\n";
          imports.add("okhttp3.MediaType.Companion.toMediaType");
        }
        methodCallArgs.push("requestBody.toRequestBody(MEDIA_TYPE)");
        imports.add("okhttp3.RequestBody.Companion.toRequestBody");
        kotlinCode +=
          "val requestBody = " + repr(request.data, imports) + "\n\n";
      } else {
        methodCallArgs.push("formBody");
        kotlinCode += "val formBody = FormBody.Builder()\n";
        for (const [name, value] of queryList) {
          kotlinCode +=
            "  .add(" +
            repr(name, imports) +
            ", " +
            repr(value, imports) +
            ")\n";
        }
        kotlinCode += "  .build()\n\n";
        imports.add("okhttp3.FormBody");
      }
    } else {
      if (exactContentType) {
        kotlinCode +=
          "val MEDIA_TYPE = " +
          repr(exactContentType, imports) +
          ".toMediaType()\n\n";
        imports.add("okhttp3.MediaType.Companion.toMediaType");
      }
      methodCallArgs.push("requestBody.toRequestBody(MEDIA_TYPE)");
      kotlinCode += "val requestBody = " + repr(request.data, imports) + "\n\n";
      imports.add("okhttp3.RequestBody.Companion.toRequestBody");
    }
  }

  kotlinCode += "val request = Request.Builder()\n";
  kotlinCode += "  .url(" + repr(url.url, imports) + ")\n";
  const methods = ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"];
  const dataMethods = ["DELETE", "PATCH", "POST", "PUT"];
  const requiredDataMethods = ["PATCH", "POST", "PUT"];
  const method = url.method;
  const methodStr = url.method.toString();
  let methodCall = "method";
  if (
    !method.isString() ||
    !methods.includes(methodStr) ||
    // If we appended something to methodCallArgs it means we need to send data
    (methodCallArgs.length && !dataMethods.includes(methodStr)) ||
    (!methodCallArgs.length && requiredDataMethods.includes(methodStr))
  ) {
    if (!methodCallArgs.length) {
      methodCallArgs.push('"".toRequestBody()');
      imports.add("okhttp3.RequestBody.Companion.toRequestBody");
    }
    methodCallArgs.unshift(repr(method, imports));
  } else {
    if (methodStr === "DELETE" && !methodCallArgs.length) {
      methodCallArgs.push('"".toRequestBody()');
      imports.add("okhttp3.RequestBody.Companion.toRequestBody");
    }
    methodCall = method.toString().toLowerCase();
  }
  if (methodCall !== "get") {
    kotlinCode += "  ." + methodCall + "(" + methodCallArgs.join(", ") + ")\n";
  }

  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }
      kotlinCode +=
        "  .header(" +
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
    kotlinCode += '  .header("' + authHeader + '", credential)\n';
  }

  kotlinCode += "  .build()\n";

  kotlinCode += "\n";
  kotlinCode += "client.newCall(request).execute().use { response ->\n";
  kotlinCode +=
    '  if (!response.isSuccessful) throw IOException("Unexpected code $response")\n';
  kotlinCode += "  response.body!!.string()\n";
  kotlinCode += "}\n";

  let preambleCode = "";
  for (const imp of Array.from(imports).sort()) {
    preambleCode += "import " + imp + "\n";
  }
  if (imports.size) {
    preambleCode += "\n";
  }

  // TODO
  if (imports.has("java.lang.Runtime")) {
    // Helper function that runs a bash command and always returns a string
    preambleCode += "fun exec(cmd: String): String {\n";
    preambleCode += "  try {\n";
    preambleCode += "    val p = Runtime.getRuntime().exec(cmd)\n";
    preambleCode += "    p.waitFor()\n";
    preambleCode +=
      '    val s = Scanner(p.getInputStream()).useDelimiter("\\\\A")\n';
    preambleCode += '    return s.hasNext() ? s.next() : ""\n';
    preambleCode += "  } catch (Exception e) {\n";
    preambleCode += '    return ""\n';
    preambleCode += "  }\n";
    preambleCode += "}\n";
    preambleCode += "\n";
  }

  return preambleCode + kotlinCode;
}
export function toKotlinWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const kotlin = _toKotlin(requests, warnings);
  return [kotlin, warnings];
}

export function toKotlin(curlCommand: string | string[]): string {
  return toKotlinWarn(curlCommand)[0];
}
