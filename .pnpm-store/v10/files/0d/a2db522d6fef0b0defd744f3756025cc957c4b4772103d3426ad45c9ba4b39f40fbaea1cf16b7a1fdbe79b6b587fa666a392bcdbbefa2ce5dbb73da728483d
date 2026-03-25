import { joinWords } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";

import { repr } from "./java.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  // TODO
  // "form",
  // "form-string",
]);

export function _toJavaHttpUrlConnection(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  const imports = new Set<string>([
    "java.io.IOException",
    "java.io.InputStream",
    "java.net.HttpURLConnection",
    "java.net.URL",
    "java.util.Scanner",
  ]);

  let javaCode = "";

  javaCode +=
    "        URL url = new URL(" + repr(request.urls[0].url, imports) + ");\n";
  javaCode +=
    "        HttpURLConnection httpConn = (HttpURLConnection) url.openConnection();\n";
  javaCode +=
    "        httpConn.setRequestMethod(" +
    repr(request.urls[0].method, imports) +
    ");\n\n";

  let gzip = false;
  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue;
      }
      javaCode +=
        "        httpConn.setRequestProperty(" +
        repr(headerName, imports) +
        ", " +
        repr(headerValue, imports) +
        ");\n";
      if (
        headerName.toLowerCase().toString() === "accept-encoding" &&
        headerValue
      ) {
        gzip = headerValue.indexOf("gzip") !== -1;
      }
    }
    javaCode += "\n";
  }

  if (request.urls[0].auth) {
    javaCode +=
      "        byte[] message = (" +
      repr(joinWords(request.urls[0].auth, ":"), imports) +
      ').getBytes("UTF-8");\n';
    javaCode +=
      "        String basicAuth = DatatypeConverter.printBase64Binary(message);\n";
    javaCode +=
      '        httpConn.setRequestProperty("Authorization", "Basic " + basicAuth);\n';
    javaCode += "\n";

    imports.add("javax.xml.bind.DatatypeConverter");
  }

  if (request.data) {
    javaCode += "        httpConn.setDoOutput(true);\n";
    javaCode +=
      "        OutputStreamWriter writer = new OutputStreamWriter(httpConn.getOutputStream());\n";
    javaCode += "        writer.write(" + repr(request.data, imports) + ");\n";
    javaCode += "        writer.flush();\n";
    javaCode += "        writer.close();\n";
    javaCode += "        httpConn.getOutputStream().close();\n";
    javaCode += "\n";

    imports.add("java.io.OutputStreamWriter");
  }

  javaCode +=
    "        InputStream responseStream = httpConn.getResponseCode() / 100 == 2\n";
  javaCode += "                ? httpConn.getInputStream()\n";
  javaCode += "                : httpConn.getErrorStream();\n";
  if (gzip) {
    javaCode += '        if ("gzip".equals(httpConn.getContentEncoding())) {\n';
    javaCode +=
      "            responseStream = new GZIPInputStream(responseStream);\n";
    javaCode += "        }\n";

    imports.add("java.util.zip.GZIPInputStream");
  }
  javaCode +=
    '        Scanner s = new Scanner(responseStream).useDelimiter("\\\\A");\n';
  javaCode += '        String response = s.hasNext() ? s.next() : "";\n';
  javaCode += "        System.out.println(response);\n";

  javaCode += "    }\n";
  javaCode += "}";

  let preambleCode = "";
  for (const imp of Array.from(imports).sort()) {
    preambleCode += "import " + imp + ";\n";
  }
  if (imports.size) {
    preambleCode += "\n";
  }

  preambleCode += "class Main {\n";
  preambleCode += "\n";
  if (imports.has("java.lang.Runtime")) {
    // Helper function that runs a bash command and always returns a string
    preambleCode += "    public static String exec(String cmd) {\n";
    preambleCode += "        try {\n";
    preambleCode += "            Process p = Runtime.getRuntime().exec(cmd);\n";
    preambleCode += "            p.waitFor();\n";
    preambleCode +=
      '            Scanner s = new Scanner(p.getInputStream()).useDelimiter("\\\\A");\n';
    preambleCode += '            return s.hasNext() ? s.next() : "";\n';
    preambleCode += "        } catch (Exception e) {\n";
    preambleCode += '            return "";\n';
    preambleCode += "        }\n";
    preambleCode += "    }\n";
    preambleCode += "\n";
  }
  preambleCode +=
    "    public static void main(String[] args) throws IOException {\n";

  return preambleCode + javaCode + "\n";
}
export function toJavaHttpUrlConnectionWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const java = _toJavaHttpUrlConnection(requests, warnings);
  return [java, warnings];
}

export function toJavaHttpUrlConnection(
  curlCommand: string | string[],
): string {
  return toJavaHttpUrlConnectionWarn(curlCommand)[0];
}
