import { Word, eq } from "../../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";
import type { Query } from "../../Query.js";
import type { FormParam } from "../../curl/form.js";

import {
  repr,
  reprObj,
  asParseFloatTimes1000,
  type JSImports,
  addImport,
  reprImports,
} from "./javascript.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",
  "max-time",
]);

export function dedent(s: string): string {
  return s.replace(/^ {2}/gm, "");
}
export function indent(s: string, indent = 1): string {
  const indentation = "  ".repeat(indent);
  return s.split("\n").join("\n" + indentation);
}
export function commentOut(s: string, indent = 0): string {
  const indentation = "  ".repeat(indent);
  return s.split("\n").join("\n" + indentation + "// ");
}

export function serializeQuery(
  query: Query,
  imports: JSImports,
): [string, boolean] {
  const [queryList, queryDict] = query;
  let code = "";
  let traditional = false;
  if (queryDict) {
    code += "{\n";
    for (const [key, value] of queryDict) {
      code += "  " + repr(key, imports) + ": ";
      if (Array.isArray(value)) {
        code += "[" + value.map((v) => repr(v, imports)).join(", ") + "]";
        traditional = true;
      } else {
        code += repr(value, imports);
      }
      code += ",\n";
    }

    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
    }
    code += "\n}";
  } else if (queryList) {
    code += "[\n";
    for (const [key, value] of queryList) {
      code +=
        "  { name: " +
        repr(key, imports) +
        ", value: " +
        repr(value, imports) +
        " },\n";
    }
    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
    }
    code += "\n]";
  } else {
    // shouldn't happen
    return ["null", false];
  }
  return [code, traditional];
}

// TODO: @
function _getDataString(
  data: Word,
  contentType: string | null | undefined,
  exactContentType: Word | null | undefined,
  imports: JSImports,
): [Word | null | undefined, string, string | null, boolean] {
  let traditional = false;
  const originalStringRepr = repr(data, imports);

  if (contentType === "application/json" && data.isString()) {
    const dataStr = data.toString();
    const parsed = JSON.parse(dataStr);
    // Only convert arrays and {} to JavaScript objects
    if (typeof parsed !== "object" || parsed === null) {
      return [exactContentType, originalStringRepr, null, traditional];
    }
    const roundtrips = JSON.stringify(parsed) === dataStr;
    const jsonAsJavaScript = "JSON.stringify(" + reprObj(parsed, 1) + ")";
    return [
      exactContentType,
      jsonAsJavaScript,
      roundtrips ? null : originalStringRepr,
      traditional,
    ];
  }
  if (contentType === "application/x-www-form-urlencoded") {
    const [queryList, queryDict] = parseQueryString(data);
    if (queryList) {
      if (
        eq(exactContentType, "application/x-www-form-urlencoded; charset=utf-8")
      ) {
        exactContentType = null;
      }

      let queryObj;
      [queryObj, traditional] = serializeQuery([queryList, queryDict], imports);
      // TODO: check roundtrip, add a comment
      return [exactContentType, indent(queryObj), null, traditional];
    }
  }
  return [exactContentType, originalStringRepr, null, traditional];
}

export function getDataString(
  data: Word,
  contentType: string | null | undefined,
  exactContentType: Word | null | undefined,
  imports: JSImports,
): [Word | null | undefined, string, string | null, boolean] {
  let dataString: string | null = null;
  let commentedOutDataString: string | null = null;
  let traditional = false;
  try {
    [exactContentType, dataString, commentedOutDataString, traditional] =
      _getDataString(data, contentType, exactContentType, imports);
  } catch {}
  if (!dataString) {
    dataString = repr(data, imports);
  }
  return [exactContentType, dataString, commentedOutDataString, traditional];
}

export function getFormString(
  multipartUploads: FormParam[],
  imports: JSImports,
): string {
  let code = "const form = new FormData();\n";
  for (const m of multipartUploads) {
    code += "form.append(" + repr(m.name, imports) + ", ";
    if ("contentFile" in m) {
      // TODO: no fs in browser
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
  return code;
}

export function _toJavaScriptJquery(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings);
  const imports: JSImports = [];

  let code = "";

  // data: passed with these methods will be added to the URL instead
  const nonDataMethods = ["GET", "HEAD"];
  const method = request.urls[0].method;
  const methodStr = method.toString();
  if (!eq(request.urls[0].method.toUpperCase(), method)) {
    warnings.push([
      "method-case",
      "jQuery uppercases the method, so it will be changed to " +
        JSON.stringify(method.toUpperCase().toString()),
    ]);
  }

  const contentType = request.headers.getContentType();
  let exactContentType = request.headers.get("content-type");
  request.headers.delete("content-type");

  let url = request.urls[0].url;

  let dataString: string | null = null;
  let commentedOutDataString: string | null = null;
  let traditional = false;

  if (request.multipartUploads) {
    code += getFormString(request.multipartUploads, imports);
    dataString = "form";

    warnings.push([
      "multipart-form",
      // TODO: remove this when jQuery supports FormData
      "jQuery doesn't support sending FormData yet",
    ]);
  } else if (request.data) {
    // can delete content-type header by returning null for exactContentType
    [exactContentType, dataString, commentedOutDataString, traditional] =
      getDataString(request.data, contentType, exactContentType, imports);
    if (commentedOutDataString) {
      commentedOutDataString = "  // data: " + commentedOutDataString + ",\n";
    }
  }

  if (nonDataMethods.includes(methodStr)) {
    if (request.urls[0].queryList) {
      if (dataString) {
        warnings.push([
          "data-with-get",
          "jQuery doesn't allow sending data in the body with GET or HEAD requests",
        ]);
        if (commentedOutDataString) {
          commentedOutDataString +=
            "  // data: " + indent(commentOut(dedent(dataString))) + ",\n";
        } else {
          commentedOutDataString =
            "  // data: " + indent(commentOut(dedent(dataString))) + ",\n";
        }
      }

      [dataString, traditional] = serializeQuery(
        [request.urls[0].queryList, request.urls[0].queryDict ?? null],
        imports,
      );
      dataString = indent(dataString);
      url = request.urls[0].urlWithoutQueryList;
    } else if (request.data || request.multipartUploads) {
      warnings.push([
        "data-with-get",
        "jQuery doesn't allow sending data with GET or HEAD requests. The data will be sent in the URL instead",
      ]);
    }
  }

  const needsConfig = !!(
    request.headers.length ||
    request.urls[0].auth ||
    ((request.multipartUploads || request.data) &&
      nonDataMethods.includes(methodStr)) ||
    request.timeout ||
    (exactContentType !== null && exactContentType !== undefined) ||
    commentedOutDataString ||
    traditional
  );

  let done = "";
  done += ".done(function(response) {\n";
  done += "  console.log(response);\n";
  done += "});";

  if (
    !needsConfig &&
    method.isString() &&
    ["GET", "POST"].includes(methodStr)
  ) {
    // TODO: .getJSON()
    const fn = methodStr === "GET" ? "get" : "post";
    code += "$." + fn + "(";
    code += repr(url, imports);
    if (dataString) {
      code += ", " + dedent(dataString);
    }
    code += ")\n";
    code += "  " + indent(done) + "\n";
  } else {
    code += "$.ajax({\n";
    code += "  url: " + repr(url, imports) + ",\n";
    code += "  crossDomain: true,\n";

    if (methodStr !== "GET") {
      // jQuery uppercases methods
      const sentMethod = eq(request.urls[0].method.toUpperCase(), method)
        ? method.toLowerCase()
        : method;
      code += "  method: " + repr(sentMethod, imports) + ",\n";
    }

    if (request.headers.length) {
      code += "  headers: {\n";
      for (const [key, value] of request.headers) {
        if (value === null) {
          continue;
        }
        code +=
          "    " + repr(key, imports) + ": " + repr(value, imports) + ",\n";
      }
      if (code.endsWith(",\n")) {
        code = code.slice(0, -2);
        code += "\n";
      }
      code += "  },\n";
    }
    if (exactContentType) {
      code += "  contentType: " + repr(exactContentType, imports) + ",\n";
    }

    if (request.urls[0].auth) {
      const [username, password] = request.urls[0].auth;
      code += "  username: " + repr(username, imports) + ",\n";
      code += "  password: " + repr(password, imports) + ",\n";
    }

    if (commentedOutDataString) {
      code += commentedOutDataString;
    }
    if (dataString) {
      code += "  data: " + dataString + ",\n";
    }

    if (traditional) {
      code += "  traditional: true,\n";
    }

    if (request.timeout) {
      code +=
        "  timeout: " + asParseFloatTimes1000(request.timeout, imports) + ",\n";
    }

    if (code.endsWith(",\n")) {
      code = code.slice(0, -2);
      code += "\n";
    }

    code += "})" + done + "\n";
  }

  let importCode = reprImports(imports);
  if (importCode) {
    importCode += "\n";
  }

  return importCode + code;
}

export function toJavaScriptJqueryWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const jquery = _toJavaScriptJquery(requests, warnings);
  return [jquery, warnings];
}
export function toJavaScriptJquery(curlCommand: string | string[]): string {
  return toJavaScriptJqueryWarn(curlCommand)[0];
}
