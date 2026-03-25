import { btoa } from "../utils.js";
import { Word } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "form",
  "form-string",

  "http0.9",
  "http1.0",
  "http1.1",
  "http2",
  "http2-prior-knowledge",
  "http3",
  "http3-only",
  "no-http0.9",

  "compressed",
  "no-compressed",

  "upload-file",
]);

export function repr(w: Word): string {
  return w.tokens.map((t) => (typeof t === "string" ? t : t.text)).join("");
}

export function _toHTTP(requests: Request[], warnings: Warnings = []): string {
  const request = getFirst(requests, warnings);
  let s = request.urls[0].method.toString() + " ";

  const urlObj = request.urls[0].urlObj;
  let url = urlObj.path.toString() + urlObj.query.toString();
  if (!url) {
    url = "/";
  }
  s += url + " ";

  if (request.httpVersion === "3" || request.httpVersion === "3-only") {
    s += "HTTP/3";
  } else if (
    request.httpVersion === "2" ||
    request.httpVersion === "2-prior-knowledge"
  ) {
    s += "HTTP/2";
  } else if (request.httpVersion === "1.0") {
    s += "HTTP/1.0";
  } else {
    s += "HTTP/1.1";
  }
  s += "\n";

  // These have to be done in reverse order because of prependIfMissing
  if (request.urls[0].auth) {
    const [user, pass] = request.urls[0].auth;
    if (request.authType === "basic") {
      request.headers.prependIfMissing(
        "Authorization",
        "Basic " + btoa(user.toString() + ":" + pass.toString()),
      );
    }
  }
  if (request.compressed) {
    request.headers.prependIfMissing("Accept-Encoding", "deflate, gzip");
    // Modern curl versions send this, but users are less likely to have
    // decompressors for br and zstd.
    // request.headers.setIfMissing("Accept-Encoding", "deflate, gzip, br, zstd");
  }
  request.headers.prependIfMissing("Accept", "*/*");
  // TODO: update version with extract_curl_args.py
  request.headers.prependIfMissing("User-Agent", "curl/8.2.1");
  request.headers.prependIfMissing("Host", urlObj.host.toString());

  // Generate a random boundary, just like curl
  // TODO: this changes on every keystroke and in tests
  // TODO: use a hash of something, like the data contents
  let boundary =
    "------------------------" +
    Array.from({ length: 16 }, () =>
      "0123456789abcdef".charAt(Math.floor(Math.random() * 16)),
    ).join("");
  // crypto.getRandomValues() only available on Node 19+
  // Array.from(crypto.getRandomValues(new Uint8Array(8)))
  //   .map((b) => b.toString(16).padStart(2, "0"))
  //   .join("");

  if (request.data) {
    // TODO: we already added Content-Type earlier but curl puts Content-Type after Content-Length
    request.headers.setIfMissing(
      "Content-Length",
      request.data.toString().length.toString(),
    );
  } else if (request.urls[0].uploadFile) {
    const contentLength =
      "<length of " + request.urls[0].uploadFile.toString() + ">";
    const wasMissing = request.headers.setIfMissing(
      "Content-Length",
      contentLength,
    );
    if (wasMissing) {
      warnings.push([
        "bad-content-length",
        "Content-Length header needs to be set: " +
          JSON.stringify(contentLength),
      ]);
    }
  } else if (request.multipartUploads) {
    const contentType = request.headers.get("Content-Type");
    if (contentType) {
      const m = contentType.toString().match(/boundary=(.*)/);
      if (m) {
        // curl actually doesn't respect the boundary in the Content-Type header
        // and will append a second one and use that.
        boundary = m[1];
      } else {
        warnings.push([
          "no-boundary",
          `Content-Type header "${contentType.toString()}" does not specify a boundary.`,
        ]);
      }
    } else {
      // TODO: could existing Content-Type have other stuff that needs to be preserved?
      request.headers.set(
        "Content-Type",
        "multipart/form-data; boundary=" + boundary,
      );
    }
  }

  for (const [headerName, headerValue] of request.headers) {
    if (headerValue === null) {
      continue;
    }
    const value = headerValue.toString();
    if (value) {
      s += headerName.toString() + ": " + value + "\n";
    } else {
      // Don't add extra space
      s += headerName.toString() + ":\n";
    }
  }

  s += "\n";

  if (request.data) {
    s += request.data.toString();
  } else if (request.urls[0].uploadFile) {
    s += request.urls[0].uploadFile.toString();
    warnings.push([
      "upload-file",
      "need to read data from file: " +
        JSON.stringify(request.urls[0].uploadFile.toString()),
    ]);
  } else if (request.multipartUploads) {
    for (const f of request.multipartUploads) {
      s += "--" + boundary + "\n";

      s += "Content-Disposition: form-data";
      s += '; name="' + f.name.toString() + '"';
      if (f.filename) {
        s += '; filename="' + f.filename.toString() + '"';
      }
      if (f.contentType) {
        s += '\nContent-Type: "' + f.contentType.toString() + '"';
      }
      // TODO: ; headers=

      s += "\n\n";
      if ("content" in f) {
        s += f.content.toString();
      } else {
        s += f.contentFile.toString();
      }
      s += "\n";
    }
    s += "--" + boundary + "--";
  }

  return s + "\n";
}

export function toHTTPWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const http = _toHTTP(requests, warnings);
  return [http, warnings];
}
export function toHTTP(curlCommand: string | string[]): string {
  return toHTTPWarn(curlCommand)[0];
}
