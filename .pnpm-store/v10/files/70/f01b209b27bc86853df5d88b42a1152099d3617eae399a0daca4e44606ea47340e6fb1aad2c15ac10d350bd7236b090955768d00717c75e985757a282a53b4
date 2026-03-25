import { warnIfPartsIgnored } from "../../Warnings.js";
import { Word, eq } from "../../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { parseQueryString } from "../../Query.js";
import { repr, reprSymbol, objToRuby, queryToRubyDict } from "./ruby.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "digest",
  "no-digest",
  "form",
  "form-string",
  "http0.9",
  "http1.0",
  "http1.1",
  "insecure",
  "output",
  "upload-file",
  "next",
]);

function getDataString(request: Request): [string, boolean] {
  if (!request.data) {
    return ["", false];
  }

  if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    const { filetype, filename } = request.dataArray[0];

    if (eq(filename, "-")) {
      if (filetype === "binary") {
        // TODO: read stdin in binary
        // https://ruby-doc.org/core-2.3.0/IO.html#method-i-binmode
        // TODO: .delete("\\r\\n") ?
        return ['body = STDIN.read.delete("\\n")\n', false];
      } else {
        return ['body = STDIN.read.delete("\\n")\n', false];
      }
    }

    switch (filetype) {
      case "binary":
        return [
          // TODO: What's the difference between binread() and read()?
          // TODO: .delete("\\r\\n") ?
          "body = File.binread(" + repr(filename) + ').delete("\\n")\n',
          false,
        ];
      case "data":
      case "json":
        return [
          "body = File.read(" + repr(filename) + ').delete("\\n")\n',
          false,
        ];
      case "urlencode":
        // TODO: urlencode
        return [
          "body = File.read(" + repr(filename) + ').delete("\\n")\n',
          false,
        ];
    }
  }

  const contentTypeHeader = request.headers.get("content-type");
  const isJson =
    contentTypeHeader &&
    eq(contentTypeHeader.split(";")[0].trim(), "application/json");
  if (isJson && request.data.isString()) {
    try {
      const dataAsStr = request.data.toString();
      const dataAsJson = JSON.parse(dataAsStr);
      if (typeof dataAsJson === "object" && dataAsJson !== null) {
        // TODO: we actually want to know how it's serialized by Ruby's builtin
        // JSON formatter but this is hopefully good enough.
        const roundtrips = JSON.stringify(dataAsJson) === dataAsStr;
        let code = "";
        if (!roundtrips) {
          code += "# The object won't be serialized exactly like this\n";
          code += "# body = " + repr(request.data) + "\n";
        }
        code += "body = " + objToRuby(dataAsJson) + ".to_json\n";
        return [code, true];
      }
    } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, queryAsDict] = parseQueryString(request.data);
  if (!request.isDataBinary && queryAsDict) {
    // If the original request contained %20, Ruby will encode them as "+"
    return ["body = " + queryToRubyDict(queryAsDict) + "\n", false];
  }

  return ["body = " + repr(request.data) + "\n", false];
}

export function getFilesString(
  request: Request,
  warnings: Warnings,
): [string, boolean] {
  if (!request.multipartUploads) {
    return ["", false];
  }

  // If body contains an open file, HTTParty will send the entire request as a
  // multipart form
  let explicitMultipart = true;
  let body = "body = {\n";

  for (const m of request.multipartUploads) {
    body += "  " + reprSymbol(m.name) + ": ";
    if ("filename" in m && m.filename && repr(m.filename)) {
      warnings.push([
        "multipart-filename",
        "Ruby's HTTParty does not support custom filenames for multipart uploads: " +
          JSON.stringify(m.filename.toString()),
      ]);
    }
    if ("contentFile" in m) {
      if (eq(m.contentFile, "-")) {
        if (request.stdinFile) {
          body += "File.open(" + repr(request.stdinFile) + ")";
          explicitMultipart = false;
        } else if (request.stdin) {
          body += repr(request.stdin);
        }
        // TODO: does this work?
        body += "STDIN";
        // explicitMultipart = false;
      } else if (m.contentFile === m.filename) {
        // TODO: curl will look at the file extension to determine each content-type
        body += "File.open(" + repr(m.contentFile) + ")";
        explicitMultipart = false;
      } else {
        body += "File.open(" + repr(m.contentFile) + ")";
        explicitMultipart = false;
      }
    } else {
      body += repr(m.content);
    }
    body += "\n";
  }
  body += "}\n";
  return [body, explicitMultipart];
}

function requestToRubyHttparty(
  request: Request,
  warnings: Warnings,
  imports: Set<string>,
): string {
  warnIfPartsIgnored(request, warnings, { dataReadsFile: true });
  if (
    request.dataReadsFile &&
    request.dataArray &&
    request.dataArray.length &&
    (request.dataArray.length > 1 ||
      (!(request.dataArray[0] instanceof Word) && request.dataArray[0].name))
  ) {
    warnings.push([
      "unsafe-data",
      "the generated data content is wrong, " +
        // TODO: might not come from "@"
        JSON.stringify("@" + request.dataReadsFile) +
        " means read the file " +
        JSON.stringify(request.dataReadsFile),
    ]);
  }

  let code = "";
  let partyCode = "";

  const methods = [
    "GET",
    "HEAD",
    "POST",
    "PATCH",
    "PUT",
    "PROPPATCH",
    "LOCK",
    "UNLOCK",
    "OPTIONS",
    "PROPFIND",
    "DELETE",
    "MOVE",
    "COPY",
    "MKCOL",
    "TRACE",
  ];

  code += "url = " + repr(request.urls[0].url) + "\n";

  const method = request.urls[0].method;
  const methodStr = method.toString();
  if (method.isString() && methods.includes(methodStr.toUpperCase())) {
    partyCode += "res = HTTParty." + methodStr.toLowerCase() + "(url";
    if (methodStr !== methodStr.toUpperCase()) {
      warnings.push([
        "method-case",
        "HTTP method will be uppercased: " + methodStr,
      ]);
    }
  } else {
    warnings.push([
      "unsupported-method",
      "unsupported HTTP method: " + methodStr,
    ]);
    partyCode += `res = HTTParty.get(url`;
  }

  if (request.urls[0].auth && ["basic", "digest"].includes(request.authType)) {
    if (request.authType === "basic") {
      partyCode += ", basic_auth: auth";
    } else if (request.authType === "digest") {
      partyCode += ", digest_auth: auth";
    }
    code +=
      "auth = { username: " +
      repr(request.urls[0].auth[0]) +
      ", password: " +
      repr(request.urls[0].auth[1]) +
      "}\n";
  }

  let reqBody;
  let explicitMultipart = false;
  if (request.urls[0].uploadFile) {
    if (
      eq(request.urls[0].uploadFile, "-") ||
      eq(request.urls[0].uploadFile, ".")
    ) {
      reqBody = "body = STDIN.read\n";
    } else {
      reqBody = "body = File.read(" + repr(request.urls[0].uploadFile) + ")\n";
    }
  } else if (request.data) {
    let importJson = false;
    [reqBody, importJson] = getDataString(request);
    if (importJson) {
      imports.add("json");
    }
  } else if (request.multipartUploads) {
    [reqBody, explicitMultipart] = getFilesString(request, warnings);
    const contentType = request.headers.get("content-type");
    if (
      explicitMultipart &&
      contentType &&
      contentType.isString() &&
      contentType.toString() === "multipart/form-data"
    ) {
      request.headers.delete("content-type");
    }
  }

  if (request.headers.length) {
    partyCode += ", headers: headers";
    code += "headers = {\n";
    for (const [headerName, headerValue] of request.headers) {
      if (
        ["accept-encoding", "content-length"].includes(
          headerName.toLowerCase().toString(),
        )
      ) {
        code += "# ";
      }
      // TODO: nil?
      code +=
        "  " +
        repr(headerName) +
        ": " +
        repr(headerValue ?? new Word("nil")) +
        ",\n";
    }
    code += "}\n";
  }

  if (reqBody) {
    code += reqBody;
    if (explicitMultipart) {
      partyCode += ", multipart: true";
    }
    if (
      request.dataArray &&
      request.dataArray.length === 1 &&
      !(request.dataArray[0] instanceof Word) &&
      !request.dataArray[0].name
    ) {
      const { filetype } = request.dataArray[0];
      if (filetype === "binary") {
        partyCode += ", body_stream: body";
      } else {
        partyCode += ", body: body";
      }
    } else {
      partyCode += ", body: body";
    }
  }

  if (request.insecure) {
    partyCode += ", verify: false";
  }

  partyCode += ")\n";
  code += partyCode;

  if (request.urls[0].output && !eq(request.urls[0].output, "/dev/null")) {
    if (eq(request.urls[0].output, "-")) {
      code += "\nputs res.body\n";
    } else {
      code += "\nFile.write(" + repr(request.urls[0].output) + ", res.body)\n";
    }
  }

  return code;
}

export function _toRubyHttparty(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const imports = new Set<string>();

  const code = requests
    .map((r) => requestToRubyHttparty(r, warnings, imports))
    .join("\n\n");

  let prelude = "require 'httparty'\n";
  for (const imp of Array.from(imports).sort()) {
    prelude += "require '" + imp + "'\n";
  }
  return prelude + "\n" + code;
}

export function toRubyHttpartyWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const ruby = _toRubyHttparty(requests, warnings);
  return [ruby, warnings];
}

export function toRubyHttparty(curlCommand: string | string[]): string {
  return toRubyHttpartyWarn(curlCommand)[0];
}
