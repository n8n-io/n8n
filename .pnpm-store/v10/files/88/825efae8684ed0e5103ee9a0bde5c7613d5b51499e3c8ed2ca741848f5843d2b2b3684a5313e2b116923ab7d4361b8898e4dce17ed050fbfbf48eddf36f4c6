import { Word, eq } from "../shell/Word.js";
import { warnf } from "../Warnings.js";
import type { GlobalConfig, OperationConfig } from "./opts.js";

// https://github.com/curl/curl/blob/curl-7_87_0/lib/urlapi.c#L60
// https://github.com/curl/curl/blob/curl-7_87_0/lib/urldata.h#L1295
export interface Curl_URL {
  scheme: Word;

  auth?: Word;
  user?: Word;
  password?: Word;

  // options: string /* IMAP only? */;
  host: Word;
  // zoneid: string /* for numerical IPv6 addresses */;
  port: Word;
  path: Word;
  query: Word;
  fragment: Word;
  // portnum: number /* the numerical version */;
}

// https://github.com/curl/curl/blob/curl-7_88_1/src/tool_urlglob.c#L327
const MAX_IP6LEN = 128;
function isIpv6(glob: string): boolean {
  if (glob.length > MAX_IP6LEN) {
    return false;
  }
  // TODO: curl tries to parse the glob as a hostname.
  return !glob.includes("-");
}

function warnAboutGlobs(global_: GlobalConfig, url: string) {
  // Find any glob expressions in the URL and underline them
  let prev = "";
  for (let i = 0; i < url.length; i++) {
    const cur = url[i];
    if (cur === "[" && prev !== "\\") {
      let j = i + 1;
      while (j < url.length && url[j] !== "]") {
        j++;
      }
      if (j < url.length && url[j] === "]") {
        const glob = url.slice(i, j + 1);
        // could be ipv6 address
        if (!isIpv6(glob)) {
          warnf(global_, [
            "glob-in-url",
            `globs in the URL are not supported:\n` +
              `${url}\n` +
              " ".repeat(i) +
              "^".repeat(glob.length),
          ]);
        }
        prev = "";
      } else {
        // No closing bracket
        warnf(global_, [
          "unbalanced-glob",
          "bracket doesn't have a closing bracket:\n" +
            `${url}\n` +
            `${" ".repeat(i)}^`,
        ]);
        return; // malformed URL, stop looking for globs
      }
    } else if (cur === "{" && prev !== "\\") {
      let j = i + 1;
      while (j < url.length && url[j] !== "}") {
        j++;
      }
      if (j < url.length && url[j] === "}") {
        const glob = url.slice(i, j + 1);
        warnf(global_, [
          "glob-in-url",
          `globs in the URL are not supported:\n` +
            `${url}\n` +
            " ".repeat(i) +
            "^".repeat(glob.length),
        ]);
        prev = "";
      } else {
        // No closing bracket
        warnf(global_, [
          "unbalanced-glob",
          "bracket doesn't have a closing bracket:\n" +
            `${url}\n` +
            `${" ".repeat(i)}^`,
        ]);
        return; // malformed URL, stop looking for globs
      }
    }

    prev = cur;
  }
}

export function parseurl(
  global_: GlobalConfig,
  config: OperationConfig,
  url: Word,
): Curl_URL {
  // This is curl's parseurl()
  // https://github.com/curl/curl/blob/curl-7_85_0/lib/urlapi.c#L1144
  // Except we want to accept all URLs.
  // curl further validates URLs in curl_url_get()
  // https://github.com/curl/curl/blob/curl-7_86_0/lib/urlapi.c#L1374
  const u: Curl_URL = {
    scheme: new Word(),
    host: new Word(),
    port: new Word(),
    path: new Word(), // with leading '/'
    query: new Word(), // with leading '?'
    fragment: new Word(), // with leading '#'
  };

  // Remove url glob escapes
  // https://github.com/curl/curl/blob/curl-7_87_0/src/tool_urlglob.c#L395-L398
  if (!config.globoff) {
    if (url.isString()) {
      warnAboutGlobs(global_, url.toString());
    }
    url = url.replace(/\\([[\]{}])/g, "$1");
  }

  // Prepend "http"/"https" if the scheme is missing.
  // RFC 3986 3.1 says
  //   scheme      = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
  // but curl will accept a digit/plus/minus/dot in the first character
  // curl will also accept a url with one / like http:/localhost
  // https://github.com/curl/curl/blob/curl-7_85_0/lib/urlapi.c#L960
  let schemeMatch = null;
  if (url.tokens.length && typeof url.tokens[0] === "string") {
    schemeMatch = url.tokens[0].match(/^([a-zA-Z0-9+-.]*):\/\/*/);
  }
  if (schemeMatch) {
    const [schemeAndSlashes, scheme] = schemeMatch;
    u.scheme = new Word(scheme.toLowerCase());
    url = url.slice(schemeAndSlashes.length);
  } else {
    // curl defaults to https://
    // we don't because most libraries won't downgrade to http
    // if you ask for https, unlike curl.
    // TODO: handle file:// scheme
    u.scheme = config["proto-default"] ?? new Word("http");
  }
  if (!eq(u.scheme, "http") && !eq(u.scheme, "https")) {
    warnf(global_, ["bad-scheme", `Protocol "${u.scheme}" not supported`]);
  }

  // https://github.com/curl/curl/blob/curl-7_85_0/lib/urlapi.c#L992
  const hostMatch = url.indexOfFirstChar("/?#");
  if (hostMatch !== -1) {
    u.host = url.slice(0, hostMatch);
    // TODO: u.path might end up empty if indexOfFirstChar found ?#
    u.path = url.slice(hostMatch); // keep leading '/' in .path
    // https://github.com/curl/curl/blob/curl-7_85_0/lib/urlapi.c#L1024
    const fragmentIndex = u.path.indexOf("#");
    const queryIndex = u.path.indexOf("?");
    if (fragmentIndex !== -1) {
      u.fragment = u.path.slice(fragmentIndex);
      if (queryIndex !== -1 && queryIndex < fragmentIndex) {
        u.query = u.path.slice(queryIndex, fragmentIndex);
        u.path = u.path.slice(0, queryIndex);
      } else {
        u.path = u.path.slice(0, fragmentIndex);
      }
    } else if (queryIndex !== -1) {
      u.query = u.path.slice(queryIndex);
      u.path = u.path.slice(0, queryIndex);
    }
  } else {
    u.host = url;
  }

  // parse username:password@hostname
  // https://github.com/curl/curl/blob/curl-7_85_0/lib/urlapi.c#L1083
  // https://github.com/curl/curl/blob/curl-7_85_0/lib/urlapi.c#L460
  // https://github.com/curl/curl/blob/curl-7_85_0/lib/url.c#L2827
  const authMatch = u.host.indexOf("@");
  if (authMatch !== -1) {
    const auth = u.host.slice(0, authMatch);
    u.host = u.host.slice(authMatch + 1); // throw away '@'
    if (!config["disallow-username-in-url"]) {
      u.auth = auth;
      if (auth.includes(":")) {
        [u.user, u.password] = auth.split(":", 2);
      } else {
        u.user = auth;
        u.password = new Word(); // if there's no ':', curl will append it
      }
    } else {
      // Curl will exit if this is the case, but we just remove it from the URL
      warnf(global_, [
        "login-denied",
        `Found auth in URL but --disallow-username-in-url was passed: ${auth.toString()}`,
      ]);
    }
  }

  // TODO: need to extract port first
  // hostname_check()
  // https://github.com/curl/curl/blob/curl-7_86_0/lib/urlapi.c#L572
  // if (!u.host) {
  //   warnf(global_, [
  //     "no-host",
  //     "Found empty host in URL: " + JSON.stringify(url),
  //   ]);
  // } else if (u.host.startsWith("[")) {
  //   if (!u.host.endsWith("]")) {
  //     warnf(global_, [
  //       "bad-host",
  //       "Found invalid IPv6 address in URL: " + JSON.stringify(url),
  //     ]);
  //   } else {
  //     const firstWeirdCharacter = u.host.match(/[^0123456789abcdefABCDEF:.]/);
  //     // %zone_id
  //     if (firstWeirdCharacter && firstWeirdCharacter[0] !== "%") {
  //       warnf(global_, [
  //         "bad-host",
  //         "Found invalid IPv6 address in URL: " + JSON.stringify(url),
  //       ]);
  //     }
  //   }
  // } else {
  //   const firstInvalidCharacter = u.host.match(
  //     /[\r\n\t/:#?!@{}[\]\\$'"^`*<>=;,]/
  //   );
  //   if (firstInvalidCharacter) {
  //     warnf(global_, [
  //       "bad-host",
  //       "Found invalid character " +
  //         JSON.stringify(firstInvalidCharacter[0]) +
  //         " in URL: " +
  //         JSON.stringify(url),
  //     ]);
  //   }
  // }

  return u;
}
