import { Word } from "../../shell/Word.js";
import type { Request, Warnings } from "../../parse.js";

import {
  reprStr,
  repr,
  setVariableValue,
  callFunction,
  structify,
  containsBody,
  prepareQueryString,
  prepareCookies,
} from "./common.js";

function prepareHeaders(request: Request): string | null {
  if (!request.headers.length) {
    return null;
  }

  const headerStrs: string[] = [];
  for (const [key, value] of request.headers) {
    if (value === null) {
      continue;
    }
    const keyStr = key.toLowerCase().toString();
    if (keyStr === "cookie" && request.cookies) {
      // TODO: curl -H 'Cookie: foo=bar' example.com
      // adds an extra newline before the cookie
      const cookieFieldParams = callFunction(
        null,
        "cellfun",
        [
          "@(x) Cookie(x{:})",
          callFunction(null, "num2cell", ["cookies", "2"], ""),
        ],
        "",
      );
      headerStrs.push(
        callFunction(null, "field.CookieField", cookieFieldParams, ""),
      );
    } else if (keyStr === "accept") {
      const accepts = value.split(",");
      if (accepts.length === 1) {
        headerStrs.push(`field.AcceptField(MediaType(${repr(value)}))`);
      } else {
        let acceptheader = "field.AcceptField([";
        for (const accept of accepts) {
          acceptheader += `\n        MediaType(${repr(accept.trim())})`;
        }
        acceptheader += "\n    ])";
        headerStrs.push(acceptheader);
      }
    } else {
      headerStrs.push(`HeaderField(${repr(key)}, ${repr(value)})`);
    }
  }

  if (headerStrs.length === 1) {
    return setVariableValue("header", headerStrs[0]);
  }

  let header = "[\n";
  header += "    " + headerStrs.join("\n    ") + "\n";
  header += "]'";
  return setVariableValue("header", header);
}

function prepareURI(request: Request) {
  const uriParams: string[] = [];
  if (request.urls[0].queryList) {
    uriParams.push(repr(request.urls[0].urlWithoutQueryList));
    uriParams.push("QueryParameter(params')");
  } else {
    uriParams.push(repr(request.urls[0].url));
  }
  return callFunction("uri", "URI", uriParams);
}

function prepareAuth(request: Request): string[] {
  const options: string[] = [];
  const optionsParams: string[] = [];
  if (request.urls[0].auth) {
    const [usr, pass] = request.urls[0].auth;
    const userfield = `'Username', ${repr(usr)}`;
    const passfield = `'Password', ${repr(pass)}`;
    const authparams = (usr.length ? `${userfield}, ` : "") + passfield;
    optionsParams.push(reprStr("Credentials"), "cred");
    options.push(callFunction("cred", "Credentials", authparams));
  }

  if (request.insecure) {
    optionsParams.push(reprStr("VerifyServerName"), "false");
  }

  if (optionsParams.length > 0) {
    options.push(callFunction("options", "HTTPOptions", optionsParams));
  }

  return options;
}

function prepareMultipartUploads(request: Request): string | null {
  if (!request.multipartUploads) {
    return null;
  }
  const params: [string, string][] = [];
  for (const m of request.multipartUploads) {
    const readsFile = "contentFile" in m;
    const value = readsFile ? m.contentFile.prepend("@") : m.content; // TODO: something nicer
    const fileProvider = prepareDataProvider(
      value,
      null,
      "",
      1,
      true,
      !readsFile,
    );
    params.push([repr(m.name), fileProvider as string]); // TODO: can be a string[]
  }
  return callFunction("body", "MultipartFormProvider", params);
}

function isJsonString(str: string): boolean {
  // Source: https://stackoverflow.com/a/3710226/5625738
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// prepareDataProvider(value, null, "", 1, true, !readsFile);
// prepareDataProvider(request.data, "body", ";", 0, request.isDataBinary, request.isDataRaw);
function prepareDataProvider(
  value: Word,
  output: string | null,
  termination: string,
  indentLevel: number,
  isDataBinary = true,
  isDataRaw = false,
): string | string[] {
  if (!isDataRaw && value.charAt(0) === "@") {
    const filename = value.slice(1);
    if (!isDataBinary) {
      return [
        callFunction(output, "fileread", repr(filename)),
        setVariableValue(`${output}(${output}==13 | ${output}==10)`, "[]"),
      ];
    }
    // >> imformats % for seeing MATLAB supported image formats
    const extension = (filename.split(".")[1] ?? "").toLowerCase().toString();
    const isImage = ["jpeg", "jpg", "png", "tif", "gif"].includes(extension);
    const provider = isImage ? "ImageProvider" : "FileProvider";
    return callFunction(output, provider, repr(filename), termination);
  }

  if (!value.length) {
    return callFunction(output, "FileProvider", "", termination);
  }

  if (value.isString() && isJsonString(value.toString())) {
    const obj = JSON.parse(value.toString());
    // If failed to create a struct for the JSON, then return a string
    try {
      const structure = structify(obj, indentLevel);
      return callFunction(output, "JSONProvider", structure, termination);
    } catch (e) {
      return callFunction(output, "StringProvider", repr(value), termination);
    }
  }

  // TODO: StringProvider should be the default
  const formValue = value
    .split("&")
    .map((x) => x.split("=").map((x) => repr(x)));
  return callFunction(output, "FormProvider", formValue, termination);
}

function prepareData(request: Request) {
  if (!request.data || request.multipartUploads) {
    return null;
  }

  if (request.data && request.data.split("&", 2).length > 1) {
    const data = request.data.split("&").map((x: Word) =>
      x.split("=").map((x) => {
        let ans = repr(x);
        if (x.isString()) {
          try {
            const jsonData = JSON.parse(x.toString());
            if (typeof jsonData === "object") {
              ans = callFunction(
                null,
                "JSONProvider",
                structify(jsonData, 1),
                "",
              );
            }
          } catch (e) {}
        }

        return ans;
      }),
    );
    return callFunction("body", "FormProvider", data);
  }

  let response = prepareDataProvider(
    request.data,
    "body",
    ";",
    0,
    !!request.isDataBinary,
    !!request.isDataRaw,
  );
  if (!response) {
    response = setVariableValue("body", repr(request.data));
  }
  return response;
}

function prepareRequestMessage(request: Request): string {
  const method = request.urls[0].method.toLowerCase();
  let reqMessage: string[] | string = [repr(method)];
  if (request.headers.length) {
    reqMessage.push("header");
  }
  if (containsBody(request)) {
    if (reqMessage.length === 1) {
      reqMessage.push("[]");
    }
    reqMessage.push("body");
  }

  if (
    !request.headers.length &&
    !containsBody(request) &&
    method.toString() === "get"
  ) {
    reqMessage = ""; // TODO: just empty array?
  }

  const params = ["uri.EncodedURI"];
  if (request.urls[0].auth || request.insecure) {
    params.push("options");
  }

  const response = [
    callFunction(
      "response",
      "RequestMessage",
      reqMessage,
      callFunction(null, ".send", params),
    ),
  ];

  return response.join("\n");
}

export function toHTTPInterface(
  request: Request,
  warnings: Warnings,
): [(string | string[] | null)[], Warnings] {
  return [
    [
      "%% HTTP Interface",
      "import matlab.net.*",
      "import matlab.net.http.*",
      containsBody(request) ? "import matlab.net.http.io.*" : null,
      "",
      prepareQueryString(request),
      prepareCookies(request),
      prepareHeaders(request),
      prepareURI(request),
      prepareAuth(request),
      prepareMultipartUploads(request),
      prepareData(request),
      prepareRequestMessage(request),
      "",
    ],
    warnings,
  ];
}
