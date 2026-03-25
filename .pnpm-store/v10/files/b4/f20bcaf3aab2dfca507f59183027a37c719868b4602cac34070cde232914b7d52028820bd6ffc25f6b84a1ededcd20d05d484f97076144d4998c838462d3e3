import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";
import type { Query } from "../../Query.js";
import type { FormParam } from "../../curl/form.js";

import {
  repr,
  reprObj,
  asParseInt,
  asParseFloatTimes1000,
  type JSImports,
  addImport,
  reprImports,
} from "./javascript.js";

import { indent } from "./jquery.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",

  "max-time",
  "connect-timeout",

  "location", // --no-location only has an effect
  "max-redirs",

  "retry",

  "insecure",
  "cert",
  "key",
  "cacert",

  "http2",
]);

function serializeQuery(
  fn: "query" | "send",
  query: Query,
  imports: JSImports,
): string {
  const [queryList, queryDict] = query;
  let code = "";
  if (queryDict) {
    code += "{\n";
    for (const [key, value] of queryDict) {
      code += "  " + repr(key, imports) + ": ";
      if (Array.isArray(value)) {
        code += "[" + value.map((v) => repr(v, imports)).join(", ") + "]";
      } else {
        code += repr(value, imports);
      }
      code += ",\n";
    }

    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
    }
    code += "\n}";
    code = "  ." + fn + "(" + indent(code) + ")\n";
  } else if (queryList) {
    for (const [key, value] of queryList) {
      code +=
        "  ." +
        fn +
        "({ " +
        repr(key, imports) +
        ": " +
        repr(value, imports) +
        " })\n";
    }
  } else {
    // shouldn't happen
    return "";
  }
  return code;
}

// TODO: @
function _getDataString(
  request: Request,
  contentType: string | null | undefined,
  exactContentType: Word | null | undefined,
  imports: JSImports,
): [Word | null | undefined, string | null, string | null] {
  if (!request.data) {
    return [exactContentType, null, null];
  }

  const originalStringRepr = "  .send(" + repr(request.data, imports) + ")\n";

  if (contentType === "application/json" && request.data.isString()) {
    const dataStr = request.data.toString();
    const parsed = JSON.parse(dataStr);
    // Only convert arrays and {} to JavaScript objects
    if (typeof parsed !== "object" || parsed === null) {
      return [exactContentType, originalStringRepr, null];
    }
    const roundtrips = JSON.stringify(parsed) === dataStr;
    const jsonAsJavaScript = "  .send(" + reprObj(parsed, 1) + ")\n";
    if (roundtrips && eq(exactContentType, "application/json")) {
      exactContentType = null;
    }
    return [
      exactContentType,
      jsonAsJavaScript,
      roundtrips ? null : originalStringRepr,
    ];
  }
  if (contentType === "application/x-www-form-urlencoded") {
    const [queryList, queryDict] = parseQueryString(request.data);
    if (queryList) {
      exactContentType = null;
      const queryCode =
        "  .type('form')\n" +
        serializeQuery("send", [queryList, queryDict], imports);
      // TODO: check roundtrip, add a comment
      return [exactContentType, queryCode, null];
    }
  }
  return [exactContentType, originalStringRepr, null];
}

export function getDataString(
  request: Request,
  contentType: string | null | undefined,
  exactContentType: Word | null | undefined,
  imports: JSImports,
): [Word | null | undefined, string | null, string | null] {
  if (!request.data) {
    return [exactContentType, null, null];
  }

  let dataString: string | null = null;
  let commentedOutDataString: string | null = null;
  try {
    [exactContentType, dataString, commentedOutDataString] = _getDataString(
      request,
      contentType,
      exactContentType,
      imports,
    );
  } catch {}
  if (!dataString) {
    dataString = "  .send(" + repr(request.data, imports) + ")\n";
  }
  return [exactContentType, dataString, commentedOutDataString];
}

export function getFormString(
  multipartUploads: FormParam[],
  imports: JSImports,
): string {
  let code = "";
  for (const m of multipartUploads) {
    if ("contentFile" in m) {
      code += "  .attach(" + repr(m.name, imports);
      // if (eq(m.contentFile, "-")) {
      //   warnings.push([
      //     "stdin-file", "SuperAgent doesn't support reading from stdin",
      //   ]);
      // }
      code += ", " + repr(m.contentFile, imports);
      if ("filename" in m && m.filename) {
        // TODO: this is the wrong way to not send a filename
        code += ", " + repr(m.filename, imports);
      }
      code += ")\n";
    } else {
      code +=
        "  .field(" +
        repr(m.name, imports) +
        ", " +
        repr(m.content, imports) +
        ")\n";
    }
  }
  return code;
}

export function _toNodeSuperAgent(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const imports: JSImports = [];

  let code = "";

  // data: passed with these methods is ignored
  const method = request.urls[0].method;
  const methodStr = method.toString();
  // https://github.com/ladjs/superagent/blob/73c7efb5e9a0cf0409da9918d49b89055be29db5/src/client.js#L899
  const nonDataMethods = ["GET", "HEAD"];

  if (!eq(request.urls[0].method.toUpperCase(), method)) {
    warnings.push([
      "method-case",
      "SuperAgent uppercases the method, so it will be changed to " +
        JSON.stringify(method.toUpperCase().toString()),
    ]);
  }

  const hasData = request.data || request.multipartUploads;
  const url = request.urls[0].queryList
    ? request.urls[0].urlWithoutQueryList
    : request.urls[0].url;

  const contentType = request.headers.getContentType();
  let exactContentType = request.headers.get("content-type");
  request.headers.delete("content-type");
  let dataCode, commentedOutDataCode;
  if (request.multipartUploads) {
    dataCode = getFormString(request.multipartUploads, imports);
    exactContentType = null;
  } else if (request.data) {
    // might delete content-type header
    [exactContentType, dataCode, commentedOutDataCode] = getDataString(
      request,
      contentType,
      exactContentType,
      imports,
    );
  }
  if (nonDataMethods.includes(methodStr) && hasData) {
    warnings.push([
      "data-with-get",
      "SuperAgent doesn't send data with GET or HEAD requests",
    ]);
  }

  // https://github.com/ladjs/superagent/blob/73c7efb5e9a0cf0409da9918d49b89055be29db5/src/client.js#L899
  const methodToFn = {
    GET: "get",
    HEAD: "head",
    OPTIONS: "options",
    DELETE: "del",
    PATCH: "patch",
    POST: "post",
    PUT: "put",
  } as const;

  code += "request";
  if (methodStr in methodToFn) {
    const fn = methodToFn[methodStr as keyof typeof methodToFn];
    code += "\n";
    code += "  ." + fn + "(" + repr(url, imports) + ")\n";
  } else {
    code += "(" + repr(method, imports) + ", " + repr(url, imports) + ")\n";
  }

  if (request.urls[0].queryList) {
    code += serializeQuery(
      "query",
      [request.urls[0].queryList, request.urls[0].queryDict ?? null],
      imports,
    );
  }

  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    code +=
      "  .auth(" +
      repr(username, imports) +
      ", " +
      repr(password, imports) +
      ")\n";
  }

  // TODO: warn about unsent headers
  if (request.headers.length) {
    for (const [key, value] of request.headers) {
      if (value === null) {
        continue;
      }
      code +=
        "  .set(" + repr(key, imports) + ", " + repr(value, imports) + ")\n";
    }
  }
  if (exactContentType) {
    if (eq(exactContentType, "application/x-www-form-urlencoded")) {
      code += "  .type('form')\n";
    } else if (eq(exactContentType, "application/json")) {
      code += "  .type('json')\n";
    } else {
      code += "  .type(" + repr(exactContentType, imports) + ")\n";
    }
  }
  if (commentedOutDataCode) {
    code += "  //" + commentedOutDataCode;
  }
  if (dataCode) {
    code += dataCode;
  }

  if (request.connectTimeout) {
    code += "  .timeout({ ";
    code +=
      "response: " + asParseFloatTimes1000(request.connectTimeout, imports);
    if (request.timeout) {
      code += "deadline: " + asParseFloatTimes1000(request.timeout, imports);
    }
    code += " })\n";
  } else if (request.timeout) {
    code +=
      "  .timeout(" + asParseFloatTimes1000(request.timeout, imports) + ")\n";
  }

  if (request.followRedirects === false) {
    code += "  .redirects(0)\n";
  } else if (request.maxRedirects) {
    code += "  .redirects(" + repr(request.maxRedirects, imports) + ")\n";
  }

  if (request.retry) {
    code += "  .retry(" + asParseInt(request.retry, imports) + ")\n";
  }

  if (request.insecure) {
    code += "  .disableTLSCerts()\n";
  }
  if (request.cert) {
    const [cert, password] = request.cert;
    code += "  .cert(fs.readFileSync(" + repr(cert, imports) + "))\n";
    addImport(imports, "* as fs", "fs");
    if (password) {
      warnings.push([
        "cert-password",
        "SuperAgent doesn't support certificate passwords: " +
          JSON.stringify(password.toString()),
      ]);
    }
  }
  if (request.key) {
    code += "  .key(fs.readFileSync(" + repr(request.key, imports) + "))\n";
    addImport(imports, "* as fs", "fs");
  }
  // TODO: is this correct?
  if (request.cacert) {
    code += "  .ca(fs.readFileSync(" + repr(request.cacert, imports) + "))\n";
    addImport(imports, "* as fs", "fs");
  }

  if (request.http2) {
    code += "  .http2()\n";
  }

  code += "  .then(res => {\n";
  code += "     console.log(res.body);\n";
  code += "  });\n";

  let importCode = "import request from 'superagent';\n";
  importCode += reprImports(imports);
  importCode += "\n";

  return importCode + code;
}

export function toNodeSuperAgentWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toNodeSuperAgent(requests, warnings);
  return [code, warnings];
}
export function toNodeSuperAgent(curlCommand: string | string[]): string {
  return toNodeSuperAgentWarn(curlCommand)[0];
}
