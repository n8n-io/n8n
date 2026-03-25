import { Word, joinWords } from "../../shell/Word.js";
import type { Request, Warnings } from "../../parse.js";

import {
  reprStr,
  repr,
  setVariableValue,
  callFunction,
  addCellArray,
  structify,
  containsBody,
  prepareQueryString,
  prepareCookies,
  cookieString,
  paramsString,
} from "./common.js";

function isSupportedByWebServices(request: Request): boolean {
  return (
    ["get", "post", "put", "delete", "patch"].includes(
      request.urls[0].method.toLowerCase().toString(),
    ) &&
    !request.multipartUploads &&
    !request.insecure
  );
}

interface Options {
  RequestMethod?: Word;

  Username?: Word;
  Password?: Word;

  UserAgent?: Word;
  MediaType?: Word;
  ContentType?: string;
  HeaderFields?: string;
}

function setHeader(
  headers: [Word, Word][],
  header: Word,
  value: Word,
  lowercase: boolean,
) {
  headers.push([lowercase ? header.toLowerCase() : header, value]);
}

function parseWebOptions(request: Request): Options {
  const options: Options = {};

  // MATLAB uses GET in `webread` and POST in `webwrite` by default
  // thus, it is necessary to set the method for other requests
  const method = request.urls[0].method.toLowerCase().toString();
  if (method !== "get" && method !== "post") {
    options.RequestMethod = request.urls[0].method.toLowerCase();
  }

  const headers: [Word, Word][] = [];
  const preformattedHeaders: string[] = [];
  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    if (username.length) {
      options.Username = username;
      options.Password = password;
    } else {
      const authHeader = `['Basic ' matlab.net.base64encode(${repr(
        joinWords(request.urls[0].auth, ":"),
      )})]`;
      setHeader(
        headers,
        new Word("Authorization"),
        new Word(authHeader),
        request.headers.lowercase,
      );
      preformattedHeaders.push("authorization");
    }
  }

  if (request.headers.length) {
    for (const [header, value] of request.headers) {
      if (value === null) {
        continue;
      }
      // Doing this case insensitively probably makes MATLAB send title-cased headers
      switch (header.toLowerCase().toString()) {
        case "user-agent":
          options.UserAgent = value;
          break;
        case "content-type":
          options.MediaType = value;
          break;
        case "cookie":
          if (request.cookies) {
            setHeader(
              headers,
              new Word("Cookie"),
              new Word(cookieString),
              request.headers.lowercase,
            );
            preformattedHeaders.push("cookie");
          } else {
            setHeader(headers, header, value, request.headers.lowercase);
          }
          break;
        case "accept":
          switch (value.toLowerCase().toString()) {
            case "application/json":
              options.ContentType = "json";
              break;
            case "text/csv":
              options.ContentType = "table";
              break;
            case "text/plain":
            case "text/html":
            case "application/javascript":
            case "application/x-javascript":
            case "application/x-www-form-urlencoded":
              options.ContentType = "text";
              break;
            case "text/xml":
            case "application/xml":
              options.ContentType = "xmldom";
              break;
            case "application/octet-stream":
              options.ContentType = "binary";
              break;
            default:
              if (value.startsWith("image/")) {
                options.ContentType = "image";
              } else if (value.startsWith("audio/")) {
                options.ContentType = "audio";
              } else {
                setHeader(headers, header, value, request.headers.lowercase);
              }
          }
          break;
        default:
          setHeader(headers, header, value, request.headers.lowercase);
      }
    }
  }

  if (headers.length > 0) {
    // If key is on the same line as 'weboptions', there is only one parameter
    // otherwise keys are indented by one level in the next line.
    // An extra indentation level is given to the values's new lines in cell array
    const indentLevel = 1 + (Object.keys(options).length === 0 ? 0 : 1);
    options.HeaderFields = addCellArray(
      headers,
      preformattedHeaders,
      indentLevel,
    );
  }

  return options;
}

function prepareOptions(request: Request, options: Options): string[] {
  const lines: string[] = [];
  if (Object.keys(options).length === 0) {
    return lines;
  }
  const pairValues = addCellArray(
    Object.entries(options),
    ["headerfields"],
    1,
    true,
  );
  lines.push(callFunction("options", "weboptions", pairValues));

  return lines;
}

function prepareBasicURI(request: Request): string[] {
  const response: string[] = [];
  if (request.urls[0].queryList) {
    response.push(
      setVariableValue("baseURI", repr(request.urls[0].urlWithoutQueryList)),
    );
    response.push(setVariableValue("uri", `[baseURI '?' ${paramsString}]`));
  } else {
    response.push(setVariableValue("uri", repr(request.urls[0].url)));
  }
  return response;
}

function prepareBasicData(request: Request): string | string[] {
  if (request.data && request.data.length === 0) {
    return setVariableValue("body", repr(new Word()));
  }
  if (!request.data) {
    return [];
  }
  let response: string | string[] = [];
  if (request.data.charAt(0) === "@") {
    response.push(
      callFunction("body", "fileread", repr(request.data.slice(1))),
    );

    if (!request.isDataBinary) {
      response.push(setVariableValue("body(body==13 | body==10)", "[]"));
    }
  } else if (request.data.isString()) {
    // if the data is in JSON, store it as struct in MATLAB
    // otherwise just keep it as a char vector
    try {
      const jsonData = JSON.parse(request.data?.toString());
      if (typeof jsonData === "object") {
        let jsonText = structify(jsonData);
        if (!jsonText.startsWith("struct")) jsonText = reprStr(jsonText);
        response = setVariableValue("body", jsonText);
      } else {
        response = setVariableValue("body", repr(request.data));
      }
    } catch (e) {
      response = setVariableValue("body", repr(request.data));
    }
  }
  return response;
}

function prepareWebCall(request: Request, options: Options): string[] {
  const lines: string[] = [];
  const webFunction = containsBody(request) ? "webwrite" : "webread";

  const params = ["uri"];
  if (containsBody(request)) {
    params.push("body");
  }
  if (Object.keys(options).length > 0) {
    params.push("options");
  }
  lines.push(callFunction("response", webFunction, params));

  return lines;
}

export function toWebServices(
  request: Request,
  warnings: Warnings,
): [(string | string[] | null)[], Warnings] {
  let lines: (string | string[] | null)[] = [
    "%% Web Access using Data Import and Export API",
  ];

  if (!isSupportedByWebServices(request)) {
    lines.push("% This is not possible with the webread/webwrite API");
    return [lines, warnings];
  }

  const options = parseWebOptions(request);
  lines = lines.concat([
    prepareQueryString(request),
    prepareCookies(request),
    prepareBasicURI(request),
    prepareBasicData(request),
    prepareOptions(request, options),
    prepareWebCall(request, options),
  ]);

  return [lines, warnings];
}
