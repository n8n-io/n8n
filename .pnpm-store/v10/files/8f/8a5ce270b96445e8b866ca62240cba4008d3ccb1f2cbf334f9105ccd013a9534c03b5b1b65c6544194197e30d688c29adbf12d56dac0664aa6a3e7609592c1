import { warnIfPartsIgnored } from "../Warnings.js";
import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "cookie-jar",

  "ipv4",
  "no-ipv4",
  "ipv6",
  "no-ipv6",

  "form", // not supported, more specific warning
  "form-string",

  "ciphers",
  "insecure",
  "cert",
  "cert-type",
  "key",
  "key-type",
  "cacert",
  "capath",
  "crlfile",
  "pinnedpubkey",
  "random-file",
  "egd-file",
  "hsts",

  "noproxy", // not fully supported
  "proxy", // not supported
  "proxy-user",

  // TODO: supported by all?
  "globoff",
  "no-globoff",

  "netrc",
  "netrc-optional",

  "timeout",
  "connect-timeout",
  "limit-rate",

  "compressed",
  "no-compressed",

  // Wget picks the auth and some it doesn't support but there's a more
  // specific error message for those.
  "anyauth",
  "no-anyauth",
  "digest",
  "no-digest",
  "aws-sigv4",
  "negotiate",
  "no-negotiate",
  "delegation", // GSS/kerberos
  // "service-name", // GSS/kerberos, not supported
  "ntlm",
  "no-ntlm",
  "ntlm-wb",
  "no-ntlm-wb",
  "no-digest",

  "output",
  "upload-file",

  "continue-at",
  "clobber",
  "remote-time",

  "keep-alive",

  "silent",
  "verbose",

  "next",
]);

// TODO: check this
// https://www.gnu.org/software/bash/manual/html_node/Quoting.html
const regexDoubleEscape = /\$|`|"|\\|!/gu;
const unprintableChars = /\p{C}|[^ \P{Z}]/gu; // TODO: there's probably more
const regexAnsiCEscape = /\p{C}|[^ \P{Z}]|\\|'/gu;
// https://unix.stackexchange.com/questions/270977/
const shellChars = /[\x02-\x09\x0b-\x1a\\#?`(){}[\]^*<=>~|; "!$&'\x82-\xff]/;
export function reprStr(s: string, mustQuote = false): string {
  const containsUnprintableChars = unprintableChars.test(s);
  if (containsUnprintableChars) {
    return (
      "$'" +
      s.replace(regexAnsiCEscape, (c: string) => {
        switch (c) {
          case "\x07":
            return "\\a";
          case "\b":
            return "\\b";
          case "\x1B":
            return "\\e";
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
          case "'":
            return "\\'";
          // TODO: unnecessary?
          //   case '"':
          //     return '\\"';
          //   case "?":
          //     return "\\?";
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
      "'"
    );
  }
  if (
    (s.includes('"') ||
      s.includes("$") ||
      s.includes("`") ||
      s.includes("!") ||
      mustQuote) &&
    !s.includes("'")
  ) {
    return "'" + s + "'";
  }
  if (shellChars.test(s) || mustQuote) {
    return (
      '"' +
      s.replace(regexDoubleEscape, (c: string) => {
        switch (c[0]) {
          case "$":
            return "\\$";
          case "`":
            return "\\`";
          case '"':
            return '\\"';
          case "\\":
            return "\\\\";
          case "!":
            // ! might have an effect or it might not, depending on if
            // the command is in a file or pasted into the shell and other things.
            // If it's backslash escaped, the backslash is still not removed, a
            // safe way to escape it is to close the double quote, put the ! in
            // single quotes and then open the double quote again.
            return "\"'!'\"";
        }
        // Should never happen
        return c;
      }) +
      '"'
    );
  }
  return s;
}

export function repr(w: Word): string {
  // TODO: put variables in the quotes
  const args: string[] = [];
  for (const [i, t] of w.tokens.entries()) {
    if (typeof t === "string") {
      // A string after a variable cannot be un-quoted
      // After a subcommand it's usually okay but that's more complex.
      args.push(reprStr(t, !!i));
    } else if (t.type === "variable") {
      args.push(t.text);
    } else {
      // TODO: this will probably lead to syntax errors
      args.push(t.text);
    }
  }
  return args.join("");
}

function requestToWget(request: Request, warnings: Warnings): string {
  warnIfPartsIgnored(request, warnings, {
    dataReadsFile: true,
    cookieFiles: true,
    multipleUrls: true,
  });
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

  const args: string[] = [];

  if (
    request.urls[0].uploadFile ||
    (request.dataArray &&
      request.dataArray.length === 1 &&
      !(request.dataArray[0] instanceof Word) &&
      !request.dataArray[0].name) ||
    request.data
  ) {
    if (!eq(request.urls[0].method, "POST")) {
      args.push("--method=" + repr(request.urls[0].method));
    }
  } else if (!eq(request.urls[0].method, "GET")) {
    args.push("--method=" + repr(request.urls[0].method));
  }
  if (request.urls.length > 1) {
    const uniqueMethods = new Set<string>(
      request.urls.map((u) => u.method.toString()),
    );

    // TODO: add tons of checks/warnings that wget doesn't let you set things per-URL
    if (uniqueMethods.size > 1) {
      warnings.push([
        "mixed-methods",
        "the input curl command uses multiple HTTP methods, which Wget doesn't support: " +
          request.urls
            .map((u) => JSON.stringify(u.method.toString()))
            .join(", "),
      ]);
    }
  }

  if (request.cookieFiles && request.cookieFiles.length) {
    for (const cookieFile of request.cookieFiles) {
      args.push("--load-cookies=" + repr(cookieFile));
    }

    if (request.cookieFiles.length > 1) {
      const lastCookieFile =
        request.cookieFiles[request.cookieFiles.length - 1];
      warnings.push([
        "multiple-cookie-files",
        "Wget only supports reading cookies from one file, only the last one will be sent: " +
          lastCookieFile.toString(),
      ]);
    }
  }
  if (request.cookieJar) {
    args.push("--save-cookies=" + repr(request.cookieJar));
    // TODO: --keep-session-cookies
  }

  if (request.headers.length) {
    for (const [headerName, headerValue] of request.headers) {
      args.push(
        "--header=" + repr(mergeWords(headerName, ": ", headerValue ?? "")),
      );
      // TODO: there's also --referer, --user-agent and --content-disposition
    }
  }

  if (request.compressed !== undefined) {
    if (request.compressed) {
      args.push("--compression=auto");
    } else {
      args.push("--compression=none");
    }
  }

  if (request.maxRedirects && request.maxRedirects.toString() !== "20") {
    // TODO: escape/parse?
    args.push("--max-redirect=" + repr(request.maxRedirects));
  }

  if (request.ipv4) {
    args.push("--inet4-only");
  }
  if (request.ipv6) {
    args.push("--inet6-only");
  }

  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;
    args.push("--user=" + repr(user));
    if (password.toBool()) {
      args.push("--password=" + repr(password));
    }
    if (request.authType === "basic") {
      args.push("--auth-no-challenge");
    }

    if (
      !["none", "basic", "digest", "ntlm", "ntlm-wb", "negotiate"].includes(
        request.authType,
      )
    ) {
      warnings.push([
        "wget-unsupported-auth",
        "Wget doesn't support " + request.authType + " authentication",
      ]);
    }
  }

  if (request.urls[0].uploadFile) {
    if (
      eq(request.urls[0].uploadFile, "-") ||
      eq(request.urls[0].uploadFile, ".")
    ) {
      warnings.push([
        "wget-stdin",
        "Wget does not support uploading from stdin",
      ]);
    }
    if (eq(request.urls[0].method, "POST")) {
      args.push("--post-file=" + repr(request.urls[0].uploadFile));
    } else {
      args.push("--body-file=" + repr(request.urls[0].uploadFile));
    }
  } else if (request.multipartUploads) {
    warnings.push([
      "multipart",
      "Wget does not support sending multipart/form-data",
    ]);
  } else if (
    request.dataArray &&
    request.dataArray.length === 1 &&
    !(request.dataArray[0] instanceof Word) &&
    !request.dataArray[0].name
  ) {
    if (eq(request.urls[0].method, "POST")) {
      args.push("--post-file=" + repr(request.dataArray[0].filename));
    } else {
      args.push("--body-file=" + repr(request.dataArray[0].filename));
    }
  } else if (request.data) {
    if (eq(request.urls[0].method, "POST")) {
      args.push("--post-data=" + repr(request.data));
    } else {
      args.push("--body-data=" + repr(request.data));
    }
  }

  // https://www.gnu.org/software/wget/manual/html_node/HTTPS-_0028SSL_002fTLS_0029-Options.html
  if (request.ciphers) {
    args.push("--ciphers=" + repr(request.ciphers));
  }
  if (request.insecure) {
    args.push("--no-check-certificate");
  }
  if (request.cert) {
    const [cert, password] = request.cert;
    args.push("--certificate=" + repr(cert));
    if (password) {
      warnings.push([
        "wget-cert-password",
        // TODO: is this true?
        "Wget does not support certificate passwords",
      ]);
    }
  }
  if (request.certType) {
    args.push("--certificate-type=" + repr(request.certType));
  }
  if (request.key) {
    args.push("--private-key=" + repr(request.key));
  }
  if (request.keyType) {
    args.push("--private-key-type=" + repr(request.keyType));
  }

  if (request.cacert) {
    args.push("--ca-certificate=" + repr(request.cacert));
  }
  if (request.capath) {
    args.push("--ca-directory=" + repr(request.capath));
  }
  if (request.crlfile) {
    args.push("--crl-file=" + repr(request.crlfile));
  }
  if (request.pinnedpubkey) {
    args.push("--pinnedpubkey=" + repr(request.pinnedpubkey));
  }
  if (request.randomFile) {
    args.push("--random-file=" + repr(request.randomFile));
  }
  if (request.egdFile) {
    args.push("--egd-file=" + repr(request.egdFile));
  }
  if (request.hsts) {
    for (const hsts of request.hsts) {
      // TODO: warn multiple won't work
      args.push("--hsts-file=" + repr(hsts));
    }
  }
  // TODO: --secure-protocol

  if (request.netrc === "ignored") {
    args.push("--no-netrc");
  }

  if (request.noproxy) {
    if (eq(request.noproxy, "*")) {
      args.push("--no-proxy");
    } else {
      warnings.push([
        "wget-noproxy",
        "Wget does not support noproxy for specific hosts",
      ]);
    }
  }
  if (request.proxy) {
    warnings.push([
      "wget-proxy",
      "Wget requires specifying proxies in environment variables: " +
        JSON.stringify(request.proxy.toString()),
    ]);
  }
  if (request.proxyAuth) {
    const [proxyUser, proxyPassword] = request.proxyAuth.split(":", 2);
    args.push("--proxy-user=" + repr(proxyUser));
    if (proxyPassword && proxyPassword.toBool()) {
      args.push("--proxy-password=" + repr(proxyPassword));
    }
  }

  if (request.timeout) {
    // TODO: warn that this is not for the whole request
    args.push("--timeout=" + repr(request.timeout));
  }
  if (request.connectTimeout) {
    args.push("--connect-timeout=" + repr(request.connectTimeout));
  }

  // TODO: curl's --speed-limit
  if (request.limitRate) {
    // TODO: they probably have different syntaxes
    args.push("--limit-rate=" + repr(request.limitRate));
  }

  // TODO: this doesn't match up. Warn if multiple, etc.
  if (request.urls[0].output) {
    args.push("--output-document=" + repr(request.urls[0].output));
  } else {
    args.push("--output-document -");
  }
  if (request.clobber === false) {
    args.push("--no-clobber");
  }
  // TODO: --create-dirs

  if (request.remoteTime === false) {
    args.push("--no-use-server-timestamps");
  }

  if (request.continueAt) {
    if (eq(request.continueAt, "-")) {
      args.push("--continue");
    } else {
      args.push("--start-pos=" + repr(request.continueAt));
    }
  }

  if (request.keepAlive === false) {
    args.push("--no-http-keep-alive");
  }

  // This is used only for FTP by Wget, we might as well add it even
  // though we don't support FTP.
  if (request.globoff) {
    // TODO: this isn't great, it has different meanings from curl to Wget
    // TODO: don't remove \[ and \] from original URL?
    args.push("--no-glob");
  }

  // TODO:
  // curl:
  // --silent, --verbose, --no-verbose (the default)
  // --progress-meter (the default), --no-progress-meter, --progress-bar
  // --trace-ascii, --trace
  // wget:
  // --quiet, --verbose (the default), --no-verbose
  // --progress=bar (the default), --progress=dot
  // --debug
  if (request.silent) {
    args.push("--quiet");
  } else if (request.verbose === false) {
    args.push("--no-verbose");
  }

  for (const url of request.urls) {
    // TODO: wget probably has a different syntax
    args.push(repr(url.url));
  }

  const multiline =
    args.length > 3 || args.reduce((a, b) => a + b.length, 0) > 80 - 5;
  const joiner = multiline ? " \\\n  " : " ";
  return "wget " + args.join(joiner) + "\n";
}

// TODO: --verbose ?
export function _toWget(requests: Request[], warnings: Warnings = []): string {
  return requests.map((r) => requestToWget(r, warnings)).join("\n\n");
}

export function toWgetWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const wget = _toWget(requests, warnings);
  return [wget, warnings];
}

export function toWget(curlCommand: string | string[]): string {
  return toWgetWarn(curlCommand)[0];
}
