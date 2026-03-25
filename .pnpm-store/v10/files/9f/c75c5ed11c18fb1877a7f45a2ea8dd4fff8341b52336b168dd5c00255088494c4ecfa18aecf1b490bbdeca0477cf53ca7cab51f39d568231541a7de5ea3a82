import { isInt } from "../../utils.js";
import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";

import {
  reprStr,
  repr,
  reprStringToStringList,
  reprObj,
  toURLSearchParams,
  asParseFloatTimes1000,
  type JSImports,
  addImport,
  reprImports,
} from "./javascript.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "max-time",
  "form",
  "form-string",
  "proxy",
  "proxy-user",
]);

// TODO: @
function _getDataString(
  request: Request,
  imports: JSImports,
): [string | null, string | null] {
  if (!request.data) {
    return [null, null];
  }

  const originalStringRepr = repr(request.data, imports);

  const contentType = request.headers.getContentType();
  // can have things like ; charset=utf-8 which we want to preserve
  const exactContentType = request.headers.get("content-type");
  if (contentType === "application/json" && request.data.isString()) {
    const dataStr = request.data.toString();
    const parsed = JSON.parse(dataStr);
    // Only arrays and {} can be passed to axios to be encoded as JSON
    // TODO: check this in other generators
    if (typeof parsed !== "object" || parsed === null) {
      return [originalStringRepr, null];
    }
    const roundtrips = JSON.stringify(parsed) === dataStr;
    const jsonAsJavaScript = reprObj(parsed, 1);
    if (
      roundtrips &&
      eq(exactContentType, "application/json") &&
      eq(request.headers.get("accept"), "application/json, text/plain, */*")
    ) {
      request.headers.delete("content-type");
      request.headers.delete("accept");
    }
    return [jsonAsJavaScript, roundtrips ? null : originalStringRepr];
  }
  if (contentType === "application/x-www-form-urlencoded") {
    const [queryList, queryDict] = parseQueryString(request.data);
    if (queryList) {
      // Technically axios sends
      // application/x-www-form-urlencoded;charset=utf-8
      if (eq(exactContentType, "application/x-www-form-urlencoded")) {
        request.headers.delete("content-type");
      }
      // TODO: check roundtrip, add a comment
      return [toURLSearchParams([queryList, queryDict], imports), null];
    } else {
      return [originalStringRepr, null];
    }
  }
  return [null, null];
}
function getDataString(
  request: Request,
  imports: JSImports,
): [string | null, string | null] {
  if (!request.data) {
    return [null, null];
  }

  let dataString: string | null = null;
  let commentedOutDataString: string | null = null;
  try {
    [dataString, commentedOutDataString] = _getDataString(request, imports);
  } catch {}
  if (!dataString) {
    dataString = repr(request.data, imports);
  }
  return [dataString, commentedOutDataString];
}

function buildConfigObject(
  request: Request,
  method: Word,
  methodStr: string,

  methods: string[],
  dataMethods: string[],
  hasSearchParams: boolean,
  imports: JSImports,
): string {
  let code = "{\n";

  if (!methods.includes(methodStr)) {
    // Axios uppercases methods
    code += "  method: " + repr(method, imports) + ",\n";
  }
  if (hasSearchParams) {
    // code += "  params,\n";
    code += "  params: params,\n";
  } else if (request.urls[0].queryDict) {
    code +=
      "  params: " +
      reprStringToStringList(request.urls[0].queryDict, 1, imports) +
      ",\n";
  }

  const [dataString, commentedOutDataString] = getDataString(request, imports); // can delete headers

  if (request.headers.length || request.multipartUploads) {
    code += "  headers: {\n";
    if (request.multipartUploads) {
      code += "    ...form.getHeaders(),\n";
    }
    for (const [key, value] of request.headers) {
      code +=
        "    " +
        repr(key, imports) +
        ": " +
        repr(value ?? new Word(), imports) +
        ",\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
      code += "\n";
    }
    code += "  },\n";
  }

  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    code += "  auth: {\n";
    code += "    username: " + repr(username, imports);
    if (password.toBool()) {
      code += ",\n";
      code += "    password: " + repr(password, imports) + "\n";
    } else {
      code += "\n";
    }
    code += "  },\n";
  }

  if (!dataMethods.includes(methodStr)) {
    if (request.multipartUploads) {
      code += "  data: form,\n";
    } else if (request.data) {
      if (commentedOutDataString) {
        code += "  // data: " + commentedOutDataString + ",\n";
      }
      code += "  data: " + dataString + ",\n";
    }
  }

  if (request.timeout) {
    if (parseFloat(request.timeout.toString()) !== 0) {
      code +=
        "  timeout: " + asParseFloatTimes1000(request.timeout, imports) + ",\n";
    }
  }

  if (request.proxy && request.proxy.toString() === "") {
    // TODO: this probably won't be set if it's empty
    // TODO: could have --socks5 proxy
    code += "  proxy: false,\n";
  } else if (request.proxy) {
    // TODO: do this parsing in utils.ts
    const proxy = request.proxy.includes("://")
      ? request.proxy
      : request.proxy.prepend("http://");
    let [protocol, host] = proxy.split("://", 2);
    protocol =
      protocol.toLowerCase().toString() === "socks"
        ? new Word("socks4")
        : protocol.toLowerCase();

    let port = "1080";
    const proxyPart = host.match(/:([0-9]+$)/); // TODO: this shouldn't be a regex
    if (proxyPart) {
      host = host.slice(0, proxyPart.index);
      port = proxyPart[1];
    }

    code += "  proxy: {\n";
    code += "    protocol: " + repr(protocol, imports) + ",\n";
    code += "    host: " + repr(host, imports) + ",\n";
    if (isInt(port)) {
      code += "    port: " + port + ",\n";
    } else {
      code += "    port: " + reprStr(port) + ",\n";
    }
    if (request.proxyAuth) {
      const [proxyUser, proxyPassword] = request.proxyAuth.split(":", 2);
      code += "    auth: {\n";
      code += "      user: " + repr(proxyUser, imports);
      if (proxyPassword !== undefined) {
        code += ",\n";
        code += "      password: " + repr(proxyPassword, imports) + "\n";
      } else {
        code += "\n";
      }
      code += "    },\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
      code += "\n";
    }
    code += "  },\n";
  }

  if (code.endsWith(",\n")) {
    code = code.slice(0, -2);
  }
  code += "\n}";
  return code;
}

export function _toNodeAxios(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);

  let importCode = "import axios from 'axios';\n";
  const imports: JSImports = [];

  let code = "";

  const hasSearchParams =
    request.urls[0].queryList &&
    (!request.urls[0].queryDict ||
      // https://stackoverflow.com/questions/42898009/multiple-fields-with-same-key-in-query-params-axios-request
      request.urls[0].queryDict.some((q) => Array.isArray(q[1])));
  if (hasSearchParams && request.urls[0].queryList) {
    code += "const params = new URLSearchParams();\n";
    for (const [key, value] of request.urls[0].queryList) {
      code +=
        "params.append(" +
        repr(key, imports) +
        ", " +
        repr(value, imports) +
        ");\n";
    }
    code += "\n";
  }

  if (request.multipartUploads) {
    importCode += "import FormData from 'form-data';\n";
    code += "const form = new FormData();\n";
    for (const m of request.multipartUploads) {
      code += "form.append(" + repr(m.name, imports) + ", ";
      if ("contentFile" in m) {
        addImport(imports, "* as fs", "fs");
        if (eq(m.contentFile, "-")) {
          code += "fs.readFileSync(0).toString()";
        } else {
          code += "fs.readFileSync(" + repr(m.contentFile, imports) + ")";
        }
        if ("filename" in m && m.filename) {
          code += ", " + repr(m.filename, imports);
        }
      } else {
        code += repr(m.content, imports);
      }
      code += ");\n";
    }
    code += "\n";
  }

  const method = request.urls[0].method.toLowerCase();
  const methodStr = method.toString();
  const methods = ["get", "delete", "head", "options", "post", "put", "patch"];
  code += "const response = await axios";
  if (methods.includes(methodStr)) {
    code += "." + methodStr;
  }
  code += "(";

  const url =
    request.urls[0].queryDict || hasSearchParams
      ? request.urls[0].urlWithoutQueryList
      : request.urls[0].url;

  // axios only supports posting data with these HTTP methods
  // You can also post data with OPTIONS, but that has to go in the config object
  const dataMethods = ["post", "put", "patch"];
  let needsConfig = !!(
    !methods.includes(methodStr) ||
    request.urls[0].queryList ||
    request.urls[0].queryDict ||
    request.headers.length ||
    request.urls[0].auth ||
    request.multipartUploads ||
    (request.data && !dataMethods.includes(methodStr)) ||
    request.timeout ||
    request.proxy
  );
  const needsData =
    dataMethods.includes(methodStr) &&
    (request.data || request.multipartUploads || needsConfig);

  let dataString, commentedOutDataString;
  if (needsData) {
    code += "\n";
    code += "  " + repr(url, imports) + ",\n";
    if (request.multipartUploads) {
      code += "  form";
    } else if (request.data) {
      try {
        [dataString, commentedOutDataString] = getDataString(request, imports);
        if (!dataString) {
          dataString = repr(request.data, imports);
        }
      } catch {
        dataString = repr(request.data, imports);
      }
      if (commentedOutDataString) {
        code += "  // " + commentedOutDataString + ",\n";
      }
      code += "  " + dataString;
    } else if (needsConfig) {
      // TODO: this works but maybe undefined would be more correct?
      code += "  ''";
    }
  } else {
    code += repr(url, imports);
  }

  // getDataString() can delete a header, so we can end up with an empty config
  needsConfig = !!(
    !methods.includes(methodStr) ||
    request.urls[0].queryList ||
    request.urls[0].queryDict ||
    request.headers.length ||
    request.urls[0].auth ||
    request.multipartUploads ||
    (request.data && !dataMethods.includes(methodStr)) ||
    request.timeout ||
    request.proxy
  );

  if (needsConfig) {
    const config = buildConfigObject(
      request,
      method,
      methodStr,
      methods,
      dataMethods,
      !!hasSearchParams,
      imports,
    );
    if (needsData) {
      code += ",\n";
      for (const line of config.split("\n")) {
        code += "  " + line + "\n";
      }
    } else {
      code += ", ";
      code += config;
    }
  } else if (needsData) {
    code += "\n";
  }

  code += ");\n";

  importCode += reprImports(imports);

  return importCode + "\n" + code;
}
export function toNodeAxiosWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const nodeAxios = _toNodeAxios(requests, warnings);
  return [nodeAxios, warnings];
}
export function toNodeAxios(curlCommand: string | string[]): string {
  return toNodeAxiosWarn(curlCommand)[0];
}
