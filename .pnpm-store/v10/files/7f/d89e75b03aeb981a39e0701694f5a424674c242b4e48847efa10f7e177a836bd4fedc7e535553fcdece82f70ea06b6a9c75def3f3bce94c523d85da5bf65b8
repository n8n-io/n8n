import { Word, eq, joinWords } from "./shell/Word.js";
import type { Warnings } from "./Warnings.js";

// https://en.wikipedia.org/wiki/List_of_HTTP_header_fields#Standard_request_fields
// and then searched for "#" in the RFCs that define each header
const COMMA_SEPARATED = new Set(
  [
    "A-IM",
    "Accept",
    "Accept-Charset",
    // "Accept-Datetime",
    "Accept-Encoding",
    "Accept-Language",
    // "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    // TODO: auth-scheme [ 1*SP ( token68 / #auth-param ) ]
    // "Authorization",
    "Cache-Control",
    "Connection",
    "Content-Encoding",
    // "Content-Length",
    // "Content-MD5",
    // "Content-Type", // semicolon
    // "Cookie", // semicolon
    // "Date",
    "Expect",
    "Forwarded",
    // "From",
    // "Host",
    // "HTTP2-Settings",
    "If-Match",
    // "If-Modified-Since",
    "If-None-Match",
    // "If-Range",
    // "If-Unmodified-Since",
    // "Max-Forwards",
    // "Origin",
    // "Pragma",
    // "Prefer", // semicolon
    // "Proxy-Authorization",
    "Range",
    // "Referer",
    "TE",
    "Trailer",
    "Transfer-Encoding",
    // "User-Agent",
    "Upgrade",
    "Via",
    "Warning",
  ].map((h) => h.toLowerCase()),
);
const SEMICOLON_SEPARATED = new Set(
  ["Content-Type", "Cookie", "Prefer"].map((h) => h.toLowerCase()),
);

export class Headers implements Iterable<[Word, Word | null]> {
  // null means the header must not be sent, for example
  // curl -H 'Host:' example.com
  readonly headers: [Word, Word | null][];
  readonly lowercase: boolean;

  constructor(
    headerArgs?: Word[],
    warnings: Warnings = [],
    // Used for warnings
    argName = "--header/H",
  ) {
    let headers: [Word, Word | null][] = [];

    if (headerArgs) {
      for (const header of headerArgs) {
        if (header.startsWith("@")) {
          warnings.push([
            "header-file",
            "passing a file for " +
              argName +
              " is not supported: " +
              JSON.stringify(header.toString()),
          ]);
          continue;
        }

        if (header.includes(":")) {
          const [name, value] = header.split(":", 2);
          // Passing -H 'Header-Name:' disables sending of that header.
          // If the colon is followed by just spaces they're ignored
          // unless it's -H 'Host: '
          // https://github.com/curl/curl/issues/12782
          const hasValue =
            value && (eq(name, "Host") ? value : value.trim()).toBool();
          const headerValue = hasValue ? value.removeFirstChar(" ") : null;
          headers.push([name, headerValue]);
        } else if (header.includes(";")) {
          const [name] = header.split(";", 2);
          headers.push([name, new Word()]);
        } else {
          // TODO: warn that this header arg is ignored?
        }
      }
    }
    this.lowercase =
      headers.length > 0 && headers.every((h) => eq(h[0], h[0].toLowerCase()));

    // Handle repeated headers
    // For Cookie and Accept, merge the values using ';' and ',' respectively
    // For other headers, warn about the repeated header
    const uniqueHeaders: { [key: string]: [Word, Word | null][] } = {};
    for (const [name, value] of headers) {
      // TODO: something better, at least warn that variable is ignored
      const lowerName = name.toLowerCase().toString();
      if (!uniqueHeaders[lowerName]) {
        uniqueHeaders[lowerName] = [];
      }
      uniqueHeaders[lowerName].push([name, value]);
    }

    headers = [];
    for (const [lowerName, repeatedHeaders] of Object.entries(uniqueHeaders)) {
      if (repeatedHeaders.length === 1) {
        headers.push(repeatedHeaders[0]);
        continue;
      }
      // If they're all null, just use the first one
      if (repeatedHeaders.every((h) => h[1] === null)) {
        const lastRepeat = repeatedHeaders[repeatedHeaders.length - 1];
        // Warn users if some are capitalized differently
        if (new Set(repeatedHeaders.map((h) => h[0])).size > 1) {
          warnings.push([
            "repeated-header",
            `"${lastRepeat[0]}" header unset ${repeatedHeaders.length} times`,
          ]);
        }
        headers.push(lastRepeat);
        continue;
      }
      // Otherwise there's at least one non-null value, so we can ignore the nulls
      // TODO: if the values of the repeated headers are the same, just use the first one
      //     'content-type': 'application/json; application/json',
      // doesn't really make sense
      const nonEmptyHeaders = repeatedHeaders.filter((h) => h[1] !== null);
      if (nonEmptyHeaders.length === 1) {
        headers.push(nonEmptyHeaders[0]);
        continue;
      }
      let mergeChar = "";
      if (COMMA_SEPARATED.has(lowerName)) {
        mergeChar = ", ";
      } else if (SEMICOLON_SEPARATED.has(lowerName)) {
        mergeChar = "; ";
      }
      if (mergeChar) {
        const merged = joinWords(
          nonEmptyHeaders.map((h) => h[1]) as Word[],
          mergeChar,
        );
        warnings.push([
          "repeated-header",
          `merged ${nonEmptyHeaders.length} "${
            nonEmptyHeaders[nonEmptyHeaders.length - 1][0]
          }" headers together with "${mergeChar.trim()}"`,
        ]);
        headers.push([nonEmptyHeaders[0][0], merged]);
        continue;
      }

      warnings.push([
        "repeated-header",
        `found ${nonEmptyHeaders.length} "${
          nonEmptyHeaders[nonEmptyHeaders.length - 1][0]
        }" headers, only the last one will be sent`,
      ]);
      headers = headers.concat(nonEmptyHeaders);
    }

    this.headers = headers;
  }

  get length(): number {
    return this.headers.length;
  }

  *[Symbol.iterator](): Iterator<[Word, Word | null]> {
    for (const h of this.headers) {
      yield h;
    }
  }

  // Gets the first header, matching case-insensitively
  get(header: string): Word | null | undefined {
    const lookup = header.toLowerCase();
    for (const [h, v] of this.headers) {
      if (h.toLowerCase().toString() === lookup) {
        return v;
      }
    }
    return undefined;
  }

  getContentType(): string | null | undefined {
    const contentTypeHeader = this.get("content-type");
    if (!contentTypeHeader) {
      return contentTypeHeader;
    }
    return contentTypeHeader.split(";")[0].trim().toString();
  }

  has(header: Word | string): boolean {
    const lookup = header.toLowerCase();
    for (const h of this.headers) {
      if (eq(h[0].toLowerCase(), lookup)) {
        return true;
      }
    }
    return false;
  }

  // Doesn't overwrite existing headers
  setIfMissing(header: string, value: Word | string): boolean {
    if (this.has(header)) {
      return false;
    }

    if (this.lowercase) {
      header = header.toLowerCase();
    }
    const k = typeof header === "string" ? new Word(header) : header;
    const v = typeof value === "string" ? new Word(value) : value;
    this.headers.push([k, v]);
    return true;
  }

  prependIfMissing(header: string, value: Word | string) {
    if (this.has(header)) {
      return false;
    }

    if (this.lowercase) {
      header = header.toLowerCase();
    }
    const k = typeof header === "string" ? new Word(header) : header;
    const v = typeof value === "string" ? new Word(value) : value;
    this.headers.unshift([k, v]);
    return true;
  }

  set(header: string, value: Word | string) {
    if (this.lowercase) {
      header = header.toLowerCase();
    }
    const k = typeof header === "string" ? new Word(header) : header;
    const v = typeof value === "string" ? new Word(value) : value;

    // keep it in the same place if we overwrite
    const searchHeader = k.toLowerCase().toString();
    for (let i = 0; i < this.headers.length; i++) {
      if (eq(this.headers[i][0].toLowerCase(), searchHeader)) {
        this.headers[i][1] = v;
        return;
      }
    }

    this.headers.push([k, v]);
  }

  delete(header: string) {
    const lookup = header.toLowerCase();
    for (let i = this.headers.length - 1; i >= 0; i--) {
      if (this.headers[i][0].toLowerCase().toString() === lookup) {
        this.headers.splice(i, 1);
      }
    }
  }

  // TODO: doesn't this skip the next element after deleting?
  clearNulls() {
    for (let i = this.headers.length - 1; i >= 0; i--) {
      if (this.headers[i][1] === null) {
        this.headers.splice(i, 1);
      }
    }
  }

  // TODO: shouldn't be used
  count(header: string) {
    let count = 0;
    const lookup = header.toLowerCase();
    for (const h of this.headers || []) {
      if (h[0].toLowerCase().toString() === lookup) {
        count += 1;
      }
    }
    return count;
  }

  toBool(): boolean {
    return this.headers.length > 0 && this.headers.some((h) => h[1] !== null);
  }
}

// Cookie is a type of header.
export type Cookie = [Word, Word];
export type Cookies = Array<Cookie>;

export function parseCookiesStrict(cookieString: Word): Cookies | null {
  const cookies: Cookies = [];
  for (let cookie of cookieString.split(";")) {
    cookie = cookie.replace(/^ /, "");
    const [name, value] = cookie.split("=", 2);
    if (value === undefined) {
      return null;
    }
    cookies.push([name, value]);
  }
  if (new Set(cookies.map((c) => c[0])).size !== cookies.length) {
    return null;
  }
  return cookies;
}

export function parseCookies(cookieString: Word): Cookies | null {
  const cookies: Cookies = [];
  for (let cookie of cookieString.split(";")) {
    cookie = cookie.trim();
    if (!cookie) {
      continue;
    }
    const [name, value] = cookie.split("=", 2);
    cookies.push([name.trim(), (value || "").trim()]);
  }
  if (new Set(cookies.map((c) => c[0])).size !== cookies.length) {
    return null;
  }
  return cookies;
}
