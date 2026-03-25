import { Word, eq, mergeWords, joinWords } from "./shell/Word.js";

import { CCError, has, isInt } from "./utils.js";
import { warnf, warnIfPartsIgnored } from "./Warnings.js";
import type { Warnings, Support } from "./Warnings.js";
import type {
  GlobalConfig,
  OperationConfig,
  SrcDataParam,
} from "./curl/opts.js";

import { Headers, parseCookies, parseCookiesStrict } from "./Headers.js";
import type { Cookies } from "./Headers.js";

import { pickAuth, type AuthType } from "./curl/auth.js";
export { AuthType } from "./curl/auth.js";

import { parseurl, type Curl_URL } from "./curl/url.js";

import { parseQueryString, percentEncodePlus } from "./Query.js";
import type { QueryList, QueryDict } from "./Query.js";

import { parseForm } from "./curl/form.js";
import type { FormParam } from "./curl/form.js";

export type FileParamType = "data" | "binary" | "urlencode" | "json";
export type DataType = FileParamType | "raw";

export type FileDataParam = {
  filetype: FileParamType;
  // The left side of "=" for --data-urlencode, can't be empty string
  name?: Word;
  filename: Word;
};
// "raw"-type SrcDataParams, and `FileParamType`s that read from stdin
// when we have its contents (because it comes from a pipe) are converted
// to plain strings
export type DataParam = Word | FileDataParam;

// struct getout
// https://github.com/curl/curl/blob/curl-7_86_0/src/tool_sdecls.h#L96
export interface RequestUrl {
  // What it looked like in the input, used for error messages
  originalUrl: Word;

  url: Word;
  // the query string can contain instructions to
  // read the query string from a file, for example with
  // --url-query @filename
  // In that case we put "@filename" in the query string and "filename" here and
  // warn the user that they'll need to modify the code to read that file.
  queryReadsFile?: string;

  urlObj: Curl_URL;

  // If the ?query can't be losslessly parsed, then
  // .urlWithoutQueryList === .url
  // .queryList           === undefined
  urlWithoutQueryList: Word;
  queryList?: QueryList;
  // When all (if any) repeated keys in queryList happen one after the other
  // ?a=1&a=1&b=2 (okay)
  // ?a=1&b=2&a=1 (doesn't work, queryList is defined but queryDict isn't)
  queryDict?: QueryDict;

  urlWithoutQueryArray: Word;
  urlWithOriginalQuery: Word;
  // This includes the query in the URL and the query that comes from `--get --data` or `--url-query`
  queryArray?: DataParam[];
  // This is only the query in the URL
  urlQueryArray?: DataParam[];

  uploadFile?: Word;
  output?: Word;

  method: Word;
  auth?: [Word, Word];
  // TODO: should authType be per-url as well?
  // authType?: string;
}

export type ProxyType =
  | "http1"
  | "http2"
  | "socks4"
  | "socks4a"
  | "socks5"
  | "socks5-hostname";

export interface Request {
  // Will have at least one element (otherwise an error is raised)
  urls: RequestUrl[];
  globoff?: boolean;
  disallowUsernameInUrl?: boolean;
  pathAsIs?: boolean;

  // Just the part that comes from `--get --data` or `--url-query` (not the query in the URL)
  // unless there's only one URL, then it will include both.
  queryArray?: DataParam[];

  authType: AuthType;
  proxyAuthType: AuthType;
  awsSigV4?: Word;
  oauth2Bearer?: Word;
  delegation?: Word;
  krb?: Word;
  saslAuthzid?: Word;
  saslIr?: boolean;
  serviceName?: Word;

  // A null header means the command explicitly disabled sending this header
  headers: Headers;
  proxyHeaders: Headers;
  refererAuto?: boolean;

  // .cookies is a parsed version of the Cookie header, if it can be parsed.
  // Generators that use .cookies need to delete the header from .headers (usually).
  cookies?: Cookies;
  cookieFiles?: Word[];
  cookieJar?: Word;
  junkSessionCookies?: boolean;

  compressed?: boolean;
  transferEncoding?: boolean;

  include?: boolean;

  multipartUploads?: FormParam[];
  // When multipartUploads comes from parsing a string in --data
  // this can be set to true to say that sending the original data
  // as a string would be more correct.
  multipartUploadsDoesntRoundtrip?: boolean;
  formEscape?: boolean;

  dataArray?: DataParam[];
  data?: Word;
  dataReadsFile?: string;
  isDataBinary?: boolean;
  isDataRaw?: boolean;

  ipv4?: boolean;
  ipv6?: boolean;

  proto?: Word;
  protoRedir?: Word;
  protoDefault?: Word;

  tcpFastopen?: boolean;

  localPort?: [Word, Word | null];

  ignoreContentLength?: boolean;

  interface?: Word;

  ciphers?: Word;
  curves?: Word;
  insecure?: boolean;
  certStatus?: boolean;
  cert?: [Word, Word | null];
  certType?: Word;
  key?: Word;
  keyType?: Word;
  pass?: Word;
  cacert?: Word;
  caNative?: boolean;
  sslAllowBeast?: boolean;
  capath?: Word;
  crlfile?: Word;
  pinnedpubkey?: Word;
  randomFile?: Word;
  egdFile?: Word;
  hsts?: Word[]; // a filename
  alpn?: boolean;

  tlsVersion?: "1" | "1.0" | "1.1" | "1.2" | "1.3";
  tlsMax?: Word;
  tls13Ciphers?: Word;
  tlsauthtype?: Word;
  tlspassword?: Word;
  tlsuser?: Word;
  sslAutoClientCert?: boolean;
  sslNoRevoke?: boolean;
  sslReqd?: boolean;
  sslRevokeBestEffort?: boolean;
  ssl?: boolean;
  sslv2?: boolean;
  sslv3?: boolean;

  dohUrl?: Word;
  dohInsecure?: boolean;
  dohCertStatus?: boolean;

  proxy?: Word;
  proxyType?: ProxyType;
  proxyAuth?: Word;
  proxytunnel?: boolean;
  noproxy?: Word; // a list of hosts or "*"
  preproxy?: Word;
  proxyAnyauth?: boolean;
  proxyBasic?: boolean;
  proxyCaNative?: boolean;
  proxyCacert?: Word; // <file>
  proxyCapath?: Word; // <dir>
  proxyCertType?: Word; // <type>
  proxyCert?: Word; // <cert[:passwd]>
  proxyCiphers?: Word; // <list>
  proxyCrlfile?: Word; // <file>
  proxyDigest?: boolean;
  proxyHttp2?: boolean;
  proxyInsecure?: boolean;
  proxyKeyType?: Word; // <type>
  proxyKey?: Word; // <key>
  proxyNegotiate?: boolean;
  proxyNtlm?: boolean;
  proxyPass?: Word; // <phrase>
  proxyPinnedpubkey?: Word; // <hashes>
  proxyServiceName?: Word; // <name>
  proxySslAllowBeast?: boolean;
  proxySslAutoClientCert?: boolean;
  proxyTls13Ciphers?: Word; // <ciphersuite list>
  proxyTlsauthtype?: Word; // <type>
  proxyTlspassword?: Word; // <string>
  proxyTlsuser?: Word; // <name>
  proxyTlsv1?: boolean;
  proxyUser?: Word; // <user:password>
  proxy1?: boolean; // <host[:port]>

  socks4?: Word;
  socks4a?: Word;
  socks5?: Word;
  socks5Basic?: boolean;
  socks5GssapiNec?: boolean;
  socks5GssapiService?: Word;
  socks5Gssapi?: boolean;
  socks5Hostname?: Word;

  haproxyClientIp?: Word;
  haproxyProtocol?: boolean;

  timeout?: Word; // a decimal, seconds
  connectTimeout?: Word; // a decimal, seconds
  expect100Timeout?: Word; // a decimal, seconds
  happyEyeballsTimeoutMs?: Word; // an integer, milliseconds
  speedLimit?: Word; // an integer
  speedTime?: Word; // an integer
  limitRate?: Word; // an integer with an optional unit
  maxFilesize?: Word; // an intger with an optional unit

  continueAt?: Word; // an integer or "-"

  crlf?: boolean;
  useAscii?: boolean;

  remoteTime?: boolean;

  clobber?: boolean;

  ftpSkipPasvIp?: boolean;

  fail?: boolean;
  retry?: Word; // an integer, how many times to retry
  retryMaxTime?: Word; // an integer, seconds

  keepAlive?: boolean;
  keepAliveTime?: Word; // an integer, seconds

  altSvc?: Word;

  followRedirects?: boolean;
  followRedirectsTrusted?: boolean;
  maxRedirects?: Word; // an integer
  post301?: boolean;
  post302?: boolean;
  post303?: boolean;

  httpVersion?: "1.0" | "1.1" | "2" | "2-prior-knowledge" | "3" | "3-only";
  http0_9?: boolean;
  http2?: boolean;
  http3?: boolean;

  stdin?: Word;
  stdinFile?: Word;

  resolve?: Word[]; // a list of host:port:address
  connectTo?: Word[]; // a list of host:port:connect-to-host:connect-to-port

  unixSocket?: Word;
  abstractUnixSocket?: Word;
  netrc?: "optional" | "required" | "ignored"; // undefined means implicitly "ignored"
  netrcFile?: Word; // if undefined defaults to ~/.netrc

  // Global options
  verbose?: boolean;
  silent?: boolean;
}

function buildURL(
  global_: GlobalConfig,
  config: OperationConfig,
  url: Word,
  uploadFile?: Word,
  outputFile?: Word,
  stdin?: Word,
  stdinFile?: Word,
): RequestUrl {
  const originalUrl = url;
  const u = parseurl(global_, config, url);

  // https://github.com/curl/curl/blob/curl-7_85_0/src/tool_operate.c#L1124
  // https://github.com/curl/curl/blob/curl-7_85_0/src/tool_operhlp.c#L76
  if (uploadFile) {
    // TODO: it's more complicated
    if (u.path.isEmpty()) {
      u.path = uploadFile.prepend("/");
    } else if (u.path.endsWith("/")) {
      u.path = u.path.add(uploadFile);
    }

    if (config.get) {
      warnf(global_, [
        "data-ignored",
        "curl doesn't let you pass --get and --upload-file together",
      ]);
    }
  }

  const urlWithOriginalQuery = mergeWords(
    u.scheme,
    "://",
    u.host,
    u.path,
    u.query,
    u.fragment,
  );

  // curl example.com example.com?foo=bar --url-query isshared=t
  // will make requests for
  // example.com/?isshared=t
  // example.com/?foo=bar&isshared=t
  //
  // so the query could come from
  //   1. `--url` (i.e. the requested URL)
  //   2. `--url-query` or `--get --data` (the latter takes precedence)
  //
  // If it comes from the latter, we might need to generate code to read
  // from one or more files.
  // When there's multiple urls, the latter applies to all of them
  // but the query from --url only applies to that URL.
  //
  // There's 3 cases for the query:
  // 1. it's well-formed and can be expressed as a list of tuples (or a dict)
  //   `?one=1&one=1&two=2`
  // 2. it can't, for example because one of the pieces doesn't have a '='
  //   `?one`
  // 3. we need to generate code that reads from a file
  //
  // If there's only one URL we merge the query from the URL with the shared part.
  //
  // If there's multiple URLs and a shared part that reads from a file (case 3),
  // we only write the file reading code once, pass it as the params= argument
  // and the part from the URL has to be passed as a string in the URL
  // and requests will combine the query in the URL with the query in params=.
  //
  // Otherwise, we print each query for each URL individually, either as a
  // list of tuples if we can or in the URL if we can't.
  //
  // When files are passed in through --data-urlencode or --url-query
  // we can usually treat them as case 1 as well (in Python), but that would
  // generate code slightly different from curl because curl reads the file once
  // upfront, whereas we would read the file multiple times and it might contain
  // different data each time (for example if it's /dev/urandom).
  let urlQueryArray: DataParam[] | null = null;
  let queryArray: DataParam[] | null = null;
  let queryStrReadsFile: string | null = null;
  if (u.query.toBool() || (config["url-query"] && config["url-query"].length)) {
    let queryStr: Word | null = null;

    let queryParts: SrcDataParam[] = [];
    if (u.query.toBool()) {
      // remove the leading '?'
      queryParts.push(["raw", u.query.slice(1)]);
      [queryArray, queryStr, queryStrReadsFile] = buildData(
        queryParts,
        stdin,
        stdinFile,
      );
      urlQueryArray = queryArray;
    }
    if (config["url-query"]) {
      queryParts = queryParts.concat(config["url-query"]);
      [queryArray, queryStr, queryStrReadsFile] = buildData(
        queryParts,
        stdin,
        stdinFile,
      );
    }

    // TODO: check the curl source code
    // TODO: curl localhost:8888/?
    // will request /?
    // but
    // curl localhost:8888/? --url-query ''
    // (or --get --data '') will request /
    u.query = new Word();
    if (queryStr && queryStr.toBool()) {
      u.query = queryStr.prepend("?");
    }
  }
  const urlWithoutQueryArray = mergeWords(
    u.scheme,
    "://",
    u.host,
    u.path,
    u.fragment,
  );
  url = mergeWords(u.scheme, "://", u.host, u.path, u.query, u.fragment);
  let urlWithoutQueryList = url;
  // TODO: parseQueryString() doesn't accept leading '?'
  let [queryList, queryDict] = parseQueryString(
    u.query.toBool() ? u.query.slice(1) : new Word(),
  );
  if (queryList && queryList.length) {
    // TODO: remove the fragment too?
    urlWithoutQueryList = mergeWords(
      u.scheme,
      "://",
      u.host,
      u.path,
      u.fragment,
    );
  } else {
    queryList = null;
    queryDict = null;
  }

  // TODO: --path-as-is
  // TODO: --request-target

  // curl expects you to uppercase methods always. If you do -X PoSt, that's what it
  // will send, but most APIs will helpfully uppercase what you pass in as the method.
  //
  // There are many places where curl determines the method, this is the last one:
  // https://github.com/curl/curl/blob/curl-7_85_0/lib/http.c#L2032
  let method = new Word("GET");
  if (
    config.request &&
    // Safari adds `-X null` if it can't determine the request type
    // https://github.com/WebKit/WebKit/blob/f58ef38d48f42f5d7723691cb090823908ff5f9f/Source/WebInspectorUI/UserInterface/Models/Resource.js#L1250
    !eq(config.request, "null")
  ) {
    method = config.request;
  } else if (config.head) {
    method = new Word("HEAD");
  } else if (uploadFile && uploadFile.toBool()) {
    // --upload-file '' doesn't do anything.
    method = new Word("PUT");
  } else if (!config.get && (has(config, "data") || has(config, "form"))) {
    method = new Word("POST");
  }

  const requestUrl: RequestUrl = {
    originalUrl,
    urlWithoutQueryList,
    url,
    urlObj: u,
    urlWithOriginalQuery,
    urlWithoutQueryArray,
    method,
  };
  if (queryStrReadsFile) {
    requestUrl.queryReadsFile = queryStrReadsFile;
  }
  if (queryList) {
    requestUrl.queryList = queryList;
    if (queryDict) {
      requestUrl.queryDict = queryDict;
    }
  }
  if (queryArray) {
    requestUrl.queryArray = queryArray;
  }
  if (urlQueryArray) {
    requestUrl.urlQueryArray = urlQueryArray;
  }
  if (uploadFile) {
    if (eq(uploadFile, "-") || eq(uploadFile, ".")) {
      if (stdinFile) {
        requestUrl.uploadFile = stdinFile;
      } else if (stdin) {
        warnf(global_, [
          "upload-file-with-stdin-content",
          "--upload-file with stdin content is not supported",
        ]);
        requestUrl.uploadFile = uploadFile;

        // TODO: this is complicated,
        // --upload-file only applies per-URL so .data needs to become per-URL...
        // if you pass --data and --upload-file or --get and --upload-file, curl will error
        // if (config.url && config.url.length === 1) {
        //   config.data = [["raw", stdin]];
        // } else {
        //   warnf(global_, [
        //     "upload-file-with-stdin-content-and-multiple-urls",
        //     "--upload-file with stdin content and multiple URLs is not supported",
        //   ]);
        // }
      } else {
        requestUrl.uploadFile = uploadFile;
      }
    } else {
      requestUrl.uploadFile = uploadFile;
    }
  }
  if (outputFile) {
    // TODO: get stdout redirects of command
    requestUrl.output = outputFile;
  }

  // --user takes precedence over the URL
  const auth = config.user || u.auth;
  if (auth) {
    const [user, pass] = auth.split(":", 2);
    requestUrl.auth = [user, pass || new Word()];
  }

  return requestUrl;
}

function buildData(
  configData: SrcDataParam[],
  stdin?: Word,
  stdinFile?: Word,
): [DataParam[], Word, string | null] {
  const data: DataParam[] = [];
  let dataStrState = new Word();
  for (const [i, x] of configData.entries()) {
    const type = x[0];
    let value = x[1];
    let name: Word | null = null;

    if (i > 0 && type !== "json") {
      dataStrState = dataStrState.append("&");
    }

    if (type === "urlencode") {
      // curl checks for = before @
      const splitOn = value.includes("=") || !value.includes("@") ? "=" : "@";
      // If there's no = or @ then the entire content is treated as a value and encoded
      if (value.includes("@") || value.includes("=")) {
        [name, value] = value.split(splitOn, 2);
      }

      if (splitOn === "=") {
        if (name && name.toBool()) {
          dataStrState = dataStrState.add(name).append("=");
        }
        // curl's --data-urlencode percent-encodes spaces as "+"
        // https://github.com/curl/curl/blob/curl-7_86_0/src/tool_getparam.c#L630
        dataStrState = dataStrState.add(percentEncodePlus(value));
        continue;
      }

      name = name && name.toBool() ? name : null;
      value = value.prepend("@");
    }

    let filename: Word | null = null;

    if (type !== "raw" && value.startsWith("@")) {
      filename = value.slice(1);
      if (eq(filename, "-")) {
        if (stdin !== undefined) {
          switch (type) {
            case "binary":
            case "json":
              value = stdin;
              break;
            case "urlencode":
              value = mergeWords(
                name && name.length ? name.append("=") : new Word(),
                percentEncodePlus(stdin),
              );
              break;
            default:
              value = stdin.replace(/[\n\r]/g, "");
          }
          filename = null;
        } else if (stdinFile !== undefined) {
          filename = stdinFile;
        } else {
          // TODO: if stdin is read twice, it will be empty the second time
          // TODO: `STDIN_SENTINEL` so that we can tell the difference between
          // a stdinFile called "-" and stdin for the error message
        }
      }
    }

    if (filename !== null) {
      if (dataStrState.toBool()) {
        data.push(dataStrState);
        dataStrState = new Word();
      }
      const dataParam: DataParam = {
        // If `filename` isn't null, then `type` can't be "raw"
        filetype: type as FileParamType,
        filename,
      };
      if (name) {
        dataParam.name = name;
      }
      data.push(dataParam);
    } else {
      dataStrState = dataStrState.add(value);
    }
  }
  if (dataStrState.toBool()) {
    data.push(dataStrState);
  }

  let dataStrReadsFile: string | null = null;
  const dataStr = mergeWords(
    ...data.map((d) => {
      if (!(d instanceof Word)) {
        dataStrReadsFile ||= d.filename.toString(); // report first file
        if (d.name) {
          return mergeWords(d.name, "=@", d.filename);
        }
        return d.filename.prepend("@");
      }
      return d;
    }),
  );

  return [data, dataStr, dataStrReadsFile];
}

// Parses a Content-Type header into a type and a list of parameters
function parseContentType(
  string: string,
): [string, Array<[string, string]>] | null {
  if (!string.includes(";")) {
    return [string, []];
  }
  const semi = string.indexOf(";");
  const type = string.slice(0, semi);
  const rest = string.slice(semi);

  // See https://www.w3.org/Protocols/rfc1341/4_Content-Type.html
  // TODO: could be better, like reading to the next semicolon
  const params = rest.match(
    /;\s*([^;=]+)=(?:("[^"]*")|([^()<>@,;:\\"/[\]?.=]*))/g,
  );
  if (rest.trim() && !params) {
    return null;
  }
  const parsedParams: Array<[string, string]> = [];
  for (const param of params || []) {
    const parsedParam = param.match(
      /;\s*([^;=]+)=(?:("[^"]*")|([^()<>@,;:\\"/[\]?.=]*))/,
    );
    if (!parsedParam) {
      return null;
    }
    const name = parsedParam[1];
    const value = parsedParam[3] || parsedParam[2].slice(1, -1);
    parsedParams.push([name, value]);
  }
  return [type, parsedParams];
}

// Parses out the boundary= value from a Content-Type header
function parseBoundary(string: string): string | null {
  const header = parseContentType(string);
  if (!header) {
    return null;
  }
  for (const [name, value] of header[1]) {
    if (name === "boundary") {
      return value;
    }
  }
  return null;
}

function parseRawForm(
  data: string,
  boundary: string,
): [FormParam[], boolean] | null {
  const endBoundary = "\r\n--" + boundary + "--\r\n";
  if (!data.endsWith(endBoundary)) {
    return null;
  }
  data = data.slice(0, -endBoundary.length);

  // TODO: if empty form should it be completely empty?
  boundary = "--" + boundary + "\r\n";
  if (data && !data.startsWith(boundary)) {
    return null;
  }
  data = data.slice(boundary.length);
  const parts = data.split("\r\n" + boundary);
  const form: FormParam[] = [];
  let roundtrips = true;
  for (const part of parts) {
    const lines = part.split("\r\n");
    if (lines.length < 2) {
      return null;
    }

    const formParam: FormParam = {
      name: new Word(),
      content: new Word(),
    };
    let seenContentDisposition = false;
    const headers: Word[] = [];
    let i = 0;
    for (; i < lines.length; i++) {
      if (lines[i].length === 0) {
        break;
      }
      const [name, value] = lines[i].split(": ", 2);
      if (name === undefined || value === undefined) {
        return null;
      }
      if (name.toLowerCase() === "content-disposition") {
        if (seenContentDisposition) {
          // should only have one
          return null;
        }

        const contentDisposition = parseContentType(value);
        if (!contentDisposition) {
          return null;
        }
        const [type, params] = contentDisposition;
        if (type !== "form-data") {
          return null;
        }
        let extra = 0;
        for (const [paramName, paramValue] of params) {
          switch (paramName) {
            case "name":
              formParam.name = new Word(paramValue);
              break;
            case "filename":
              formParam.filename = new Word(paramValue);
              break;
            default:
              extra++;
              break;
          }
        }
        if (extra) {
          roundtrips = false;
          // TODO: warn?
        }
        seenContentDisposition = true;
      } else if (name.toLowerCase() === "content-type") {
        formParam.contentType = new Word(value);
      } else {
        headers.push(new Word(lines[i]));
      }
    }
    if (headers.length) {
      formParam.headers = headers;
    }

    if (!seenContentDisposition) {
      return null;
    }
    if (i === lines.length) {
      return null;
    }
    if (formParam.name.isEmpty()) {
      return null;
    }
    formParam.content = new Word(lines.slice(i + 1).join("\n"));
    form.push(formParam);
  }
  return [form, roundtrips];
}

function buildRequest(
  global_: GlobalConfig,
  config: OperationConfig,
  stdin?: Word,
  stdinFile?: Word,
): Request {
  if (!config.url || !config.url.length) {
    // TODO: better error message (could be parsing fail)
    throw new CCError("no URL specified!");
  }

  const headers = new Headers(config.header, global_.warnings);
  const proxyHeaders = new Headers(
    config["proxy-header"],
    global_.warnings,
    "--proxy-header",
  );

  let cookies;
  const cookieFiles: Word[] = [];
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    const parsedCookies = parseCookiesStrict(cookieHeader);
    if (parsedCookies) {
      cookies = parsedCookies;
    }
  } else if (cookieHeader === undefined && config.cookie) {
    // If there is a Cookie header, --cookies is ignored
    const cookieStrings: Word[] = [];
    for (const c of config.cookie) {
      // a --cookie without a = character reads from it as a filename
      if (c.includes("=")) {
        cookieStrings.push(c);
      } else {
        cookieFiles.push(c);
      }
    }
    if (cookieStrings.length) {
      const cookieString = joinWords(config.cookie, "; ");
      headers.setIfMissing("Cookie", cookieString);
      const parsedCookies = parseCookies(cookieString);
      if (parsedCookies) {
        cookies = parsedCookies;
      }
    }
  }

  let refererAuto = false;
  if (config["user-agent"]) {
    headers.setIfMissing("User-Agent", config["user-agent"]);
  }
  if (config.referer) {
    if (config.referer.includes(";auto")) {
      refererAuto = true;
    }
    // referer can be ";auto" or followed by ";auto", we ignore that.
    const referer = config.referer.replace(/;auto$/, "");
    if (referer.length) {
      headers.setIfMissing("Referer", referer);
    }
  }
  if (config.range) {
    let range = config.range.prepend("bytes=");
    if (!range.includes("-")) {
      range = range.append("-");
    }
    headers.setIfMissing("Range", range);
  }
  if (config["time-cond"]) {
    let timecond = config["time-cond"];
    let header = "If-Modified-Since";
    switch (timecond.charAt(0)) {
      case "+":
        timecond = timecond.slice(1);
        break;
      case "-":
        timecond = timecond.slice(1);
        header = "If-Unmodified-Since";
        break;
      case "=":
        timecond = timecond.slice(1);
        header = "Last-Modified";
        break;
    }
    // TODO: parse date
    headers.setIfMissing(header, timecond);
  }

  let data;
  let dataStr;
  let dataStrReadsFile;
  let queryArray;
  if (config.data && config.data.length) {
    if (config.get) {
      // https://github.com/curl/curl/blob/curl-7_85_0/src/tool_operate.c#L721
      // --get --data will overwrite --url-query, but if there's no --data, for example,
      // curl --url-query bar --get example.com
      // it won't
      // https://daniel.haxx.se/blog/2022/11/10/append-data-to-the-url-query/
      config["url-query"] = config.data;
      delete config.data;
    } else {
      [data, dataStr, dataStrReadsFile] = buildData(
        config.data,
        stdin,
        stdinFile,
      );
    }
  }
  if (config["url-query"]) {
    [queryArray] = buildData(config["url-query"], stdin, stdinFile);
  }

  const urls: RequestUrl[] = [];
  const uploadFiles = config["upload-file"] || [];
  const outputFiles = config.output || [];
  for (const [i, url] of config.url.entries()) {
    urls.push(
      buildURL(
        global_,
        config,
        url,
        uploadFiles[i],
        outputFiles[i],
        stdin,
        stdinFile,
      ),
    );
  }
  // --get moves --data into the URL's query string
  if (config.get && config.data) {
    delete config.data;
  }

  if ((config["upload-file"] || []).length > config.url.length) {
    warnf(global_, [
      "too-many-upload-files",
      "Got more --upload-file/-T options than URLs: " +
        config["upload-file"]
          ?.map((f) => JSON.stringify(f.toString()))
          .join(", "),
    ]);
  }
  if ((config.output || []).length > config.url.length) {
    warnf(global_, [
      "too-many-output-files",
      "Got more --output/-o options than URLs: " +
        config.output?.map((f) => JSON.stringify(f.toString())).join(", "),
    ]);
  }

  const request: Request = {
    urls,
    authType: pickAuth(config.authtype),
    proxyAuthType: pickAuth(config.proxyauthtype),
    headers,
    proxyHeaders,
  };
  // TODO: warn about unused stdin?
  if (stdin) {
    request.stdin = stdin;
  }
  if (stdinFile) {
    request.stdinFile = stdinFile;
  }

  if (Object.prototype.hasOwnProperty.call(config, "globoff")) {
    request.globoff = config.globoff;
  }
  if (
    Object.prototype.hasOwnProperty.call(config, "disallow-username-in-url")
  ) {
    request.disallowUsernameInUrl = config["disallow-username-in-url"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "path-as-is")) {
    request.pathAsIs = config["path-as-is"];
  }

  if (refererAuto) {
    request.refererAuto = true;
  }

  if (cookies) {
    // generators that use .cookies need to do
    // deleteHeader(request, 'cookie')
    request.cookies = cookies;
  }
  if (cookieFiles.length) {
    request.cookieFiles = cookieFiles;
  }
  if (config["cookie-jar"]) {
    request.cookieJar = config["cookie-jar"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "junk-session-cookies")) {
    request.junkSessionCookies = config["junk-session-cookies"];
  }

  if (Object.prototype.hasOwnProperty.call(config, "compressed")) {
    request.compressed = config.compressed;
  }
  if (Object.prototype.hasOwnProperty.call(config, "tr-encoding")) {
    request.transferEncoding = config["tr-encoding"];
  }

  if (config.include) {
    request.include = true;
  }

  if (config.json) {
    headers.setIfMissing("Content-Type", "application/json");
    headers.setIfMissing("Accept", "application/json");
  } else if (config.data) {
    headers.setIfMissing("Content-Type", "application/x-www-form-urlencoded");
  } else if (config.form) {
    // TODO: warn when details (;filename=, etc.) are not supported
    // by each converter.
    request.multipartUploads = parseForm(config.form, global_.warnings);
    //headers.setIfMissing("Content-Type", "multipart/form-data");
  }
  const contentType = headers.getContentType();
  const exactContentType = headers.get("Content-Type");
  if (
    config.data &&
    !dataStrReadsFile &&
    dataStr &&
    dataStr.isString() &&
    !config.form &&
    !request.multipartUploads &&
    contentType === "multipart/form-data" &&
    exactContentType &&
    exactContentType.isString()
  ) {
    const boundary = parseBoundary(exactContentType.toString());
    if (boundary) {
      const form = parseRawForm(dataStr.toString(), boundary);
      if (form) {
        const [parsedForm, roundtrip] = form;
        request.multipartUploads = parsedForm;
        if (!roundtrip) {
          request.multipartUploadsDoesntRoundtrip = true;
        }
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(config, "form-escape")) {
    request.formEscape = config["form-escape"];
  }

  if (config["aws-sigv4"]) {
    // https://github.com/curl/curl/blob/curl-7_86_0/lib/setopt.c#L678-L679
    request.authType = "aws-sigv4";
    request.awsSigV4 = config["aws-sigv4"];
  }
  if (request.authType === "bearer" && config["oauth2-bearer"]) {
    const bearer = config["oauth2-bearer"].prepend("Bearer ");
    headers.setIfMissing("Authorization", bearer);
    request.oauth2Bearer = config["oauth2-bearer"];
  }
  if (config.delegation) {
    request.delegation = config.delegation;
  }
  if (config.krb) {
    request.krb = config.krb;
  }
  if (config["sasl-authzid"]) {
    request.saslAuthzid = config["sasl-authzid"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "sasl-ir")) {
    request.saslIr = config["sasl-ir"];
  }
  if (config.negotiate) {
    request.authType = "negotiate";
  }
  if (config["service-name"]) {
    request.serviceName = config["service-name"];
  }

  // TODO: ideally we should generate code that explicitly unsets the header too
  // no HTTP libraries allow that.
  headers.clearNulls();

  if (config.data && config.data.length) {
    request.data = dataStr;
    if (dataStrReadsFile) {
      request.dataReadsFile = dataStrReadsFile;
    }
    request.dataArray = data;
    // TODO: remove these
    request.isDataRaw = false;
    request.isDataBinary = (data || []).some(
      (d) => !(d instanceof Word) && d.filetype === "binary",
    );
  }
  if (queryArray) {
    // If we have to generate code that reads from a file, we
    // need to do it once for all URLs.
    request.queryArray = queryArray;
  }

  if (Object.prototype.hasOwnProperty.call(config, "ipv4")) {
    request["ipv4"] = config["ipv4"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ipv6")) {
    request["ipv6"] = config["ipv6"];
  }

  if (config.proto) {
    // TODO: parse
    request.proto = config.proto;
  }
  if (config["proto-redir"]) {
    // TODO: parse
    request.protoRedir = config["proto-redir"];
  }
  if (config["proto-default"]) {
    request.protoDefault = config["proto-default"];
  }

  if (config["tcp-fastopen"]) {
    request.tcpFastopen = config["tcp-fastopen"];
  }

  if (config["local-port"]) {
    // TODO: check the range
    const [start, end] = config["local-port"].split("-", 1);
    if (end && end.toBool()) {
      request.localPort = [start, end];
    } else {
      request.localPort = [config["local-port"], null];
    }
  }

  if (Object.prototype.hasOwnProperty.call(config, "ignore-content-length")) {
    request.ignoreContentLength = config["ignore-content-length"];
  }

  if (config.interface) {
    request.interface = config.interface;
  }

  if (config.ciphers) {
    request.ciphers = config.ciphers;
  }
  if (config.curves) {
    request.curves = config.curves;
  }
  if (config.insecure) {
    request.insecure = true;
  }
  if (Object.prototype.hasOwnProperty.call(config, "cert-status")) {
    request.certStatus = config["cert-status"];
  }
  // TODO: if the URL doesn't start with https://, curl doesn't verify
  // certificates, etc.
  if (config.cert) {
    if (config.cert.startsWith("pkcs11:") || !config.cert.match(/[:\\]/)) {
      request.cert = [config.cert, null];
    } else {
      // TODO: curl does more complex processing
      // find un-backslash-escaped colon, backslash might also be escaped with a backslash
      let colon = -1;

      try {
        // Safari versions older than 16.4 don't support negative lookbehind
        colon = config.cert.search(/(?<!\\)(?:\\\\)*:/);
      } catch {
        colon = config.cert.search(/:/);
      }

      if (colon === -1) {
        request.cert = [config.cert, null];
      } else {
        const cert = config.cert.slice(0, colon);
        const password = config.cert.slice(colon + 1);
        if (password.toBool()) {
          request.cert = [cert, password];
        } else {
          request.cert = [cert, null];
        }
      }
    }
  }
  if (config["cert-type"]) {
    const certType = config["cert-type"];
    request.certType = certType;

    if (
      certType.isString() &&
      !["PEM", "DER", "ENG", "P12"].includes(certType.toString().toUpperCase())
    ) {
      warnf(global_, [
        "cert-type-unknown",
        "not supported file type " +
          JSON.stringify(certType.toString()) +
          " for certificate",
      ]);
    }
  }
  if (config.key) {
    request.key = config.key;
  }
  if (config["key-type"]) {
    request.keyType = config["key-type"];
  }
  if (config.pass) {
    request.pass = config.pass;
  }
  if (config.cacert) {
    request.cacert = config.cacert;
  }
  if (Object.prototype.hasOwnProperty.call(config, "ca-native")) {
    request.caNative = config["ca-native"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl-allow-beast")) {
    request.sslAllowBeast = config["ssl-allow-beast"];
  }
  if (config.capath) {
    request.capath = config.capath;
  }
  if (config.crlfile) {
    request.crlfile = config.crlfile;
  }
  if (config.pinnedpubkey) {
    request.pinnedpubkey = config.pinnedpubkey;
  }
  if (config["random-file"]) {
    request.randomFile = config["random-file"];
  }
  if (config["egd-file"]) {
    request.egdFile = config["egd-file"];
  }
  if (config.hsts) {
    request.hsts = config.hsts;
  }
  if (Object.prototype.hasOwnProperty.call(config, "alpn")) {
    request.alpn = config.alpn;
  }

  if (config.tlsVersion) {
    request.tlsVersion = config.tlsVersion;
  }
  if (config["tls-max"]) {
    request.tlsMax = config["tls-max"];
  }
  if (config["tls13-ciphers"]) {
    request.tls13Ciphers = config["tls13-ciphers"];
  }
  if (config["tlsauthtype"]) {
    request.tlsauthtype = config["tlsauthtype"];
  }
  if (config["tlspassword"]) {
    request.tlspassword = config["tlspassword"];
  }
  if (config["tlsuser"]) {
    request.tlsuser = config["tlsuser"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl-allow-beast")) {
    request.sslAllowBeast = config["ssl-allow-beast"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl-auto-client-cert")) {
    request.sslAutoClientCert = config["ssl-auto-client-cert"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl-no-revoke")) {
    request.sslNoRevoke = config["ssl-no-revoke"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl-reqd")) {
    request.sslReqd = config["ssl-reqd"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl-revoke-best-effort")) {
    request.sslRevokeBestEffort = config["ssl-revoke-best-effort"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "ssl")) {
    request.ssl = config["ssl"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "sslv2")) {
    request.sslv2 = config["sslv2"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "sslv3")) {
    request.sslv3 = config["sslv3"];
  }

  if (config["doh-url"]) {
    request.dohUrl = config["doh-url"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "doh-insecure")) {
    request.dohInsecure = config["doh-insecure"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "doh-cert-status")) {
    request.dohCertStatus = config["doh-cert-status"];
  }

  if (config.proxy) {
    // https://github.com/curl/curl/blob/e498a9b1fe5964a18eb2a3a99dc52160d2768261/lib/url.c#L2388-L2390
    request.proxy = config.proxy;
    if (request.proxyType && request.proxyType !== "http2") {
      delete request.proxyType;
    }
    if (config["proxy-user"]) {
      request.proxyAuth = config["proxy-user"];
    }
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxytunnel")) {
    request.proxytunnel = config.proxytunnel;
  }
  if (config.noproxy) {
    request.noproxy = config.noproxy;
  }
  if (config.preproxy) {
    request.preproxy = config.preproxy;
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-anyauth")) {
    request.proxyAnyauth = config["proxy-anyauth"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-basic")) {
    request.proxyBasic = config["proxy-basic"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-digest")) {
    request.proxyDigest = config["proxy-digest"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-negotiate")) {
    request.proxyNegotiate = config["proxy-negotiate"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-ntlm")) {
    request.proxyNtlm = config["proxy-ntlm"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-ca-native")) {
    request.proxyCaNative = config["proxy-ca-native"];
  }
  if (config["proxy-cacert"]) {
    request.proxyCacert = config["proxy-cacert"];
  }
  if (config["proxy-capath"]) {
    request.proxyCapath = config["proxy-capath"];
  }
  if (config["proxy-cert-type"]) {
    request.proxyCertType = config["proxy-cert-type"];
  }
  if (config["proxy-cert"]) {
    request.proxyCert = config["proxy-cert"];
  }
  if (config["proxy-ciphers"]) {
    request.proxyCiphers = config["proxy-ciphers"];
  }
  if (config["proxy-crlfile"]) {
    request.proxyCrlfile = config["proxy-crlfile"];
  }
  if (config["proxy-http2"]) {
    request.proxyType = "http2";
  }
  if (config["proxy1.0"]) {
    request.proxy = config["proxy1.0"];
    request.proxyType = "http1";
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-insecure")) {
    request.proxyInsecure = config["proxy-insecure"];
  }
  if (config["proxy-key"]) {
    request.proxyKey = config["proxy-key"];
  }
  if (config["proxy-key-type"]) {
    request.proxyKeyType = config["proxy-key-type"];
  }
  if (config["proxy-pass"]) {
    request.proxyPass = config["proxy-pass"];
  }
  if (config["proxy-pinnedpubkey"]) {
    request.proxyPinnedpubkey = config["proxy-pinnedpubkey"];
  }
  if (config["proxy-pinnedpubkey"]) {
    request.proxyPinnedpubkey = config["proxy-pinnedpubkey"];
  }
  if (config["proxy-service-name"]) {
    request.proxyServiceName = config["proxy-service-name"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-ssl-allow-beast")) {
    request.proxySslAllowBeast = config["proxy-ssl-allow-beast"];
  }
  if (
    Object.prototype.hasOwnProperty.call(config, "proxy-ssl-auto-client-cert")
  ) {
    request.proxySslAutoClientCert = config["proxy-ssl-auto-client-cert"];
  }
  if (config["proxy-tls13-ciphers"]) {
    request.proxyTls13Ciphers = config["proxy-tls13-ciphers"];
  }
  if (config["proxy-tlsauthtype"]) {
    request.proxyTlsauthtype = config["proxy-tlsauthtype"];
    if (
      request.proxyTlsauthtype.isString() &&
      !eq(request.proxyTlsauthtype, "SRP")
    ) {
      warnf(global_, [
        "proxy-tlsauthtype",
        "proxy-tlsauthtype is not supported: " + request.proxyTlsauthtype,
      ]);
    }
  }
  if (config["proxy-tlspassword"]) {
    request.proxyTlspassword = config["proxy-tlspassword"];
  }
  if (config["proxy-tlsuser"]) {
    request.proxyTlsuser = config["proxy-tlsuser"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxy-tlsv1")) {
    request.proxyTlsv1 = config["proxy-tlsv1"];
  }
  if (config["proxy-user"]) {
    request.proxyUser = config["proxy-user"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "proxytunnel")) {
    request.proxytunnel = config["proxytunnel"];
  }

  if (config["socks4"]) {
    request.proxy = config["socks4"];
    request.proxyType = "socks4";
  }
  if (config["socks4a"]) {
    request.proxy = config["socks4a"];
    request.proxyType = "socks4a";
  }
  if (config["socks5"]) {
    request.proxy = config["socks5"];
    request.proxyType = "socks5";
  }
  if (config["socks5-hostname"]) {
    request.proxy = config["socks5-hostname"];
    request.proxyType = "socks5-hostname";
  }
  if (Object.prototype.hasOwnProperty.call(config, "socks5-basic")) {
    request.socks5Basic = config["socks5-basic"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "socks5-gssapi-nec")) {
    request.socks5GssapiNec = config["socks5-gssapi-nec"];
  }
  if (config["socks5-gssapi-service"]) {
    request.socks5GssapiService = config["socks5-gssapi-service"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "socks5-gssapi")) {
    request.socks5Gssapi = config["socks5-gssapi"];
  }

  if (config["haproxy-clientip"]) {
    request.haproxyClientIp = config["haproxy-clientip"];
  }
  if (Object.prototype.hasOwnProperty.call(config, "haproxy-protocol")) {
    request.haproxyProtocol = config["haproxy-protocol"];
  }

  if (config["max-time"]) {
    request.timeout = config["max-time"];
    if (
      config["max-time"].isString() &&
      // TODO: parseFloat() like curl
      isNaN(parseFloat(config["max-time"].toString()))
    ) {
      warnf(global_, [
        "max-time-not-number",
        "option --max-time: expected a proper numerical parameter: " +
          JSON.stringify(config["max-time"].toString()),
      ]);
    }
  }
  if (config["connect-timeout"]) {
    request.connectTimeout = config["connect-timeout"];
    if (
      config["connect-timeout"].isString() &&
      isNaN(parseFloat(config["connect-timeout"].toString()))
    ) {
      warnf(global_, [
        "connect-timeout-not-number",
        "option --connect-timeout: expected a proper numerical parameter: " +
          JSON.stringify(config["connect-timeout"].toString()),
      ]);
    }
  }
  if (config["expect100-timeout"]) {
    request.expect100Timeout = config["expect100-timeout"];
    if (
      config["expect100-timeout"].isString() &&
      isNaN(parseFloat(config["expect100-timeout"].toString()))
    ) {
      warnf(global_, [
        "expect100-timeout-not-number",
        "option --expect100-timeout: expected a proper numerical parameter: " +
          JSON.stringify(config["expect100-timeout"].toString()),
      ]);
    }
  }
  if (config["happy-eyeballs-timeout-ms"]) {
    request.happyEyeballsTimeoutMs = config["happy-eyeballs-timeout-ms"];
  }
  if (config["speed-limit"]) {
    request.speedLimit = config["speed-limit"];
  }
  if (config["speed-time"]) {
    request.speedTime = config["speed-time"];
  }
  if (config["limit-rate"]) {
    request.limitRate = config["limit-rate"];
  }
  if (config["max-filesize"]) {
    request.maxFilesize = config["max-filesize"];
  }

  if (Object.prototype.hasOwnProperty.call(config, "keepalive")) {
    request.keepAlive = config.keepalive;
  }
  if (config["keepalive-time"]) {
    request.keepAliveTime = config["keepalive-time"];
  }

  if (config["alt-svc"]) {
    request.altSvc = config["alt-svc"];
  }

  if (Object.prototype.hasOwnProperty.call(config, "location")) {
    request.followRedirects = config.location;
  }
  if (config["location-trusted"]) {
    request.followRedirectsTrusted = config["location-trusted"];
  }
  if (config["max-redirs"]) {
    request.maxRedirects = config["max-redirs"].trim();
    if (
      config["max-redirs"].isString() &&
      !isInt(config["max-redirs"].toString())
    ) {
      warnf(global_, [
        "max-redirs-not-int",
        "option --max-redirs: expected a proper numerical parameter: " +
          JSON.stringify(config["max-redirs"].toString()),
      ]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(config, "post301")) {
    request.post301 = config.post301;
  }
  if (Object.prototype.hasOwnProperty.call(config, "post302")) {
    request.post302 = config.post302;
  }
  if (Object.prototype.hasOwnProperty.call(config, "post303")) {
    request.post303 = config.post303;
  }

  if (config.fail) {
    request.fail = config.fail;
  }

  if (config.retry) {
    request.retry = config.retry;
  }
  if (config["retry-max-time"]) {
    request.retryMaxTime = config["retry-max-time"];
  }

  if (Object.prototype.hasOwnProperty.call(config, "ftp-skip-pasv-ip")) {
    request.ftpSkipPasvIp = config["ftp-skip-pasv-ip"];
  }

  if (config.httpVersion) {
    if (
      config.httpVersion === "2" ||
      config.httpVersion === "2-prior-knowledge"
    ) {
      request.http2 = true;
    }
    if (config.httpVersion === "3" || config.httpVersion === "3-only") {
      request.http3 = true;
    }
    request.httpVersion = config.httpVersion;
  }
  if (Object.prototype.hasOwnProperty.call(config, "http0.9")) {
    request.http0_9 = config["http0.9"];
  }

  if (config.resolve && config.resolve.length) {
    request.resolve = config.resolve;
  }
  if (config["connect-to"] && config["connect-to"].length) {
    request.connectTo = config["connect-to"];
  }

  if (config["unix-socket"]) {
    request.unixSocket = config["unix-socket"];
  }
  if (config["abstract-unix-socket"]) {
    request.abstractUnixSocket = config["abstract-unix-socket"];
  }

  if (config["netrc-optional"]) {
    request.netrc = "optional";
  } else if (config.netrc || config["netrc-file"]) {
    request.netrc = "required";
  } else if (config.netrc === false) {
    // TODO || config["netrc-optional"] === false ?
    request.netrc = "ignored";
  }
  if (config["netrc-file"]) {
    request.netrcFile = config["netrc-file"];
  }

  if (config["use-ascii"]) {
    request.useAscii = config["use-ascii"];
  }

  if (config["continue-at"]) {
    request.continueAt = config["continue-at"];
  }

  if (Object.prototype.hasOwnProperty.call(config, "crlf")) {
    request.crlf = config.crlf;
  }

  if (Object.prototype.hasOwnProperty.call(config, "clobber")) {
    request.clobber = config.clobber;
  }
  if (Object.prototype.hasOwnProperty.call(config, "remote-time")) {
    request.remoteTime = config["remote-time"];
  }

  // Global options
  if (Object.prototype.hasOwnProperty.call(global_, "verbose")) {
    request.verbose = global_.verbose;
  }
  if (Object.prototype.hasOwnProperty.call(global_, "silent")) {
    request.silent = global_.silent;
  }

  return request;
}

export function buildRequests(
  global_: GlobalConfig,
  stdin?: Word,
  stdinFile?: Word,
): Request[] {
  if (!global_.configs.length) {
    // shouldn't happen
    warnf(global_, ["no-configs", "got empty config object"]);
  }
  return global_.configs.map((config) =>
    buildRequest(global_, config, stdin, stdinFile),
  );
}

export function getFirst(
  requests: Request[],
  warnings: Warnings,
  support?: Support,
): Request {
  if (requests.length > 1) {
    warnings.push([
      "next",
      // TODO: better message, we might have two requests because of
      // --next or because of multiple curl commands or both
      "got " +
        requests.length +
        " curl requests, only converting the first one",
    ]);
  }
  const request = requests[0];
  warnIfPartsIgnored(request, warnings, support);
  return request;
}
