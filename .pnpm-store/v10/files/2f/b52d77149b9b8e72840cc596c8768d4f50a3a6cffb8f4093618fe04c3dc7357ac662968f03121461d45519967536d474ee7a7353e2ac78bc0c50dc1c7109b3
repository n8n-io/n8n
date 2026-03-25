import { joinWords, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";

import { repr } from "./java.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,

  "form",
  "form-string",

  "max-time",
]);

export const _toJavaJsoup = (
  requests: Request[],
  warnings: Warnings = [],
): string => {
  const request = getFirst(requests, warnings);

  const imports = new Set<string>([
    "java.io.IOException",
    "java.io.File",
    "java.io.FileInputStream",
    "org.jsoup.Jsoup",
    "org.jsoup.Connection",
  ]);

  let javaCode = "";

  javaCode += "\nclass Main {\n\n";

  javaCode += "\tpublic static void main(String[] args) throws IOException {\n";

  if (request.urls[0].auth) {
    javaCode +=
      "\t\tbyte[] message = (" +
      repr(joinWords(request.urls[0].auth, ":"), imports) +
      ').getBytes("UTF-8");\n';
    javaCode +=
      "\t\tString basicAuth = DatatypeConverter.printBase64Binary(message);\n";
    javaCode += "\n";
    imports.add("javax.xml.bind.DatatypeConverter");
  }

  javaCode +=
    "\t\tConnection.Response response = Jsoup.connect(" +
    repr(request.urls[0].url, imports) +
    ")\n";

  if (request.headers) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }

      if (eq(headerName.toLowerCase(), "user-agent")) {
        javaCode +=
          "\t\t\t.userAgent" + "(" + repr(headerValue, imports) + ")\n";
      } else if (eq(headerName.toLowerCase(), "cookie")) {
        const cookieValues = headerValue.split(";");
        for (const index in cookieValues) {
          javaCode +=
            "\t\t\t.cookie(" +
            repr(cookieValues[index].split("=")[0].trim(), imports) +
            ", " +
            repr(cookieValues[index].split("=")[1].trim(), imports) +
            ")\n";
        }
      } else {
        javaCode +=
          "\t\t\t.header(" +
          repr(headerName, imports) +
          ", " +
          repr(headerValue, imports) +
          ")\n";
      }
    }
  }
  if (request.urls[0].auth) {
    javaCode += '\t\t\t.header("Authorization", "Basic " + basicAuth)\n';
  }

  if (request.multipartUploads) {
    javaCode += "\t\t\t.data(";

    for (const m of request.multipartUploads) {
      const name = m.name;
      const fileInputStream = "new FileInputStream(new File(";
      const fileName = "filename";
      if ("contentFile" in m) {
        if (eq(m.contentFile, "-")) {
          if (request.stdinFile) {
            javaCode +=
              repr(name, imports) +
              '", "' +
              fileName +
              '", ' +
              fileInputStream +
              repr(request.stdinFile, imports);
          } else if (request.stdin) {
            javaCode +=
              repr(name, imports) +
              '", "' +
              fileName +
              '", ' +
              fileInputStream +
              repr(request.stdin, imports);
          }
        } else {
          javaCode +=
            repr(name, imports) +
            '", "' +
            fileName +
            '", ' +
            fileInputStream +
            repr(m.contentFile, imports);
        }
      } else {
        javaCode +=
          repr(name, imports) +
          '", "' +
          fileName +
          '",' +
          fileInputStream +
          repr(m.content, imports);
      }
    }
    javaCode += ")))\n";
  } else if (request.data) {
    javaCode += "\t\t\t.requestBody(" + repr(request.data, imports) + ")\n";
  }

  // TODO: check method const exists
  javaCode +=
    "\t\t\t.method(org.jsoup.Connection.Method." +
    request.urls[0].method.toString() +
    ")\n";
  javaCode += "\t\t\t.ignoreContentType(true)\n";
  if (request.timeout) {
    // TODO: multiply by 1000
    javaCode += "\t\t\t.timeout(" + request.timeout.toString() + " * 1000)\n";
  }
  javaCode += "\t\t\t.execute();\n\n";
  javaCode += "\t\tSystem.out.println(response.parse());\n";

  javaCode += "\t}\n";
  javaCode += "}";

  let preambleCode = "";
  for (const imp of Array.from(imports).sort()) {
    preambleCode += "import " + imp + ";\n";
  }
  if (imports.size) {
    preambleCode += "\n";
  }

  return preambleCode + javaCode + "\n";
};
export const toJavaJsoupWarn = (
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] => {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const java = _toJavaJsoup(requests, warnings);
  return [java, warnings];
};

export const toJavaJsoup = (curlCommand: string | string[]): string => {
  return toJavaJsoupWarn(curlCommand)[0];
};
