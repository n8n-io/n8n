import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,

  "disallow-username-in-url",
  "path-as-is",

  "alt-svc",

  "unix-socket",
  "abstract-unix-socket",

  "compressed",
  "no-compressed",
  "verbose",
  "no-verbose",

  "proxy",
  "proxy-user",
  "proxytunnel",
  "noproxy",
  "preproxy",
  "proxy-anyauth",
  "proxy-basic",
  "proxy-digest",
  "proxy-negotiate",
  "proxy-ntlm",
  "proxy-ca-native",
  "proxy-cacert",
  "proxy-capath",
  "proxy-cert-type",
  "proxy-cert",
  "proxy-ciphers",
  "proxy-crlfile",
  "proxy-header",
  "proxy-http2",
  "proxy-insecure",
  "proxy-key",
  "proxy-key-type",
  "proxy-pass",
  "proxy-pinnedpubkey",
  "proxy-service-name",
  "proxy-ssl-allow-beast",
  "proxy-ssl-auto-client-cert",
  "proxy-tls13-ciphers",
  "proxy-tlsuser",
  "proxy-tlspassword",
  "proxy-tlsauthtype",
  "proxy-tlsv1",
  "socks4",
  "socks4a",
  "socks5",
  "socks5-hostname",
  "socks5-basic",
  "socks5-gssapi",
  "socks5-gssapi-nec",
  "socks5-gssapi-service",

  "haproxy-clientip",
  "haproxy-protocol",

  "interface",

  "netrc",
  "netrc-file",
  "netrc-optional",

  // "anyauth",
  // "no-anyauth",
  "digest",
  "no-digest",
  "negotiate",
  "no-negotiate",
  "service-name",
  "ntlm",
  "no-ntlm",
  "ntlm-wb",
  "no-ntlm-wb",
  "aws-sigv4",
  "delegation",
  "oauth2-bearer",

  "ipv4",
  "ipv6",

  "local-port",

  "ftp-skip-pasv-ip",

  "sasl-authzid",
  "sasl-ir",
  "tr-encoding",

  "tcp-fastopen",

  // Not parsed properly
  // "proto",
  // "proto-redir",
  "proto-default",

  "ignore-content-length",
  "no-ignore-content-length",

  "remote-time",
  // "time-cond",

  // requires that the underlying libcurl was built to support c-ares
  // "dns-interface",
  // "dns-ipv4-addr",
  // "dns-ipv6-addr",
  // "dns-servers",

  // No effect
  // "dump-header",
  // "include",
  // "engine",

  // Adds a If-None-Match header
  // "etag-compare",
  // "etag-save", // No effect

  "fail",
  // "fail-with-body",
  // "fail-early",

  "continue-at",

  "speed-limit",
  "speed-time",
  "limit-rate",
  "max-filesize",

  "http0.9",
  "http1.0",
  "http1.1",
  "http2",
  "http2-prior-knowledge",
  "http3",
  "http3-only",

  "cookie-jar",
  "junk-session-cookies",

  "crlf",
  "no-crlf",
  "use-ascii",

  // "write-out",

  "pass",
  "cacert",
  "capath",
  "crlfile",
  "pinnedpubkey",
  "curves",
  "cert",
  "cert-status",
  "cert-type",
  "key",
  "key-type",
  "ca-native",
  "ssl-allow-beast",
  "ciphers",
  "tls13-ciphers",
  "tlsuser",
  "tlspassword",
  "tlsauthtype",
  "ssl",
  "ssl-auto-client-cert",
  "ssl-no-revoke",
  "ssl-reqd",
  "ssl-revoke-best-effort",

  // "sslv2",  // ignored
  // "sslv3",  // ignored
  "tlsv1",
  "tlsv1.0",
  "tlsv1.1",
  "tlsv1.2",
  "tlsv1.3",
  "tls-max",

  // "false-start",
  "hsts",
  "alpn",
  "no-alpn",

  "form",
  "form-string",
  "form-escape",
  "no-form-escape",

  "doh-url",
  "doh-cert-status",
  // "doh-insecure",  // has no effect

  "location",
  "no-location",
  "location-trusted",
  "no-location-trusted",
  "max-redirs",
  "post301",
  "post302",
  "post303",

  "max-time",
  "connect-timeout",
  "expect100-timeout",
  "happy-eyeballs-timeout-ms",

  "resolve",
  "connect-to",

  "keepalive",
  "no-keepalive",
  "keepalive-time",

  "insecure",
  "no-insecure",
]);

const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  return (
    '"' +
    s.replace(regexEscape, (c: string): string => {
      switch (c) {
        case "\x07":
          return "\\a";
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\v":
          return "\\v";
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
      }
      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 2) {
        return "\\x" + hex.padStart(2, "0");
      }
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
      }
      return "\\U" + hex.padStart(8, "0");
    }) +
    '"'
  );
}

export function repr(word: Word, imports: Set<string>): string {
  const reprs = [];
  for (const t of word.tokens) {
    if (typeof t === "string") {
      reprs.push(reprStr(t));
    } else if (t.type === "variable") {
      reprs.push("getenv(" + reprStr(t.value) + ")");
      imports.add("stdlib.h");
    } else if (t.type === "command") {
      // TODO: read the FILE contents
      reprs.push("popen(" + reprStr(t.value) + ', "r")');
      imports.add("stdio.h");
    }
  }

  // TODO: C can't concatenate strings
  return reprs.join(" + ");
}

export function atof1000(word: Word, imports: Set<string>): string {
  if (word.isString()) {
    // TODO: check it's actually a valid float
    const asFloat = parseFloat(word.toString());
    if (!Number.isNaN(asFloat)) {
      return Math.floor(asFloat * 1000) + "L";
    }
  }
  return "(long)(atof(" + repr(word, imports) + ") * 1000)";
}

export function atoi(word: Word, imports: Set<string>): string {
  if (word.isString()) {
    // TODO: check it's actually a valid int
    return word.toString();
  }
  return "atoi(" + repr(word, imports) + ")";
}
export function atol(word: Word, imports: Set<string>): string {
  if (word.isString()) {
    // TODO: check it's actually a valid int
    return word.toString() + "L";
  }
  return "atol(" + repr(word, imports) + ")";
}

const AUTH_TO_VAR = {
  basic: "CURLAUTH_BASIC",
  negotiate: "CURLAUTH_NEGOTIATE",
  // technically what --libcurl generates but older
  // negotiate: "CURLAUTH_GSSNEGOTIATE",
  digest: "CURLAUTH_DIGEST",
  ntlm: "CURLAUTH_NTLM",
  "ntlm-wb": "CURLAUTH_NTLM_WB",
  bearer: "CURLAUTH_BEARER",
  "aws-sigv4": "CURLAUTH_AWS_SIGV4",
  none: "CURLAUTH_NONE",
};

function requestToC(
  request: Request,
  warnings: Warnings = [],
  imports: Set<string>,
): string {
  let preamble = "";
  preamble += "int main(int argc, char *argv[])\n";
  preamble += "{\n";
  preamble += "  CURLcode ret;\n";
  preamble += "  CURL *hnd;\n";

  let vars = "";

  let code = "";
  code += "  hnd = curl_easy_init();\n";

  let cleanup = "";
  cleanup += "  curl_easy_cleanup(hnd);\n";
  cleanup += "  hnd = NULL;\n";

  if (request.tcpFastopen) {
    code += "  curl_easy_setopt(hnd, CURLOPT_TCP_FASTOPEN, 1L);\n";
  }
  const bufferSize = request.limitRate
    ? atol(request.limitRate, imports) // TODO: parse
    : "102400L";
  code += "  curl_easy_setopt(hnd, CURLOPT_BUFFERSIZE, " + bufferSize + ");\n";

  if (request.localPort) {
    const [start, end] = request.localPort;

    code +=
      "  curl_easy_setopt(hnd, CURLOPT_LOCALPORT, " +
      atol(start, imports) +
      ");\n";
    let range = "1L";
    if (end) {
      range = atol(end, imports) + "-" + atol(start, imports);
    }
    code += "  curl_easy_setopt(hnd, CURLOPT_LOCALPORTRANGE, " + range + ");\n";
  }

  // TODO: if it doesn't have a query string from --data, it's better to
  // do originalUrl because it doesn't need to have the http[s]://
  const url = request.urls[0].url;
  code += "  curl_easy_setopt(hnd, CURLOPT_URL, " + repr(url, imports) + ");\n";

  code += "  curl_easy_setopt(hnd, CURLOPT_NOPROGRESS, 1L);\n";

  if (request.oauth2Bearer) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_XOAUTH2_BEARER, " +
      repr(request.oauth2Bearer, imports) +
      ");\n";
  }

  if (request.proxy) {
    const proxy = repr(request.proxy, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_PROXY, " + proxy + ");\n";
  }
  if (request.proxyType) {
    if (request.proxyType === "http2") {
      code += "  curl_easy_setopt(hnd, CURLOPT_PROXYTYPE, 3L);\n";
    } else if (request.proxyType === "http1") {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXYTYPE, (long)CURLPROXY_HTTP_1_0);\n";
    } else if (request.proxyType === "socks4") {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXYTYPE, (long)CURLPROXY_SOCKS4);\n";
    } else if (request.proxyType === "socks4a") {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXYTYPE, (long)CURLPROXY_SOCKS4A);\n";
    } else if (request.proxyType === "socks5") {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXYTYPE, (long)CURLPROXY_SOCKS5);\n";
    } else if (request.proxyType === "socks5-hostname") {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXYTYPE, (long)CURLPROXY_SOCKS5_HOSTNAME);\n";
    }
  }
  if (request.proxyAuth) {
    const proxyUserpwd = repr(request.proxyAuth, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXYUSERPWD, " + proxyUserpwd + ");\n";
  }
  if (request.proxytunnel) {
    code += "  curl_easy_setopt(hnd, CURLOPT_HTTPPROXYTUNNEL, 1L);\n";
  }
  if (request.proxyAuth) {
    const proxyAuth = AUTH_TO_VAR[request.proxyAuthType];
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXYAUTH, (long)" + proxyAuth + ");\n";
  }

  if (request.preproxy) {
    const preproxy = repr(request.preproxy, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_PRE_PROXY, " + preproxy + ");\n";
  }
  if (request.noproxy) {
    const noproxy = repr(request.noproxy, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_NOPROXY, " + noproxy + ");\n";
  }
  if (request.fail) {
    code += "  curl_easy_setopt(hnd, CURLOPT_FAILONERROR, 1L);\n";
  }
  if (request.netrc) {
    const netrc = {
      optional: "CURL_NETRC_OPTIONAL",
      required: "CURL_NETRC_REQUIRED",
      ignored: "CURL_NETRC_IGNORED",
    }[request.netrc || "ignored"];
    code += "  curl_easy_setopt(hnd, CURLOPT_NETRC, (long)" + netrc + ");\n";
  }
  if (request.netrcFile) {
    const netrcFile = repr(request.netrcFile, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_NETRC_FILE, " + netrcFile + ");\n";
  }

  if (request.useAscii) {
    code += "  curl_easy_setopt(hnd, CURLOPT_TRANSFERTEXT, 1L);\n";
  }

  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    const userpwd = repr(mergeWords(username, ":", password), imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_USERPWD, " + userpwd + ");\n";
  }

  if (request.timeout) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_TIMEOUT_MS, " +
      atof1000(request.timeout, imports) +
      ");\n";
  }

  if (request.urls[0].uploadFile) {
    // TODO
  } else if (request.multipartUploads) {
    preamble += "  curl_mime *mime1;\n";
    preamble += "  curl_mimepart *part1;\n";

    vars += "  mime1 = NULL;\n";

    code += "  mime1 = curl_mime_init(hnd);\n";

    for (const m of request.multipartUploads) {
      code += "  part1 = curl_mime_addpart(mime1);\n";
      if ("contentFile" in m && m.contentFile) {
        code +=
          "  curl_mime_filedata(part1, " +
          repr(m.contentFile, imports) +
          ");\n";
      } else if ("content" in m && m.content) {
        code +=
          "  curl_mime_data(part1, " +
          repr(m.content, imports) +
          ", CURL_ZERO_TERMINATED);\n";
      }
      if ("encoder" in m && m.encoder) {
        code +=
          "  curl_mime_encoder(part1, " + repr(m.encoder, imports) + ");\n";
      }
      if (
        "filename" in m &&
        m.filename &&
        !("contentFile" in m && m.contentFile && eq(m.filename, m.contentFile))
      ) {
        code +=
          "  curl_mime_filename(part1, " + repr(m.filename, imports) + ");\n";
      } else if (!m.filename && "contentFile" in m && m.contentFile) {
        code += "  curl_mime_filename(part1, NULL);\n";
      }
      code += "  curl_mime_name(part1, " + repr(m.name, imports) + ");\n";
      if ("contentType" in m && m.contentType) {
        code +=
          "  curl_mime_type(part1, " + repr(m.contentType, imports) + ");\n";
      }
      if ("headers" in m && m.headers) {
        warnings.push([
          "multipart-headers",
          "multipart headers are not supported: " +
            m.headers.map((h) => h.toString()).join(", "),
        ]);
      }
      if ("headerFiles" in m && m.headerFiles) {
        warnings.push([
          "multipart-headers",
          "multipart header files are not supported: " +
            m.headerFiles.map((h) => h.toString()).join(", "),
        ]);
      }
    }

    code += "  curl_easy_setopt(hnd, CURLOPT_MIMEPOST, mime1);\n";

    cleanup += "  curl_mime_free(mime1);\n";
    cleanup += "  mime1 = NULL;\n";
  } else if (request.data) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_POSTFIELDS, " +
      repr(request.data, imports) +
      ");\n";
    // this isn't correct if .data reads files
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_POSTFIELDSIZE_LARGE, (curl_off_t)" +
      request.data.length.toString() +
      ");\n";
  }
  if (request.formEscape) {
    code += "  curl_easy_setopt(hnd, CURLOPT_MIME_OPTIONS, 1L);\n";
  }

  if (request.urls[0].auth) {
    const curlAuth = AUTH_TO_VAR[request.authType];
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_HTTPAUTH, (long)" + curlAuth + ");\n";
  }

  const headerLines = [];
  for (const [headerName, headerValue] of request.headers) {
    const h = headerName.toLowerCase();
    if (eq(h, "user-agent") || eq(h, "referer")) {
      continue;
    }
    if (headerValue === null) {
      headerLines.push(
        "  headers = curl_slist_append(headers, " +
          repr(mergeWords(headerName, ":"), imports) +
          ");\n",
      );
    } else if (eq(headerValue, "")) {
      headerLines.push(
        "  headers = curl_slist_append(headers, " +
          repr(mergeWords(headerName, ";"), imports) +
          ");\n",
      );
    } else {
      headerLines.push(
        "  headers = curl_slist_append(headers, " +
          repr(mergeWords(headerName, ": ", headerValue), imports) +
          ");\n",
      );
    }
  }
  if (headerLines.length) {
    preamble += "  struct curl_slist *headers;\n";

    vars += "  headers = NULL;\n";
    vars += headerLines.join("");

    code += "  curl_easy_setopt(hnd, CURLOPT_HTTPHEADER, headers);\n";

    cleanup += "  curl_slist_free_all(headers);\n";
    cleanup += "  headers = NULL;\n";
  }
  const referer = request.headers.get("referer");
  if (referer) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_REFERER, " +
      repr(referer, imports) +
      ");\n";
    // TODO: only if passed with --referer and not -H
  }
  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_USERAGENT, " +
      repr(userAgent, imports) +
      ");\n";
  } else if (userAgent === undefined) {
    // TODO: needs to be kept up-to-date with VERSION in cli.ts
    code += '  curl_easy_setopt(hnd, CURLOPT_USERAGENT, "curl/8.2.1");\n';
  }

  if (request.followRedirects) {
    code += "  curl_easy_setopt(hnd, CURLOPT_FOLLOWLOCATION, 1L);\n";
    if (request.followRedirectsTrusted) {
      code += "  curl_easy_setopt(hnd, CURLOPT_UNRESTRICTED_AUTH, 1L);\n";
    }
  }

  if (request.awsSigV4) {
    const awsSig = repr(request.awsSigV4, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_AWS_SIGV4, " + awsSig + ");\n";
  }

  if (request.refererAuto) {
    code += "  curl_easy_setopt(hnd, CURLOPT_AUTOREFERER, 1L);\n";
  }

  if (request.proxyHeaders.length) {
    // TODO: camelCase snake_case orjustoneword?
    preamble += "  struct curl_slist *proxy_headers;\n";

    if (vars) {
      vars += "\n";
    }
    vars += "  proxy_headers = NULL;\n";
    for (const [headerName, headerValue] of request.proxyHeaders) {
      if (headerValue === null) {
        vars +=
          "  proxy_headers = curl_slist_append(proxy_headers, " +
          repr(mergeWords(headerName, ":"), imports) +
          ");\n";
      } else if (eq(headerValue, "")) {
        vars +=
          "  proxy_headers = curl_slist_append(proxy_headers, " +
          repr(mergeWords(headerName, ";"), imports) +
          ");\n";
      } else {
        vars +=
          "  proxy_headers = curl_slist_append(proxy_headers, " +
          repr(mergeWords(headerName, ": ", headerValue), imports) +
          ");\n";
      }
    }

    code += "  curl_easy_setopt(hnd, CURLOPT_PROXYHEADER, proxy_headers);\n";
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_HEADEROPT, (long)CURLHEADER_SEPARATE);\n";

    cleanup += "  curl_slist_free_all(proxy_headers);\n";
    cleanup += "  proxy_headers = NULL;\n";
  }

  const maxRedirs = request.maxRedirects || new Word("50");
  code +=
    "  curl_easy_setopt(hnd, CURLOPT_MAXREDIRS, " +
    atol(maxRedirs, imports) +
    ");\n";

  let httpVersion = "CURL_HTTP_VERSION_2TLS";
  if (request.httpVersion) {
    httpVersion = {
      "1.0": "CURL_HTTP_VERSION_1_0",
      "1.1": "CURL_HTTP_VERSION_1_1",
      "2": "CURL_HTTP_VERSION_2_0",
      "2-prior-knowledge": "CURL_HTTP_VERSION_2_PRIOR_KNOWLEDGE",
      "3": "CURL_HTTP_VERSION_3",
      "3-only": "CURL_HTTP_VERSION_3ONLY",
    }[request.httpVersion];
  }
  code +=
    "  curl_easy_setopt(hnd, CURLOPT_HTTP_VERSION, (long)" +
    httpVersion +
    ");\n";
  if (request.http0_9) {
    code += "  curl_easy_setopt(hnd, CURLOPT_HTTP09_ALLOWED, 1L);\n";
  }

  if (request.post301 || request.post302 || request.post303) {
    const postRedir = [];
    if (request.post301) {
      postRedir.push("CURL_REDIR_POST_301");
    }
    if (request.post302) {
      postRedir.push("CURL_REDIR_POST_302");
    }
    if (request.post303) {
      postRedir.push("CURL_REDIR_POST_303");
    }
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_POSTREDIR, " +
      postRedir.join(" | ") +
      ");\n";
  }

  if (request.compressed) {
    code += '  curl_easy_setopt(hnd, CURLOPT_ACCEPT_ENCODING, "");\n';
  }

  if (request.transferEncoding) {
    code += "  curl_easy_setopt(hnd, CURLOPT_TRANSFER_ENCODING, 1L);\n";
  }

  if (request.speedLimit || request.speedTime) {
    const speedLimit = atol(request.speedLimit || new Word("1"), imports);
    const speedTime = atol(request.speedTime || new Word("30"), imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_LOW_SPEED_LIMIT, " + speedLimit + ");\n";
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_LOW_SPEED_TIME, " + speedTime + ");\n";
  }
  if (request.limitRate) {
    // TODO: parse
    const limitRate = repr(request.limitRate, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_MAX_SEND_SPEED_LARGE, (curl_off_t)" +
      limitRate +
      ");\n";
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_MAX_RECV_SPEED_LARGE, (curl_off_t)" +
      limitRate +
      ");\n";
  }

  if (request.continueAt) {
    if (!eq(request.continueAt, "-")) {
      const continueAt = atoi(request.continueAt, imports);
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_RESUME_FROM_LARGE, (curl_off_t)" +
        continueAt +
        ");\n";
    }
  }

  if (request.pass) {
    const pass = repr(request.pass, imports);
    // TODO: --cert can also set this
    code += "  curl_easy_setopt(hnd, CURLOPT_KEYPASSWD, " + pass + ");\n";
  }
  if (request.proxyPass) {
    // TODO: --proxy-cert can also set this
    const proxyPass = repr(request.proxyPass, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_KEYPASSWD, " + proxyPass + ");\n";
  }

  if (request.cacert) {
    const cacert = repr(request.cacert, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_CAINFO, " + cacert + ");\n";
  }
  if (request.proxyCacert) {
    const proxyCacert = repr(request.proxyCacert, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_CAINFO, " + proxyCacert + ");\n";
  }

  if (request.capath || request.proxyCapath) {
    if (request.capath) {
      const capath = repr(request.capath, imports);
      code += "  curl_easy_setopt(hnd, CURLOPT_CAPATH, " + capath + ");\n";
      const proxyCapath = repr(request.proxyCapath || request.capath, imports);
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXY_CAPATH, " + proxyCapath + ");\n";
    } else if (request.proxyCapath) {
      // placate type checker
      const proxyCapath = repr(request.proxyCapath, imports);
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXY_CAPATH, " + proxyCapath + ");\n";
    }
  }

  if (request.crlfile || request.proxyCrlfile) {
    if (request.crlfile) {
      const crlfile = repr(request.crlfile, imports);
      code += "  curl_easy_setopt(hnd, CURLOPT_CRLFILE, " + crlfile + ");\n";
      const proxyCrlfile = repr(
        request.proxyCrlfile || request.crlfile,
        imports,
      );
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXY_CRLFILE, " +
        proxyCrlfile +
        ");\n";
    } else if (request.proxyCrlfile) {
      // placate type checker
      const proxyCrlfile = repr(request.proxyCrlfile, imports);
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_PROXY_CRLFILE, " +
        proxyCrlfile +
        ");\n";
    }
  }
  if (request.pinnedpubkey) {
    const pinnedpubkey = repr(request.pinnedpubkey, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PINNEDPUBLICKEY, " +
      pinnedpubkey +
      ");\n";
  }
  // TODO: --proxy-pinnedpubkey ?
  if (request.curves) {
    const curves = repr(request.curves, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_SSL_EC_CURVES, " + curves + ");\n";
  }
  if (request.cert) {
    const [cert, pass] = request.cert;
    if (pass) {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_KEYPASSWD, " +
        repr(pass, imports) +
        ");\n";
    }
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_SSLCERT, " +
      repr(cert, imports) +
      ");\n";
  }
  if (request.proxyCert) {
    // TODO: split
    const proxyCert = repr(request.proxyCert, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSLCERT, " + proxyCert + ");\n";
  }
  if (request.certType) {
    const certType = repr(request.certType, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_SSLCERTTYPE, " + certType + ");\n";
  }
  if (request.proxyCertType) {
    const proxyCertType = repr(request.proxyCertType, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSLCERTTYPE, " +
      proxyCertType +
      ");\n";
  }
  if (request.key) {
    const key = repr(request.key, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_SSLKEY, " + key + ");\n";
  }
  if (request.proxyKey) {
    const proxyKey = repr(request.proxyKey, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSLKEY, " + proxyKey + ");\n";
  }
  if (request.keyType) {
    const keyType = repr(request.keyType, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_SSLKEYTYPE, " + keyType + ");\n";
  }
  if (request.proxyKeyType) {
    const proxyKeyType = repr(request.proxyKeyType, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSLKEYTYPE, " +
      proxyKeyType +
      ");\n";
  }

  if (request.insecure) {
    code += "  curl_easy_setopt(hnd, CURLOPT_SSL_VERIFYPEER, 0L);\n";
    code += "  curl_easy_setopt(hnd, CURLOPT_SSL_VERIFYHOST, 0L);\n";
  }
  if (request.proxyInsecure) {
    code += "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSL_VERIFYPEER, 0L);\n";
    code += "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSL_VERIFYHOST, 0L);\n";
  }
  if (request.certStatus) {
    code += "  curl_easy_setopt(hnd, CURLOPT_SSL_VERIFYSTATUS, 1L);\n";
  }
  if (request.dohCertStatus) {
    code += "  curl_easy_setopt(hnd, CURLOPT_DOH_SSL_VERIFYSTATUS, 1L);\n";
  }

  let tlsVersion = null;
  if (request.tlsVersion) {
    tlsVersion = {
      "1": "CURL_SSLVERSION_TLSv1",
      "1.0": "CURL_SSLVERSION_TLSv1_0",
      "1.1": "CURL_SSLVERSION_TLSv1_1",
      "1.2": "CURL_SSLVERSION_TLSv1_2",
      "1.3": "CURL_SSLVERSION_TLSv1_3",
    }[request.tlsVersion];
  }
  let tlsMax = null;
  if (request.tlsMax) {
    if (request.tlsMax.isString()) {
      const tlsMaxVal = request.tlsMax.toString();
      switch (tlsMaxVal) {
        case "1.0":
          tlsMax = "CURL_SSLVERSION_MAX_TLSv1_0";
          break;
        case "1.1":
          tlsMax = "CURL_SSLVERSION_MAX_TLSv1_1";
          break;
        case "1.2":
          tlsMax = "CURL_SSLVERSION_MAX_TLSv1_2";
          break;
        case "1.3":
          tlsMax = "CURL_SSLVERSION_MAX_TLSv1_3";
          break;
        case "default":
          tlsMax = "CURL_SSLVERSION_MAX_DEFAULT";
          break;
        default:
          warnings.push([
            "tls-max",
            "unknown value for --tls-max: " + JSON.stringify(tlsMaxVal),
          ]);
      }
    } else {
      warnings.push([
        "tls-max",
        "unparseable value for --tls-max: " +
          JSON.stringify(request.tlsMax.toString()),
      ]);
    }
  }
  if (tlsVersion || tlsMax) {
    if (!tlsVersion) {
      // not really necessary since it's 0
      tlsVersion = "CURL_SSLVERSION_DEFAULT";
    }
    code += "  curl_easy_setopt(hnd, CURLOPT_SSLVERSION, (long)";
    if (tlsMax) {
      code += "(" + tlsVersion + " | " + tlsMax + ")";
    } else {
      code += tlsVersion;
    }
    code += ");\n";
  }
  if (request.proxyTlsv1) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSLVERSION, (long)CURL_SSLVERSION_TLSv1);\n";
  }
  if (
    request.sslAllowBeast ||
    request.sslNoRevoke ||
    request.sslRevokeBestEffort ||
    request.caNative ||
    request.sslAutoClientCert
  ) {
    const sslOptions = [];
    if (request.sslAllowBeast) {
      sslOptions.push("CURLSSLOPT_ALLOW_BEAST");
    }
    if (request.sslNoRevoke) {
      sslOptions.push("CURLSSLOPT_NO_REVOKE");
    }
    if (request.sslRevokeBestEffort) {
      sslOptions.push("CURLSSLOPT_REVOKE_BEST_EFFORT");
    }
    if (request.caNative) {
      sslOptions.push("CURLSSLOPT_NATIVE_CA");
    }
    if (request.sslAutoClientCert) {
      sslOptions.push("CURLSSLOPT_AUTO_CLIENT_CERT");
    }
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_SSL_OPTIONS, (long)" +
      (sslOptions.length > 1 ? "(" : "") +
      sslOptions.join(" | ") +
      (sslOptions.length > 1 ? ")" : "") +
      ");\n";
  }

  if (
    request.proxySslAllowBeast ||
    request.proxyCaNative ||
    request.proxySslAutoClientCert
  ) {
    const sslOptions = [];
    if (request.proxySslAllowBeast) {
      sslOptions.push("CURLSSLOPT_ALLOW_BEAST");
    }
    if (request.proxyCaNative) {
      sslOptions.push("CURLSSLOPT_NATIVE_CA");
    }
    if (request.proxySslAutoClientCert) {
      sslOptions.push("CURLSSLOPT_AUTO_CLIENT_CERT");
    }
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSL_OPTIONS, (long)" +
      sslOptions.join(" | (long)") +
      ");\n";
  }

  if (request.pathAsIs) {
    code += "  curl_easy_setopt(hnd, CURLOPT_PATH_AS_IS, 1L);\n";
  }

  if (request.remoteTime) {
    code += "  curl_easy_setopt(hnd, CURLOPT_FILETIME, 1L);\n";
  }

  if (request.crlf) {
    code += "  curl_easy_setopt(hnd, CURLOPT_CRLF, 1L);\n";
  }

  if (request.cookieFiles) {
    for (const cookieFile of request.cookieFiles) {
      // TODO: why can curl set this more than once?
      const cookieFile_ = repr(cookieFile, imports);
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_COOKIEFILE, " + cookieFile_ + ");\n";
    }
  }
  if (request.cookieJar) {
    const cookieJar = repr(request.cookieJar, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_COOKIEJAR, " + cookieJar + ");\n";
  }
  if (request.junkSessionCookies) {
    code += "  curl_easy_setopt(hnd, CURLOPT_COOKIESESSION, 1L);\n";
  }

  // TODO: this is more complicated.
  // --head just sets CURLOPT_NOBODY and CURLOPT_FILETIME
  // --upload-file just sets CURLOPT_UPLOAD and CURLOPT_INFILESIZE_LARGE
  let expectedMethod = "GET";
  if (request.data || request.multipartUploads) {
    expectedMethod = "POST";
  }
  if (!eq(request.urls[0].method, expectedMethod)) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_CUSTOMREQUEST, " +
      repr(request.urls[0].method, imports) +
      ");\n";
  }

  if (request.interface) {
    const interface_ = repr(request.interface, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_INTERFACE, " + interface_ + ");\n";
  }

  if (request.krb) {
    const krb = repr(request.krb, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_KRBLEVEL, " + krb + ");\n";
  }

  if (request.connectTimeout) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_CONNECTTIMEOUT_MS, " +
      atof1000(request.connectTimeout, imports) +
      ");\n";
  }

  if (request.dohUrl) {
    const dohUrl = repr(request.dohUrl, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_DOH_URL, " + dohUrl + ");\n";
  }

  if (request.ciphers) {
    const ciphers = repr(request.ciphers, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_SSL_CIPHER_LIST, " + ciphers + ");\n";
  }
  if (request.proxyCiphers) {
    const proxyCiphers = repr(request.proxyCiphers, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SSL_CIPHER_LIST, " +
      proxyCiphers +
      ");\n";
  }
  if (request.tls13Ciphers) {
    const tls13Ciphers = repr(request.tls13Ciphers, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_TLS13_CIPHERS, " + tls13Ciphers + ");\n";
  }
  if (request.proxyTls13Ciphers) {
    const proxyTls13Ciphers = repr(request.proxyTls13Ciphers, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_TLS13_CIPHERS, " +
      proxyTls13Ciphers +
      ");\n";
  }

  if (request.verbose) {
    code += "  curl_easy_setopt(hnd, CURLOPT_VERBOSE, 1L);\n";
  }
  if (request.maxFilesize) {
    // TODO: parse
    const maxFilesize = atol(request.maxFilesize, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_MAXFILESIZE_LARGE, (curl_off_t)" +
      maxFilesize +
      ");\n";
  }

  // TODO: these should be mutually exclusive
  if (request.ipv6) {
    code += "  curl_easy_setopt(hnd, CURLOPT_IPRESOLVE, 2L);\n";
  } else if (request.ipv4) {
    code += "  curl_easy_setopt(hnd, CURLOPT_IPRESOLVE, 1L);\n";
  }

  if (request.sslReqd || request.ssl) {
    if (request.sslReqd) {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_USE_SSL, (long)CURLUSESSL_ALL);\n";
    } else if (request.ssl) {
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_USE_SSL, (long)CURLUSESSL_TRY);\n";
    }
  }

  if (request.socks5GssapiNec) {
    code += "  curl_easy_setopt(hnd, CURLOPT_SOCKS5_GSSAPI_NEC, 1L);\n";
  }

  if (request.socks5Basic) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_SOCKS5_AUTH, (long)CURLAUTH_BASIC);\n";
  } else if (request.socks5Gssapi) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_SOCKS5_AUTH, (long)CURLAUTH_GSSNEGOTIATE);\n";
  }

  if (request.socks5GssapiService) {
    const socks5GssapiService = repr(request.socks5GssapiService, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SERVICE_NAME, " +
      socks5GssapiService +
      ");\n";
  }

  if (request.serviceName) {
    const serviceName = repr(request.serviceName, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_SERVICE_NAME, " + serviceName + ");\n";
  }
  if (request.proxyServiceName) {
    const proxyServiceName = repr(request.proxyServiceName, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_SERVICE_NAME, " +
      proxyServiceName +
      ");\n";
  }

  // TODO: check
  if (request.ignoreContentLength) {
    code += "  curl_easy_setopt(hnd, CURLOPT_IGNORE_CONTENT_LENGTH, 1L);\n";
  }

  if (request.ftpSkipPasvIp !== false) {
    code += "  curl_easy_setopt(hnd, CURLOPT_FTP_SKIP_PASV_IP, 1L);\n";
  }
  if (request.keepAlive !== false) {
    code += "  curl_easy_setopt(hnd, CURLOPT_TCP_KEEPALIVE, 1L);\n";
    if (request.keepAliveTime) {
      const keepAliveTime = atol(request.keepAliveTime, imports);
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_TCP_KEEPIDLE, " +
        keepAliveTime +
        ");\n";
      code +=
        "  curl_easy_setopt(hnd, CURLOPT_TCP_KEEPINTVL, " +
        keepAliveTime +
        ");\n";
    }
  }

  if (request.proto) {
    // TODO: parse
    const proto = repr(request.proto, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_PROTOCOLS_STR, " + proto + ");\n";
  }
  if (request.protoRedir) {
    // TODO: parse
    const protoRedir = repr(request.protoRedir, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_REDIR_PROTOCOLS_STR, " +
      protoRedir +
      ");\n";
  }

  if (request.resolve) {
    preamble += "  struct curl_slist *resolve;\n";

    if (vars) {
      vars += "\n";
    }
    vars += "  resolve = NULL;\n";
    for (const line of request.resolve) {
      vars +=
        "  resolve = curl_slist_append(resolve, " +
        repr(line, imports) +
        ");\n";
    }

    code += "  curl_easy_setopt(hnd, CURLOPT_RESOLVE, resolve);\n";

    cleanup += "  curl_slist_free_all(resolve);\n";
    cleanup += "  resolve = NULL;\n";
  }
  if (request.connectTo) {
    // TODO: camelCase snake_case orjustoneword?
    preamble += "  struct curl_slist *connect_to;\n";

    if (vars) {
      vars += "\n";
    }
    vars += "  connect_to = NULL;\n";
    for (const line of request.connectTo) {
      vars +=
        "  connect_to = curl_slist_append(connect_to, " +
        repr(line, imports) +
        ");\n";
    }

    code += "  curl_easy_setopt(hnd, CURLOPT_CONNECT_TO, connect_to);\n";

    cleanup += "  curl_slist_free_all(connect_to);\n";
    cleanup += "  connect_to = NULL;\n";
  }

  if (request.tlsuser) {
    const tlsuser = repr(request.tlsuser, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_TLSAUTH_USERNAME, " + tlsuser + ");\n";
  }
  if (request.tlspassword) {
    const tlspassword = repr(request.tlspassword, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_TLSAUTH_PASSWORD, " +
      tlspassword +
      ");\n";
  }
  if (request.tlsauthtype) {
    const tlsauthtype = repr(request.tlsauthtype, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_TLSAUTH_TYPE, " + tlsauthtype + ");\n";
  }

  if (request.proxyTlsuser) {
    const proxyTlsuser = repr(request.proxyTlsuser, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_TLSAUTH_USERNAME, " +
      proxyTlsuser +
      ");\n";
  }
  if (request.proxyTlspassword) {
    const proxyTlspassword = repr(request.proxyTlspassword, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_TLSAUTH_PASSWORD, " +
      proxyTlspassword +
      ");\n";
  }
  if (request.proxyTlsauthtype) {
    const proxyTlsauthtype = repr(request.proxyTlsauthtype, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_PROXY_TLSAUTH_TYPE, " +
      proxyTlsauthtype +
      ");\n";
  }

  if (request.delegation) {
    if (eq(request.delegation, "always")) {
      code += "  curl_easy_setopt(hnd, CURLOPT_GSSAPI_DELEGATION, 2L);\n";
    } else if (eq(request.delegation, "policy")) {
      code += "  curl_easy_setopt(hnd, CURLOPT_GSSAPI_DELEGATION, 1L);\n";
    }
  }

  if (request.saslAuthzid) {
    const zid = repr(request.saslAuthzid, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_SASL_AUTHZID, " + zid + ");\n";
  }
  if (request.saslIr) {
    code += "  curl_easy_setopt(hnd, CURLOPT_SASL_IR, 1L);\n";
  }

  if (request.alpn === false) {
    code += "  curl_easy_setopt(hnd, CURLOPT_SSL_ENABLE_ALPN, 0L);\n";
  }

  if (request.unixSocket) {
    const socket = repr(request.unixSocket, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_UNIX_SOCKET_PATH, " + socket + ");\n";
  }
  if (request.abstractUnixSocket) {
    const socket = repr(request.abstractUnixSocket, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_ABSTRACT_UNIX_SOCKET, " +
      socket +
      ");\n";
  }

  if (request.protoDefault) {
    const protoDefault = repr(request.protoDefault, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_DEFAULT_PROTOCOL, " +
      protoDefault +
      ");\n";
  }

  if (request.expect100Timeout) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_EXPECT_100_TIMEOUT_MS, " +
      atof1000(request.expect100Timeout, imports) +
      ");\n";
  }
  if (request.happyEyeballsTimeoutMs) {
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS, " +
      atol(request.happyEyeballsTimeoutMs, imports) +
      ");\n";
  }

  if (request.haproxyClientIp) {
    const haproxyClientIp = repr(request.haproxyClientIp, imports);
    code +=
      "  curl_easy_setopt(hnd, CURLOPT_HAPROXY_CLIENT_IP, " +
      haproxyClientIp +
      ");\n";
  }
  if (request.haproxyProtocol) {
    code += "  curl_easy_setopt(hnd, CURLOPT_HAPROXYPROTOCOL, 1L);\n";
  }

  if (request.disallowUsernameInUrl) {
    code += "  curl_easy_setopt(hnd, CURLOPT_DISALLOW_USERNAME_IN_URL, 1L);\n";
  }

  if (request.altSvc) {
    const altSvc = repr(request.altSvc, imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_ALTSVC, " + altSvc + ");\n";
  }

  if (request.hsts) {
    // TODO: warn that files aren't read?
    const hsts = repr(request.hsts[request.hsts.length - 1], imports);
    code += "  curl_easy_setopt(hnd, CURLOPT_HSTS, " + hsts + ");\n";
  }

  code += "\n";
  code += "  ret = curl_easy_perform(hnd);\n";

  let end = "";
  end += "  return (int)ret;\n";
  end += "}\n";

  return (
    preamble +
    (vars ? "\n" + vars : "") +
    "\n" +
    code +
    "\n" +
    cleanup +
    "\n" +
    end
  );
}

export function printImports(imps: Set<string>): string {
  let s = "";
  for (const imp of Array.from(imps).sort()) {
    s += "#include <" + imp + ">\n";
  }
  return s;
}

export function _toC(requests: Request[], warnings: Warnings = []): string {
  const imports = new Set<string>(["curl/curl.h"]);

  const request = getFirst(requests, warnings, { cookieFiles: true });
  const code = requestToC(request, warnings, imports);

  return printImports(imports) + "\n" + code;
}

export function toCWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const c = _toC(requests, warnings);
  return [c, warnings];
}

export function toC(curlCommand: string | string[]): string {
  return toCWarn(curlCommand)[0];
}
