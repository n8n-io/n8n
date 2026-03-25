import { Word } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

import { esc as jsesc } from "./javascript/javascript.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "max-time",
  "proxy",
  "proxy-user",
]);

function repr(w: Word | string): string {
  if (typeof w !== "string" && !w.isString()) {
    // TODO: warn
  }
  let s = w.toString();
  let quote: "'" | '"' = '"';
  if (s.includes('"') && !s.includes("'")) {
    quote = "'";
  }

  // TODO: CFML doesn't support backslash escapes such as \n
  s = jsesc(s, quote).replace(/#/g, "##");
  if (quote === '"') {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return "'" + s.replace(/'/g, "''") + "'";
}

export function _toCFML(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);

  let cfmlCode = "";

  cfmlCode += "httpService = new http();\n";
  cfmlCode += "httpService.setUrl(" + repr(request.urls[0].url) + ");\n";
  cfmlCode += "httpService.setMethod(" + repr(request.urls[0].method) + ");\n";

  if (request.cookies) {
    for (const [headerName, headerValue] of request.cookies) {
      cfmlCode +=
        'httpService.addParam(type="cookie", name=' +
        repr(headerName) +
        ", value=" +
        repr(headerValue) +
        ");\n";
    }
    request.headers.delete("Cookie");
  }

  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      cfmlCode +=
        'httpService.addParam(type="header", name=' +
        repr(headerName) +
        ", value=" +
        repr(headerValue || new Word()) +
        ");\n";
    }
  }

  if (request.timeout) {
    cfmlCode +=
      "httpService.setTimeout(" +
      (parseInt(request.timeout.toString(), 10) || 0) +
      ");\n";
  }

  if (request.urls[0].auth) {
    const [authUser, authPassword] = request.urls[0].auth;
    cfmlCode += "httpService.setUsername(" + repr(authUser) + ");\n";
    cfmlCode += "httpService.setPassword(" + repr(authPassword || "") + ");\n";
  }

  if (request.proxy) {
    const p = request.proxy.toString();
    let proxy = p;
    let proxyPort = "1080";
    const proxyPart = p.match(/:([0-9]+)/);
    if (proxyPart) {
      proxy = p.slice(0, proxyPart.index);
      proxyPort = proxyPart[1];
    }

    cfmlCode += "httpService.setProxyServer(" + repr(proxy) + ");\n";
    cfmlCode += "httpService.setProxyPort(" + proxyPort.trim() + ");\n";

    if (request.proxyAuth) {
      const [proxyUser, proxyPassword] = request.proxyAuth.split(":", 2);
      cfmlCode += "httpService.setProxyUser(" + repr(proxyUser) + ");\n";
      cfmlCode +=
        "httpService.setProxyPassword(" + repr(proxyPassword || "") + ");\n";
    }
  }

  if (request.data || request.multipartUploads) {
    if (request.multipartUploads) {
      for (const m of request.multipartUploads) {
        if ("contentFile" in m) {
          cfmlCode +=
            'httpService.addParam(type="file", name=' +
            repr(m.name) +
            ', file="#expandPath(' +
            repr(m.contentFile) +
            ')#");\n';
        } else {
          cfmlCode +=
            'httpService.addParam(type="formfield", name=' +
            repr(m.name) +
            ", value=" +
            repr(m.content) +
            ");\n";
        }
      }
    } else if (
      !request.isDataRaw &&
      request.data &&
      request.data.charAt(0) === "@"
    ) {
      cfmlCode +=
        'httpService.addParam(type="body", value="#' +
        (request.isDataBinary ? "fileReadBinary" : "fileRead") +
        "(expandPath(" +
        repr(request.data.toString().substring(1)) +
        '))#");\n';
    } else {
      cfmlCode +=
        'httpService.addParam(type="body", value=' +
        repr(request.data!) +
        ");\n";
    }
  }

  cfmlCode += "\nresult = httpService.send().getPrefix();\n";
  cfmlCode += "writeDump(result);\n";

  return cfmlCode;
}

export function toCFMLWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const cfml = _toCFML(requests, warnings);
  return [cfml, warnings];
}

export function toCFML(curlCommand: string | string[]): string {
  return toCFMLWarn(curlCommand)[0];
}
