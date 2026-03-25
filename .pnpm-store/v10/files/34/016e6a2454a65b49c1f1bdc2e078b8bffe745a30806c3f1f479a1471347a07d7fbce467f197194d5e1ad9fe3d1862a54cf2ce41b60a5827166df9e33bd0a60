import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import { repr } from "./php.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  // "form",
  // "form-string",
]);

export function _toPhpRequests(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  let headerString: string;
  if (request.headers.length) {
    headerString = "$headers = array(\n";
    let i = 0;
    for (const [headerName, headerValue] of request.headers) {
      if (headerValue === null) {
        continue; // TODO: this could miss not adding a trailing comma
      }
      headerString += "    " + repr(headerName) + " => " + repr(headerValue);
      if (i < request.headers.length - 1) {
        headerString += ",\n";
      }
      i++;
    }
    headerString += "\n);";
  } else {
    headerString = "$headers = array();";
  }

  let optionsString;
  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;
    optionsString =
      "$options = array('auth' => array(" +
      repr(user) +
      ", " +
      repr(password) +
      "));";
  }

  let dataString;
  if (request.data) {
    const [parsedQueryString] = parseQueryString(request.data);
    dataString = "$data = array(\n";
    if (!parsedQueryString || !parsedQueryString.length) {
      dataString = "$data = " + repr(request.data) + ";";
    } else {
      const terms: string[] = [];
      for (const q of parsedQueryString) {
        const [key, value] = q;
        terms.push("    " + repr(key) + " => " + repr(value));
      }
      dataString += terms.join(",\n") + "\n);";
    }
  }
  let requestLine =
    "$response = Requests::" +
    request.urls[0].method.toLowerCase().toString() +
    "(" +
    repr(request.urls[0].url);
  requestLine += ", $headers";
  if (dataString) {
    requestLine += ", $data";
  }
  if (optionsString) {
    requestLine += ", $options";
  }
  requestLine += ");";

  let phpCode = "<?php\n";
  phpCode += "include('vendor/rmccue/requests/library/Requests.php');\n";
  phpCode += "Requests::register_autoloader();\n";
  phpCode += headerString + "\n";
  if (dataString) {
    phpCode += dataString + "\n";
  }
  if (optionsString) {
    phpCode += optionsString + "\n";
  }

  phpCode += requestLine;

  return phpCode + "\n";
}
export function toPhpRequestsWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const php = _toPhpRequests(requests, warnings);
  return [php, warnings];
}
export function toPhpRequests(curlCommand: string | string[]): string {
  return toPhpRequestsWarn(curlCommand)[0];
}
