import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import { eq } from "../../shell/Word.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import { reprStr, repr } from "./php.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",

  "digest",
  "no-digest",
  "ntlm",
  "no-ntlm",
  "ntlm-wb",
  "no-ntlm-wb",

  "http3",
  "http3-only",
  "http2",
  "http2-prior-knowledge",

  "max-time",
  "connect-timeout",

  "insecure",
  "no-insecure",
  "cacert",
  "capath",
  "cert",
  "key",

  "compressed", // TODO: check behavior
  "no-compressed",

  "location",
  "no-location",

  "proxy",
  "noproxy",
]);

function removeTrailingComma(str: string): string {
  if (str.endsWith(",\n")) {
    return str.slice(0, -2) + "\n";
  }
  return str;
}

function jsonToPhp(obj: any, indent = 0): string {
  if (obj === null) {
    return "null";
  }
  if (typeof obj === "boolean") {
    return obj ? "true" : "false";
  }
  if (typeof obj === "number") {
    return obj.toString();
  }
  if (typeof obj === "string") {
    return reprStr(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return "[]";
    }
    let str = "[\n";
    for (const item of obj) {
      str += " ".repeat(indent + 4);
      str += jsonToPhp(item, indent + 4);
      str += ",\n";
    }
    str = removeTrailingComma(str);
    str += " ".repeat(indent);
    str += "]";
    return str;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return "new stdClass()";
    }
    let str = "[\n";
    for (const [key, value] of entries) {
      str += " ".repeat(indent + 4);
      str += reprStr(key);
      str += " => ";
      str += jsonToPhp(value, indent + 4);
      str += ",\n";
    }
    str = removeTrailingComma(str);
    str += " ".repeat(indent);
    str += "]";
    return str;
  }
  throw new Error("Unknown type");
}

function jsonStrToPhp(obj: string, indent = 0): [string, boolean] {
  const json = JSON.parse(obj);
  if (json === null) {
    throw new Error("null as a top level JSON object doesn't work");
  }
  const jsonAsPhp = jsonToPhp(json, indent);
  const roundtrips = JSON.stringify(json) === obj;
  return [jsonAsPhp, roundtrips];
}

export function _toPhpGuzzle(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const url = request.urls[0].queryDict
    ? request.urls[0].urlWithoutQueryList
    : request.urls[0].url;
  const method = request.urls[0].method;

  const imports = new Set<string>(["GuzzleHttp\\Client"]);

  let guzzleCode = "$client = new Client();\n\n";
  guzzleCode += "$response = $client->";

  const methods = ["GET", "DELETE", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"];
  if (method.isString() && methods.includes(method.toString())) {
    guzzleCode += method.toString().toLowerCase() + "(";
  } else {
    guzzleCode += "request(" + repr(method) + ", ";
  }

  let options = "";

  if (request.urls[0].queryDict) {
    options += "    'query' => [\n";
    for (const [name, value] of request.urls[0].queryDict) {
      options += `        ${repr(name)} => `;
      if (Array.isArray(value)) {
        options += "[\n";
        for (const v of value) {
          options += `            ${repr(v)},\n`;
        }
        options = removeTrailingComma(options);
        options += "        ],\n";
      } else {
        options += `${repr(value)},\n`;
      }
    }
    options = removeTrailingComma(options);
    options += "    ],\n";
  }

  if (request.headers.length) {
    const headerReprs = [];
    for (const [name, value] of request.headers) {
      if (value === null) {
        continue;
      }
      headerReprs.push([repr(name), repr(value)]);
    }

    if (headerReprs.length) {
      const longestHeader = Math.max(...headerReprs.map((h) => h[0].length));
      options += "    'headers' => [\n";
      for (const [name, value] of headerReprs) {
        options += `        ${name.padEnd(longestHeader)} => ${value},\n`;
      }
      options = removeTrailingComma(options);
      options += "    ],\n";
    }
  }

  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;
    options += `    'auth' => [${repr(user)}, ${repr(password)}`;
    switch (request.authType) {
      case "basic":
      case "none": // shouldn't happen?
        break;
      case "digest":
        options += ", 'digest'";
        break;
      case "ntlm":
      case "ntlm-wb":
        options += ", 'ntlm'";
        break;
      default:
        warnings.push([
          "unsupported-auth-type",
          "Guzzle does not support ${request.authType} authentication",
        ]);
        break;
    }

    options += "],\n";
  }

  // TODO: \GuzzleHttp\Cookie\CookieJar::fromArray

  if (request.urls[0].uploadFile) {
    options += `    'body' => Psr7\\Utils::tryFopen(${repr(
      request.urls[0].uploadFile,
    )}, 'r')\n`;
    imports.add("GuzzleHttp\\Psr7");
  } else if (request.multipartUploads) {
    options += "    'multipart' => [\n";
    for (const m of request.multipartUploads) {
      options += "        [\n";
      options += `            'name' => ${repr(m.name)},\n`;

      if ("content" in m) {
        options += `            'contents' => ${repr(m.content)},\n`;
      } else {
        if (m.filename && !eq(m.filename, m.contentFile)) {
          options += `            'filename' => ${repr(m.filename)},\n`;
        }
        options += `            'contents' => Psr7\\Utils::tryFopen(${repr(
          m.contentFile,
        )}, 'r'),\n`;
        imports.add("GuzzleHttp\\Psr7");
        // TODO: set content type from file extension
      }

      options = removeTrailingComma(options);
      options += "        ],\n";
    }

    options = removeTrailingComma(options);
    options += "    ],\n";
    // TODO: remove some headers?
  } else if (request.data) {
    const contentType = request.headers.getContentType();
    if (contentType === "application/x-www-form-urlencoded") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, queryAsDict] = parseQueryString(request.data);
      if (queryAsDict) {
        options += "    'form_params' => [\n";
        for (const [name, value] of queryAsDict) {
          options += `        ${repr(name)} => `;
          if (Array.isArray(value)) {
            options += "[\n";
            for (const v of value) {
              options += `            ${repr(v)},\n`;
            }
            options = removeTrailingComma(options);
            options += "        ],\n";
          } else {
            options += `${repr(value)},\n`;
          }
        }

        options = removeTrailingComma(options);
        options += "    ],\n";
        // TODO: remove some headers?
      } else {
        options += `    'body' => ${repr(request.data)},\n`;
      }
    } else if (contentType === "application/json" && request.data.isString()) {
      // TODO: parse JSON into PHP
      try {
        const [json, roundtrips] = jsonStrToPhp(request.data.toString(), 4);
        if (!roundtrips) {
          options += `    // 'body' => ${repr(request.data)},\n`;
        }
        options += `    'json' => ${json},\n`;
        // TODO: remove some headers?
      } catch {
        options += `    'body' => ${repr(request.data)},\n`;
      }
    } else {
      options += `    'body' => ${repr(request.data)},\n`;
    }
  }

  // TODO: put --proxy-user in proxy URL
  if (request.noproxy) {
    options += `    'proxy' => [\n`;
    if (request.proxy) {
      options += `        'http' => ${repr(request.proxy)},\n`;
      options += `        'https' => ${repr(request.proxy)},\n`;
    }
    const noproxies = request.noproxy.split(",").map((s) => s.trim());
    options += `        'no' => [${noproxies
      .map((np) => repr(np))
      .join(", ")}]\n`;
    options += "    ],\n";
  } else if (request.proxy) {
    // TODO: is this right for SOCKS proxies?
    options += `    'proxy' => ${repr(request.proxy)},\n`;
  }

  if (request.timeout) {
    options += `    'timeout' => ${
      parseFloat(request.timeout.toString()) || 0
    },\n`;
  }
  if (request.connectTimeout) {
    options += `    'connect_timeout' => ${
      parseFloat(request.connectTimeout.toString()) || 0
    },\n`;
  }

  if (request.followRedirects === false) {
    options += "    'allow_redirects' => false,\n";
  }

  if (request.insecure) {
    options += "    'verify' => false,\n";
  } else if (request.cacert) {
    options += `    'verify' => ${repr(request.cacert)},\n`;
  } else if (request.capath) {
    options += `    'verify' => ${repr(request.capath)},\n`;
  }
  if (request.cert) {
    const [cert, password] = request.cert;
    if (password) {
      options += `    'cert' => [${repr(cert)}, ${repr(password)}],\n`;
    } else {
      options += `    'cert' => ${repr(cert)},\n`;
    }
  }
  if (request.key) {
    options += `    'ssl_key' => ${repr(request.key)},\n`;
  }

  if (request.http3) {
    options += "    'http_version' => 3.0,\n";
  } else if (request.http2) {
    options += "    'http_version' => 2.0,\n";
  }

  options = removeTrailingComma(options);

  guzzleCode += repr(url);
  if (options) {
    guzzleCode += ", [\n";
    guzzleCode += options;

    guzzleCode += "]";
  }
  guzzleCode += ");";

  return (
    "<?php\n" +
    "require 'vendor/autoload.php';\n\n" +
    Array.from(imports)
      .sort()
      .map((i) => "use " + i + ";\n")
      .join("") +
    "\n" +
    guzzleCode +
    "\n"
  );
}

export function toPhpGuzzleWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const guzzle = _toPhpGuzzle(requests, warnings);
  return [guzzle, warnings];
}

export function toPhpGuzzle(curlCommand: string | string[]): string {
  return toPhpGuzzleWarn(curlCommand)[0];
}
