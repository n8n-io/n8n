import { CCError, has, UTF8encoder } from "../../utils.js";
import { Word, eq } from "../../shell/Word.js";
import { parse, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import type { Request, Warnings } from "../../parse.js";
import { Headers } from "../../Headers.js";
import { wordDecodeURIComponent, percentEncode } from "../../Query.js";
import { DataParam } from "../../Request.js";

import {
  parse as jsonParseLossless,
  stringify as jsonStringifyLossless,
  isSafeNumber,
  isInteger,
  isLosslessNumber,
} from "lossless-json";

// TODO: partiallySupportedArgs
export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,

  "compressed",
  // "no-compressed",

  // "anyauth",
  // "no-anyauth",
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

  "http1.1",
  // These are not supported, just better warning message
  "http2",
  "http2-prior-knowledge",
  "http3",
  "http3-only",

  "cookie-jar",

  "cert",
  "cacert",
  "key",
  "capath",

  "form",
  "form-string",

  "location",
  "no-location",
  "location-trusted", // not exactly supported, just better warning message
  "no-location-trusted",
  "max-redirs",

  "max-time",
  "connect-timeout",

  "insecure",
  "no-insecure",

  "output",
  "upload-file",

  "next",

  "proxy",
  "proxy-user",
]);

// https://peps.python.org/pep-3138/
// https://www.unicode.org/reports/tr44/#GC_Values_Table
// https://unicode.org/Public/UNIDATA/UnicodeData.txt
// https://en.wikipedia.org/wiki/Plane_(Unicode)#Overview
const regexSingleEscape = /'|\\|\p{C}|[^ \P{Z}]/gu;
const regexDoubleEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;

// Also used for Go and R
export function reprStr(s: string, quote?: '"' | "'"): string {
  if (quote === undefined) {
    quote = "'";
    if (s.includes("'") && !s.includes('"')) {
      quote = '"';
    }
  }
  const regex = quote === "'" ? regexSingleEscape : regexDoubleEscape;

  return (
    quote +
    s.replace(regex, (c: string): string => {
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
        case "'":
          return "\\'";
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
    quote
  );
}

// TODO: use this if string contains unmatched surrogates?
// It just replaces them with the replacement character, but at least that code would run.
export function pybescComplex(s: string): string {
  let quote = "'";
  if (s.includes("'") && !s.includes('"')) {
    quote = '"';
  }
  const quoteCode = quote.charCodeAt(0);

  // TODO: using UTF-8 here is overly simplistic and how to encode here
  // is a pretty complicated decision.
  // For starters, it would be more correct to use the same encoding as
  // the terminal when running from the command line.
  const bytes = UTF8encoder.encode(s);

  return (
    "b" +
    quote +
    [...bytes]
      .map((c: number): string => {
        switch (c) {
          case 0x07:
            return "\\a";
          case 0x08:
            return "\\b";
          case 0x0c:
            return "\\f";
          case 0x0a:
            return "\\n";
          case 0x0d:
            return "\\r";
          case 0x09:
            return "\\t";
          case 0x0b:
            return "\\v";
          case 0x5c:
            return "\\\\";
          case quoteCode:
            return "\\" + String.fromCharCode(c);
        }
        if (c >= 0x20 && c < 0x7f) {
          return String.fromCharCode(c);
        }
        const hex = c.toString(16);
        return "\\x" + hex.padStart(2, "0");
      })
      .join("") +
    quote
  );
}

export function reprStrBinary(s: string): string {
  const sEsc = reprStr(s);
  // We check until 0x7F instead of 0xFF because curl (running in a UTF-8 terminal) when it gets
  // bytes sends them as is, but if we pass b'\x80' to Requests, it will encode that byte as
  // Latin-1 (presumably for backwards compatibility) instead of UTF-8.
  if (/^[\x00-\x7f]*$/.test(s)) {
    return "b" + sEsc;
  }
  // TODO: unmatched surrogates will generate code that throws an error
  // e.g.: '\uDC00'.encode()
  return sEsc + ".encode()";
}

export type OSVars = { [key: string]: string };
export function repr(
  word: Word,
  osVars: OSVars,
  imports: Set<string>,
  binary = false,
  // os.getenv('MYVAR') returns None if MYVAR is not set
  // os.getenv('MYVAR', '') returns '' if MYVAR is not set but it's a bit more verbose,
  // so setting errorOk to true will use the shorter version
  errorOk = false,
): string {
  const reprFn = binary ? reprStrBinary : reprStr;
  const reprs = [];
  for (const t of word.tokens) {
    if (typeof t === "string") {
      reprs.push(reprFn(t));
    } else if (t.type === "variable") {
      // TODO: getenvb() is not available on Windows
      const fn = binary ? "os.getenvb" : "os.getenv";
      let getEnvCall = fn + "(" + reprFn(t.value);
      if (!errorOk || word.tokens.length > 1) {
        getEnvCall += ", " + reprFn("");
      }
      getEnvCall += ")";
      reprs.push(getEnvCall);
      // TODO: if the result of a repr() is discarded, this adds an unused import
      imports.add("os");
    } else if (t.type === "command") {
      // TODO: warn that shell=True is a bad idea
      // or properly parse the subcommand and render it as an array
      let subprocessCall =
        "subprocess.run(" +
        reprStr(t.value) +
        ", shell=True, capture_output=True";
      if (!binary) {
        subprocessCall += ", text=True";
      }
      subprocessCall += ").stdout";

      // TODO: generate a descriptive command name with ChatGPT
      // TODO: if there's only one command, name the variable "command" instead of "command1"
      let i = 1;
      let pyVar = "command" + i;
      // We need to check because we often try to represent the same
      // token twice and discard one of the attempts.
      // This is linear time but hopefully there's not that many subcommands.
      while (pyVar in osVars && osVars[pyVar] !== subprocessCall) {
        i++;
        pyVar = "command" + i;
        if (i > Number.MAX_SAFE_INTEGER) {
          throw new CCError("lol");
        }
      }
      osVars[pyVar] = subprocessCall;
      reprs.push(pyVar);
      // TODO: if the result of a repr() is discarded, this adds an unused import
      imports.add("subprocess");
    }
  }
  return reprs.join(" + ");
}

function reprb(word: Word, osVars: OSVars, imports: Set<string>): string {
  return repr(word, osVars, imports, true);
}

export function asFloat(
  word: Word,
  osVars: OSVars,
  imports: Set<string>,
): string {
  if (word.isString()) {
    // TODO: check it's actually a valid float
    return word.toString();
  }
  return "float(" + repr(word, osVars, imports, false, true) + ")";
}

export function asInt(
  word: Word,
  osVars: OSVars,
  imports: Set<string>,
): string {
  if (word.isString()) {
    // TODO: check it's actually a valid int
    return word.toString();
  }
  return "int(" + repr(word, osVars, imports, false, true) + ")";
}

// Port of Python's json.dumps() with its default options, which is what Requests uses
// https://github.com/psf/requests/blob/b0e025ade7ed30ed53ab61f542779af7e024932e/requests/models.py#L473
// It's different from JSON.stringify(). Namely, it adds spaces after ',' and ':'
// and all non-ASCII characters in strings are escaped:
// > JSON.stringify('\xFF')
// '"ÿ"'
// >>> json.dumps('\xFF')
// '"\\u00ff"'
const pythonJsonEscape = /"|\\|[^\x20-\x7E]/g;
function jsonRepr(s: string): string {
  return (
    '"' +
    s.replace(pythonJsonEscape, (c: string): string => {
      // https://tc39.es/ecma262/#table-json-single-character-escapes
      switch (c) {
        case "\b":
          return "\\b";
        case "\t":
          return "\\t";
        case "\n":
          return "\\n";
        case "\f":
          return "\\f";
        case "\r":
          return "\\r";
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
      }

      const hex = c.charCodeAt(0).toString(16);
      return "\\u" + hex.padStart(4, "0");
    }) +
    '"'
  );
}

function ensure_minimum_exponent_length(n: string): string {
  // If there's only 1 exponent digit, add a leading 0 to it
  // ensure_minimum_exponent_length('1e-7') => '1e-07'
  const [mantissa, exponent] = n.split("e");
  const exponentSign = exponent[0];
  const exponentValue = exponent.slice(1);
  if (exponentValue.length === 1) {
    return mantissa + "e" + exponentSign + "0" + exponentValue;
  }
  return n;
}
function floatAsPython(value: number): string {
  // JSON.stringify() and lossless-json's stringify() don't stringify floats like Python.
  // Notably, JavaScript doesn't add a trailing '.0' to floats that are integers but Python does
  // JSON.stringify(10.0) => '10'
  // str(10.0)            => '10.0'
  //
  // Python adds a leading 0 to exponent notation numbers with 1 exponent digit
  // JSON.stringify(1e-7) => '1e-7'
  //            str(1e-7) => '1e-07'
  //
  // Finally, Python will switch to scientific notation if the number has more than
  // 17 digits not in scientific notation.
  //
  // Python's float formatting starts here:
  // https://github.com/python/cpython/blob/bdc93b8a3563b4a3adb25fa902c0c879ccf427f6/Python/pystrtod.c#L915-L918
  // and is ultimately this code:
  // snprintf(buf, buf_size, "%.17g", val)
  // change_decimal_from_locale_to_dot(buffer); // not important
  // ensure_minimum_exponent_length(buffer, buf_size);
  // ensure_decimal_point(buffer, buf_size, 17); // can switch to exponent notation
  //
  // And JavaScript's formatting is specified here:
  // https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring
  let asJsStr = value.toString();
  if (asJsStr.includes("e")) {
    asJsStr = ensure_minimum_exponent_length(asJsStr);
  } else {
    if (isInteger(asJsStr)) {
      asJsStr += ".0";
    }
    // If there's more than 17 digits of precision, switch to scientific notation
    const significantDigits = asJsStr
      .replace(/^-/, "")
      .replace(".", "")
      .replace(/^0+/, "");
    const asExponential = ensure_minimum_exponent_length(value.toExponential());
    if (
      significantDigits.length > 17 ||
      (asExponential.length < asJsStr.length &&
        asJsStr.split(".")[1].length > 4)
    ) {
      asJsStr = asExponential;
    }
  }
  return asJsStr;
}

function jsonDumps(obj: string | number | boolean | object | null): string {
  if (isLosslessNumber(obj)) {
    const numAsStr = jsonStringifyLossless(obj) as string;
    if (isInteger(numAsStr)) {
      return numAsStr;
    }

    if (!isSafeNumber(numAsStr)) {
      throw new CCError("float unrepresentable in Python: " + numAsStr);
    }
    // Can't be bigint because it's !isInteger and isSafeNumber
    return floatAsPython(obj.valueOf() as number);
  }

  switch (typeof obj) {
    case "string":
      return jsonRepr(obj);
    case "number":
      // If the number in the JSON file is very large, it'll turn into Infinity
      if (!isFinite(obj)) {
        throw new CCError("found Infitiny in JSON");
      }
      // TODO: If the number in the JSON file is too big for JavaScript, we will lose information
      // TODO: JavaScript and Python serialize floats differently.
      // JSON.stringify(2e2) => 200
      // json.dumps(2e2)     => 200.0
      return obj.toString();
    case "boolean":
      return obj.toString();
    case "object":
      if (obj === null) {
        return "null";
      }
      if (Array.isArray(obj)) {
        return "[" + obj.map(jsonDumps).join(", ") + "]";
      }
      return (
        "{" +
        Object.entries(obj)
          .map((e) => jsonRepr(e[0]) + ": " + jsonDumps(e[1]))
          .join(", ") +
        "}"
      );
    default:
      throw new CCError(
        "unexpected object type that shouldn't appear in JSON: " + typeof obj,
      );
  }
}

function objToPython(
  obj: string | number | boolean | object | null,
  indent = 0,
): string {
  if (isLosslessNumber(obj)) {
    const numAsStr = jsonStringifyLossless(obj) as string;
    // If the number is a large float, it might not be representable in Python
    // Both JavaScript and Python use f64 so we check if the float
    // is representable in JavaScript.
    if (!isInteger(numAsStr) && !isSafeNumber(numAsStr)) {
      throw new CCError("float unrepresentable in Python: " + numAsStr);
    }
    // Displaying floats as they will be serialized in Python would help users
    // understand why they're getting the "JSON won't be serialized as it was originally"
    // message, but I think displaying them as they appear in the JSON is likely
    // to be more convenient if you need to edit the value.
    return numAsStr;
  }

  switch (typeof obj) {
    case "string":
      return reprStr(obj);
    case "number":
      // TODO: there are differences in number serialization between Python and JavaScript
      // TODO: if the number in the JSON file is too big for JavaScript, we will lose information
      return obj.toString();
    case "boolean":
      return obj ? "True" : "False";
    case "object":
      if (obj === null) {
        return "None";
      }
      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          return "[]";
        }
        let s = "[\n";
        for (const item of obj) {
          s += " ".repeat(indent + 4) + objToPython(item, indent + 4) + ",\n";
        }
        s += " ".repeat(indent) + "]";
        return s;
      }

      if (Object.keys(obj).length === 0) {
        return "{}";
      }
      {
        let s = "{\n";
        for (const [k, v] of Object.entries(obj)) {
          // repr() because JSON keys must be strings.
          s +=
            " ".repeat(indent + 4) +
            reprStr(k) +
            ": " +
            objToPython(v, indent + 4) +
            ",\n";
        }
        s += " ".repeat(indent) + "}";
        return s;
      }
    default:
      throw new CCError(
        "unexpected object type that shouldn't appear in JSON: " + typeof obj,
      );
  }
}

export function formatHeaders(
  headers: Headers,
  commentedOutHeaders: { [key: string]: string },
  osVars: OSVars,
  imports: Set<string>,
): string {
  // TODO: what if there are repeat headers
  let headerDict = "headers = {\n";
  for (const [headerName, headerValue] of headers) {
    if (headerValue === null) {
      continue;
    }

    let lineStart;
    const headerNameLower = headerName.toLowerCase().toString();
    if (has(commentedOutHeaders, headerNameLower)) {
      if (commentedOutHeaders[headerNameLower]) {
        headerDict += "    # " + commentedOutHeaders[headerNameLower] + "\n";
      }
      lineStart = "    # ";
    } else {
      lineStart = "    ";
    }
    headerDict +=
      lineStart +
      repr(headerName, osVars, imports) +
      ": " +
      repr(headerValue, osVars, imports) +
      ",\n";
  }
  headerDict += "}\n";
  return headerDict;
}

function decodePercentEncoding(s: Word): Word | null {
  let decoded;
  try {
    // https://url.spec.whatwg.org/#urlencoded-parsing recommends replacing + with space
    // before decoding.
    decoded = wordDecodeURIComponent(s.replace(/\+/g, " "));
  } catch (e) {
    if (e instanceof URIError) {
      // String contains invalid percent encoded characters
      return null;
    }
    throw e;
  }
  // If the query string doesn't round-trip, we cannot properly convert it.
  const roundTripKey = percentEncode(decoded);
  // If the original data used %20 instead of + (what requests will send), that's close enough
  if (!eq(roundTripKey, s) && !eq(roundTripKey.replace(/%20/g, "+"), s)) {
    return null;
  }
  return decoded;
}

function dataEntriesToDict(
  dataEntries: Array<[string, string]>,
): { [key: string]: Array<string> } | null {
  // Group keys
  // TODO: because keys can be code that reads from a file, those should not be considered the
  // same key, for example what if that file is /dev/urandom.
  // TODO: would we need to distinguish if /dev/urandom came from @/dev/urandom or from @-?
  const asDict: { [key: string]: Array<string> } = {};
  let prevKey = null;
  for (const [key, val] of dataEntries) {
    if (prevKey === key) {
      asDict[key].push(val);
    } else {
      if (!Object.prototype.hasOwnProperty.call(asDict, key)) {
        asDict[key] = [val];
      } else {
        // A repeated key with a different key between one of its repetitions
        // means we can't represent these entries as a dictionary.
        return null;
      }
    }
    prevKey = key;
  }

  return asDict;
}

function dataEntriesToPython(dataEntries: Array<[string, string]>): string {
  if (dataEntries.length === 0) {
    return "''"; // This shouldn't happen
  }

  const entriesDict = dataEntriesToDict(dataEntries);
  if (entriesDict !== null) {
    if (Object.keys(entriesDict).length === 0) {
      return "''"; // This shouldn't happen
    }
    let s = "{\n";
    for (const [key, vals] of Object.entries(entriesDict)) {
      s += "    " + key + ": ";
      if (vals.length === 0) {
        s += "''"; // This shouldn't happen
      } else if (vals.length === 1) {
        s += vals[0];
      } else {
        s += "[\n";
        for (const val of vals) {
          s += "        " + val + ",\n";
        }
        s += "    ]";
      }
      s += ",\n";
    }
    s += "}";
    return s;
  }

  let s = "[\n";
  for (const entry of dataEntries) {
    const [key, val] = entry;
    s += "    (" + key + ", " + val + "),\n";
  }
  s += "]";
  return s;
}

function formatDataAsEntries(
  dataArray: DataParam[],
  osVars: OSVars,
  imports: Set<string>,
  variableName: "data" | "params" = "data",
): [string, string] | null {
  // This code is more complicated than you might expect because it needs
  // to handle a --data-urlencode that reads from a file followed by --json
  // because --json doesn't add an '&' before its value.  Specifically, we
  // have these cases:
  //
  // --data-urlencode @filename --json =value
  // {open('filename').read(): 'value'}
  //
  // --data-urlencode @filename --json key=value
  // {open('filename').read() + 'key': 'value'}
  //
  // --data-urlencode @filename --json key
  // error
  //
  // --data-urlencode name@filename --json value
  // {'name': open('filename').read() + 'value'}
  //
  // --data-urlencode name@filename --json key=value
  // error
  //
  // --data-urlencode name@filename --json =blah
  // error
  //
  // --data-urlencode adds an '&' before its value, so we don't have to worry about
  // --json <foo> --data-urlencode <bar>
  for (const d of dataArray) {
    if (!(d instanceof Word) && d.filetype !== "urlencode") {
      return null;
    }
  }

  const dataEntries: Array<[string, string | null]> = [];
  let percentWarn = new Word();
  for (const [i, d] of dataArray.entries()) {
    if (d instanceof Word) {
      let newEntries = d.split("&");

      const prevEntry = i > 0 ? dataEntries[dataEntries.length - 1] : null;
      if (prevEntry !== null) {
        // If there's a prevEntry, we can assume it came from --data-urlencode
        // because it would be part of the current `d` string if it didn't.
        const [first, ...rest] = newEntries;
        if (first.includes("=") && prevEntry[1] === null) {
          const [key, val] = first.split("=", 2);
          const decodedKey = decodePercentEncoding(key);
          if (decodedKey === null) {
            return null;
          }
          const decodedVal = decodePercentEncoding(val);
          if (decodedVal === null) {
            return null;
          }
          if (key.toBool()) {
            prevEntry[0] += " + " + repr(decodedKey, osVars, imports);
          }
          prevEntry[1] = repr(decodedVal, osVars, imports);

          if (!percentWarn.toBool()) {
            if (key.includes("%20")) {
              percentWarn = key;
            }
            if (val.includes("%20")) {
              percentWarn = val;
            }
          }
        } else if (!first.includes("=") && prevEntry[1] !== null) {
          if (first.toBool()) {
            const decodedVal = decodePercentEncoding(first);
            if (decodedVal === null) {
              return null;
            }
            prevEntry[1] += " + " + repr(decodedVal, osVars, imports);

            if (!percentWarn.toBool() && first.includes("%20")) {
              percentWarn = first;
            }
          }
        } else {
          return null;
        }
        newEntries = rest;
      }

      for (const [j, entry] of newEntries.entries()) {
        if (
          entry.isEmpty() &&
          j === newEntries.length - 1 &&
          i !== dataArray.length - 1
        ) {
          // A --data-urlencoded should come next
          continue;
        }
        if (!entry.includes("=")) {
          return null;
        }
        const [key, val] = entry.split("=", 2);
        const decodedKey = decodePercentEncoding(key);
        if (decodedKey === null) {
          return null;
        }
        const decodedVal = decodePercentEncoding(val);
        if (decodedVal === null) {
          return null;
        }
        dataEntries.push([
          repr(decodedKey, osVars, imports),
          repr(decodedVal, osVars, imports),
        ]);

        if (!percentWarn.toBool()) {
          if (key.includes("%20")) {
            percentWarn = key;
          }
          if (val.includes("%20")) {
            percentWarn = val;
          }
        }
      }

      continue;
    }

    // TODO: I bet Python doesn't treat file paths identically to curl
    const readFile = eq(d.filename, "-")
      ? "sys.stdin.read()"
      : "open(" + repr(d.filename, osVars, imports, false, true) + ").read()";

    if (!d.name) {
      dataEntries.push([readFile, null]);
    } else {
      // Curl doesn't percent encode the name but Requests will
      if (!eq(d.name, percentEncode(d.name))) {
        return null;
      }
      dataEntries.push([repr(d.name, osVars, imports), readFile]);
    }
  }

  if (dataEntries.some((e) => e[1] === null)) {
    return null;
  }

  return [
    variableName +
      " = " +
      dataEntriesToPython(dataEntries as [string, string][]) +
      "\n",
    percentWarn.toString(),
  ];
}

function formatDataAsStr(
  dataArray: DataParam[],
  imports: Set<string>,
  osVars: OSVars,
  variableName: "data" | "params" = "data",
): [string, boolean] {
  // If one of the arguments has to be binary, then they all have to be binary
  // because we can't mix bytes and str.
  // An argument has to be binary when the input command has
  // --data-binary @filename
  // otherwise we could generate code that will try to read an image file as text and error.
  const binary = dataArray.some(
    (d) => !(d instanceof Word) && d.filetype === "binary",
  );
  const reprFunc = binary ? reprb : repr;
  const prefix = binary ? "b" : "";
  const mode = binary ? ", 'rb'" : "";

  // If we see a string with non-ASCII characters, or read from a file (which may contain
  // non-ASCII characters), we convert the entire string to bytes at the end.
  // curl sends bytes as-is, which is presumably in UTF-8, whereas Requests sends
  // 0x80-0xFF as Latin-1 (as-is) and throws an error if it sees codepoints
  // above 0xFF.
  // TODO: is this actually helpful?
  let encode = false;
  let encodeOnSeparateLine = false;

  const lines = [];

  let extra = new Word();
  let i, d;
  for ([i, d] of dataArray.entries()) {
    const op = i === 0 ? "=" : "+=";
    let line = variableName + " " + op + " ";

    if (i < dataArray.length - 1 && d instanceof Word && d.endsWith("&")) {
      // Put the trailing '&' on the next line so that we don't have single '&'s on their own lines
      extra = new Word("&");
      d = d.slice(0, -1);
    }

    if (d instanceof Word) {
      if (d.length) {
        line += reprFunc(d, osVars, imports);
        lines.push(line);
        encode ||= d.test(/[^\x00-\x7F]/);
      }
      continue;
    }

    const { filetype, name, filename } = d;
    if (filetype === "urlencode" && name) {
      line += reprFunc(extra.add(name).append("="), osVars, imports) + " + ";
      encodeOnSeparateLine = true; // we would need to add parentheses because of the +
    } else if (extra.toBool()) {
      line += reprFunc(extra, osVars, imports) + " + ";
      encodeOnSeparateLine = true;
    }
    if (extra.toBool()) {
      encodeOnSeparateLine = true; // we would need to add parentheses because of the +
    }

    let readFile = "";
    if (eq(filename, "-")) {
      readFile += binary ? "sys.stdin.buffer" : "sys.stdin";
      imports.add("sys");
    } else {
      // TODO: if filename is a command, this won't work because unlike bash,
      // Python won't remove the trailing newline from the result of a command
      // we need to add .trim()
      line =
        "with open(" +
        repr(filename, osVars, imports, false, true) +
        mode +
        ") as f:\n    " +
        line;
      readFile += "f";
    }
    readFile += ".read()";
    if (!["binary", "json", "urlencode"].includes(filetype)) {
      readFile += `.replace(${prefix}'\\n', ${prefix}'').replace(${prefix}'\\r', ${prefix}'')`;
    }

    if (filetype === "urlencode") {
      readFile = "quote_plus(" + readFile + ")";
      if (binary) {
        // quote_plus() always returns a string
        readFile += ".encode()";
      }
      imports.add("urllib.parse.quote_plus");
    } else {
      // --data-urlencode files don't need to be encoded because
      // they'll be percent-encoded and therefore ASCII-only
      encode = true;
    }

    line += readFile;
    lines.push(line);
    extra = new Word();
  }

  if (binary) {
    encode = false;
  } else if (encode && lines.length === 1 && !encodeOnSeparateLine) {
    lines[lines.length - 1] += ".encode()";
    encode = false;
  }

  return [lines.join("\n") + "\n", encode];
}

export function formatDataAsJson(
  d: DataParam,
  imports: Set<string>,
  osVars: OSVars,
): [string | null, boolean] {
  if (d instanceof Word) {
    if (!d.isString()) {
      // TODO: a JSON parser that allows shell variables
      return [null, false];
    }

    // Try to parse using lossless-json first, then fall back to JSON.parse
    // TODO: repeated dictionary keys are discarded
    // https://github.com/josdejong/lossless-json/issues/244
    let dataAsJson;
    try {
      // TODO: types
      // https://github.com/josdejong/lossless-json/issues/245
      dataAsJson = jsonParseLossless(d.toString()) as any;
    } catch {
      try {
        dataAsJson = JSON.parse(d.toString());
      } catch {
        return [null, false];
      }
    }

    try {
      const jsonDataString = "json_data = " + objToPython(dataAsJson) + "\n";
      // JSON might not be serialized by Python exactly as it was originally
      // due to different whitespace, float formatting like extra + in exponent
      // (1e100 vs 1e+100), different escape sequences in strings
      // ("\/" vs "/" or "\u0008" vs "\b") or duplicate object keys.
      let jsonRoundtrips = false;
      try {
        jsonRoundtrips = jsonDumps(dataAsJson) === d.tokens[0];
      } catch {}
      return [jsonDataString, jsonRoundtrips];
    } catch {}
  } else if (d.filetype === "json") {
    let jsonDataString = "";
    jsonDataString +=
      "with open(" +
      repr(d.filename, osVars, imports, false, true) +
      ") as f:\n";
    jsonDataString += "    json_data = json.load(f)\n";
    imports.add("json");
    return [jsonDataString, false];
  }

  return [null, false];
}

function getDataString(
  request: Request,
  osVars: OSVars,
  warnings: Warnings,
): [string | null, boolean | null, string | null, Set<string>] {
  const imports = new Set<string>();
  if (!request.data || !request.dataArray) {
    return [null, false, null, imports];
  }

  // There's 4 ways to pass data to Requests (in descending order of preference):
  //   a or dictionary/list as the json= argument
  //   a dictionary, or a list of tuples (if the dictionary would have duplicate keys) as the data= argument
  //   a string as data=
  //   bytes as data=

  // We can pass json= if the data is valid JSON and we've specified json in the
  // Content-Type header because passing json= will set that header.
  //
  // However, if there will be a mismatch between how the JSON is formatted
  // we need to output a commented out version of the request with data= as well.
  // This can happen when there's extra whitespace in the original data or
  // because the JSON contains numbers that are too big to be stored in
  // JavaScript or because there's objects with duplicate keys.
  const contentType = request.headers.get("content-type");
  let dataAsJson: string | null = null;
  let jsonRoundtrips = false;
  if (
    request.dataArray.length === 1 &&
    contentType &&
    contentType.split(";")[0].toString().trim() === "application/json"
  ) {
    [dataAsJson, jsonRoundtrips] = formatDataAsJson(
      request.dataArray[0],
      imports,
      osVars,
    );
  }
  if (jsonRoundtrips) {
    return [null, false, dataAsJson, imports];
  }

  // data= can't be a dict or a list of tuples (i.e. entries) when
  //   there is a @file from --data, --data-binary or --json (because they can contain an '&' which would get escaped)
  //   there is a --data-urlencode without a name= or name@
  //   if you split the input on & and there's a value that doesn't contain an = (e.g. --data "foo=bar&" or simply --data "&")
  //   there is a name or value that doesn't roundtrip through percent encoding
  const dataAsEntries = formatDataAsEntries(request.dataArray, osVars, imports);
  if (dataAsEntries !== null) {
    const [dataEntries, percentWarn] = dataAsEntries;
    if (
      eq(
        request.headers.get("content-type"),
        "application/x-www-form-urlencoded",
      ) &&
      request.headers.length === 1
    ) {
      // Requests adds the header when you include a body
      // so if it's the only header, don't print the headers
      request.headers.delete("content-type");
    }
    if (percentWarn) {
      warnings.push([
        "percent-encoded-spaces-in-data",
        'data contains spaces encoded by curl as "%20" which will be sent as "+" instead: ' +
          JSON.stringify(percentWarn),
      ]);
    }
    return [dataEntries, false, dataAsJson, imports];
  }

  const [dataAsString, shouldEncode] = formatDataAsStr(
    request.dataArray,
    imports,
    osVars,
  );
  return [dataAsString, shouldEncode, dataAsJson, imports];
}

function getFilesString(
  request: Request,
  osVars: OSVars,
  imports: Set<string>,
): [string, boolean] {
  let usesStdin = false;
  if (!request.multipartUploads) {
    return ["", usesStdin];
  }

  const multipartUploads = request.multipartUploads.map((m) => {
    // https://github.com/psf/requests/blob/2d5517682b3b38547634d153cea43d48fbc8cdb5/requests/models.py#L117
    //
    // Requests's multipart syntax looks like this:
    // name/filename: content
    // name: open(filename/contentFile)
    // name: (filename, open(contentFile)[, contentType[, headers]]))
    const name = m.name ? repr(m.name, osVars, imports) : "None";

    if (!("contentType" in m) && !("headers" in m) && !("encoder" in m)) {
      if (
        "contentFile" in m &&
        eq(m.contentFile, m.filename) &&
        !eq(m.contentFile, "-")
      ) {
        return [
          name,
          "open(" +
            repr(m.contentFile, osVars, imports, false, true) +
            ", 'rb')",
        ];
      }
      if ("content" in m && "filename" in m && eq(m.name, m.filename)) {
        return [name, repr(m.content, osVars, imports)];
      }
    }

    const sentFilename =
      "filename" in m && m.filename
        ? repr(m.filename, osVars, imports)
        : "None";
    const tuple = [sentFilename];
    if ("contentFile" in m) {
      if (eq(m.contentFile, "-")) {
        // TODO: use piped stdin if we have it
        usesStdin = true;
        tuple.push("sys.stdin.buffer.read())");
      } else {
        tuple.push(
          "open(" +
            repr(m.contentFile, osVars, imports, false, true) +
            ", 'rb')",
        );
      }
    } else {
      tuple.push(repr(m.content, osVars, imports));
    }
    let addedContentType = false;
    if ("contentType" in m && m.contentType) {
      tuple.push(repr(m.contentType, osVars, imports));
      addedContentType = true;
    }
    if (
      ("headers" in m && m.headers) ||
      ("headerFiles" in m && m.headerFiles)
    ) {
      if (!addedContentType) {
        tuple.push("None");
      }

      const headerArg = [];
      if (m.headers) {
        let headerDict = "{";
        for (const header of m.headers) {
          // TODO: can have multiple headers in one headers= argument?
          const [name, value] = header.split(":", 2);
          headerDict +=
            repr(name, osVars, imports) +
            ": " +
            repr(value.trimStart() || new Word(), osVars, imports) +
            ", ";
        }
        if (headerDict.endsWith(", ")) {
          headerDict = headerDict.slice(0, -2);
        }
        headerDict += "}";
        headerArg.push(headerDict);
      }
      if (m.headerFiles && m.headerFiles.length) {
        for (const headerFile of m.headerFiles) {
          headerArg.push(
            "read_headerfile(" +
              repr(headerFile, osVars, imports, false, true) +
              ")",
          );
        }
        imports.add("read_headerfile");
      }
      tuple.push(headerArg.join(" | "));
    }
    return [name, "(" + tuple.join(", ") + ")"];
  });

  const multipartUploadsAsDict = Object.fromEntries(multipartUploads);

  let filesString = "files = ";
  if (Object.keys(multipartUploadsAsDict).length === multipartUploads.length) {
    filesString += "{\n";
    for (const [multipartKey, multipartValue] of multipartUploads) {
      filesString += "    " + multipartKey + ": " + multipartValue + ",\n";
    }
    filesString += "}\n";
  } else {
    filesString += "[\n";
    for (const [multipartKey, multipartValue] of multipartUploads) {
      filesString += "    (" + multipartKey + ", " + multipartValue + "),\n";
    }
    filesString += "]\n";
  }

  return [filesString, usesStdin];
}

// Don't add indent/comment characters to empty lines, most importantly the last line
// which will be empty when there's a trailing newline.
function indent(s: string, level: number) {
  if (level === 0) {
    return s;
  }
  const begin = "    ".repeat(level);
  return s
    .split("\n")
    .map((l) => (l.trim() ? begin + l : l))
    .join("\n");
}
function commentOut(s: string) {
  return s
    .split("\n")
    .map((l) => (l.trim() ? "#" + l : l))
    .join("\n");
}

function uniqueWarn(
  seenWarnings: Set<string>,
  warnings: Warnings,
  warning: [string, string],
) {
  if (!seenWarnings.has(warning[0])) {
    seenWarnings.add(warning[0]);
    warnings.push(warning);
  }
}

function joinArgs(args: string[]) {
  let s = "(";
  if (args.join("").length < 100) {
    s += args.join(", ");
  } else {
    s += "\n";
    for (const arg of args) {
      s += "    " + arg + ",\n";
    }
  }
  return s + ")";
}

function requestToPython(
  request: Request,
  warnings: Warnings = [],
  imports: Set<string>,
  thirdPartyImports: Set<string>,
): string {
  const osVars: OSVars = {};
  const commentedOutHeaders: { [key: string]: string } = {
    // TODO: add a warning why this should be commented out?
    "accept-encoding": "",
    "content-length": "",
  };
  // https://github.com/icing/blog/blob/main/curl_on_a_weekend.md
  if (eq(request.headers.get("te"), "trailers")) {
    commentedOutHeaders.te = "Requests doesn't support trailers";
  }

  let cookieStr;
  let cookieFile: Word | null = null;
  if (request.cookies) {
    // TODO: handle duplicate cookie names
    cookieStr = "cookies = {\n";
    for (const [cookieName, cookieValue] of request.cookies) {
      cookieStr +=
        "    " +
        repr(cookieName, osVars, imports) +
        ": " +
        repr(cookieValue, osVars, imports) +
        ",\n";
    }
    cookieStr += "}\n";
    // Before Python 3.11, cookies= was sorted alphabetically
    // https://github.com/python/cpython/issues/86232
    commentedOutHeaders.cookie = "";
    if (request.cookieFiles) {
      warnings.push([
        "cookie-files",
        "passing both cookies and cookie files with --cookie/-b is not supported",
      ]);
    }
    if (request.cookieJar) {
      warnings.push([
        "cookie-files",
        "passing both cookies and --cookie-jar/-c is not supported",
      ]);
    }
  } else if (
    (request.cookieFiles && request.cookieFiles.length) ||
    request.cookieJar
  ) {
    imports.add("http.cookiejar.MozillaCookieJar");
    if (request.cookieFiles && request.cookieFiles.length) {
      // TODO: what if user passes multiple cookie files?
      // TODO: what if user passes cookies and cookie files?
      cookieFile = request.cookieFiles[request.cookieFiles.length - 1];
      if (request.cookieFiles.length > 1) {
        warnings.push([
          "cookie-files",
          // TODO: curl reads all of them.
          "multiple cookie files are not supported, using the last one: " +
            JSON.stringify(cookieFile.toString()),
        ]);
      }
      // TODO: do we need to .load()?
      cookieStr =
        "cookies = MozillaCookieJar(" +
        repr(cookieFile, osVars, imports) +
        ")\n";
    } else if (request.cookieJar) {
      cookieStr = "cookies = MozillaCookieJar()\n";
    }
  }

  let proxyDict;
  if (request.proxy) {
    let proxy = request.proxy.includes("://")
      ? request.proxy
      : request.proxy.prepend("http://");
    const protocol = proxy.split("://")[0].toLowerCase();
    if (eq(protocol, "socks")) {
      // https://github.com/curl/curl/blob/curl-7_86_0/lib/url.c#L2418-L2419
      proxy = proxy.replace("socks", "socks4");
    }
    proxyDict = "proxies = {\n";
    proxyDict += "    'http': " + repr(proxy, osVars, imports) + ",\n";
    // TODO: if (protocol !== "http") { ?
    proxyDict += "    'https': " + repr(proxy, osVars, imports) + ",\n";
    proxyDict += "}\n";
  }

  let certStr;
  if (request.cert || request.key) {
    certStr = "cert = ";
    let certPart = "None";
    if (request.cert) {
      const [cert, password] = request.cert;
      certPart = repr(cert, osVars, imports);
      if (password) {
        warnings.push([
          "cert-password",
          "passing a password to --cert is not supported: " +
            JSON.stringify(password.toString()),
        ]);
      }
    }
    if (request.key) {
      certStr +=
        "(" + certPart + ", " + repr(request.key, osVars, imports) + ")";
    } else {
      certStr += certPart;
    }
    certStr += "\n";
  }

  // if there's only 1 URL, put params all together here, unless it's just one string.
  // if there's more than 1, if we have params that are added to each URL from
  // --get --data or --url-query that need to read a file, put just the shared part
  // here, then keep the query in the URL, in the URL.
  // If there's no --get --data or --url-query, then
  // put params (if it can be rendered as a list or dict) right before the requests line
  // Otherwise, keep the query in the URL.
  let paramsStr;
  let shouldEncodeParams; // TODO: necessary?
  function readsFile(paramArray: DataParam[]) {
    return paramArray.some((p) => !(p instanceof Word));
  }
  const paramArray =
    request.urls.length === 1 ? request.urls[0].queryArray : request.queryArray;
  if (
    paramArray &&
    (request.urls.length === 1 ||
      (request.urls.length > 1 && readsFile(paramArray)))
  ) {
    const queryAsEntries = formatDataAsEntries(
      paramArray,
      osVars,
      imports,
      "params",
    );
    if (queryAsEntries !== null) {
      let percentWarn;
      [paramsStr, percentWarn] = queryAsEntries;

      if (percentWarn) {
        warnings.push([
          "percent-encoded-spaces-in-query",
          // TODO: will they?
          'URL querystring contains spaces encoded as "%20" which will be sent by Requests as "+" instead: ' +
            JSON.stringify(percentWarn),
        ]);
      }
    } else if (readsFile(paramArray)) {
      [paramsStr, shouldEncodeParams] = formatDataAsStr(
        paramArray,
        imports,
        osVars,
        "params",
      );
    }
  }

  const contentType = request.headers.get("content-type");
  let dataString;
  let jsonDataString;
  let filesString;
  let shouldEncode;
  if (request.urls[0].uploadFile && request.urls.length === 1) {
    // TODO: https://docs.python-requests.org/en/latest/user/advanced/#streaming-uploads
    if (
      eq(request.urls[0].uploadFile, "-") ||
      eq(request.urls[0].uploadFile, ".")
    ) {
      dataString = "data = sys.stdin.buffer.read()\n";
      imports.add("sys");
    } else {
      dataString =
        "with open(" +
        repr(request.urls[0].uploadFile, osVars, imports, false, true) +
        ", 'rb') as f:\n";
      dataString += "    data = f.read()\n";
    }
  } else if (request.multipartUploads) {
    let usesStdin = false;
    [filesString, usesStdin] = getFilesString(request, osVars, imports);
    if (usesStdin) {
      imports.add("sys");
    }
    // If you pass files= then Requests adds this header and a `boundary`
    // If you manually pass a Content-Type header it won't set a `boundary`
    // wheras curl does, so the request will fail.
    // https://github.com/curlconverter/curlconverter/issues/248
    if (
      filesString &&
      contentType &&
      eq(contentType.trim(), "multipart/form-data") &&
      !contentType.includes("boundary=")
    ) {
      // TODO: better wording
      commentedOutHeaders["content-type"] =
        "requests won't add a boundary if this header is set when you pass files=";
    }
  } else if (request.data && !request.data.isEmpty()) {
    // !isEmpty() because passing data='' is the same as not passing data=
    // We need to set the Content-Type header in headers= and not set data=
    let dataImports: Set<string>;
    [dataString, shouldEncode, jsonDataString, dataImports] = getDataString(
      request,
      osVars,
      warnings,
    );
    dataImports.forEach(imports.add, imports);
    // Remove "Content-Type" from the headers dict
    // because Requests adds it automatically when you use json=
    if (
      jsonDataString &&
      !dataString &&
      contentType &&
      eq(contentType.trim(), "application/json")
    ) {
      commentedOutHeaders["content-type"] = "Already added when you pass json=";
    }
  }

  let headerDict;
  if (request.headers.length) {
    headerDict = formatHeaders(
      request.headers,
      commentedOutHeaders,
      osVars,
      imports,
    );
  }

  let pythonCode = "";

  if (proxyDict) {
    pythonCode += proxyDict + "\n";
  }
  if (cookieStr) {
    pythonCode += cookieStr + "\n";
  }
  if (headerDict) {
    pythonCode += headerDict + "\n";
  }
  if (paramsStr) {
    pythonCode += paramsStr + "\n";
  }
  if (certStr) {
    pythonCode += certStr + "\n";
  }
  if (jsonDataString) {
    pythonCode += jsonDataString + "\n";
  } else if (dataString) {
    pythonCode += dataString + "\n";
  } else if (filesString) {
    pythonCode += filesString + "\n";
  }

  // By default, curl doesn't follow redirects and Requests does.
  // Unless redirect behavior has been explicitly set with -L/--location/--no-location
  // or --max-redirs 0 we pretend generate code that follows redirects,
  // because adding allow_redirects=False to almost every command would be ugly
  // and it only matters when the server responds with a redirect, which isn't
  // that common.
  let followRedirects = request.followRedirects;
  let maxRedirects = undefined;
  if (request.maxRedirects !== undefined) {
    maxRedirects = asInt(request.maxRedirects, osVars, imports);
  }
  if (followRedirects === undefined) {
    followRedirects = true;

    // Users would see this warning for most commands
    // warnings.push([
    //   "--location",
    //   "Requests defaults to following redirects, curl doesn't",
    // ]);
  }
  const hasMaxRedirects =
    followRedirects &&
    maxRedirects &&
    maxRedirects !== "0" &&
    maxRedirects !== "30"; // Requests default

  // Things that vary per-url:
  // method (because --upload-file can make it PUT)
  // data= (because of --upload-file)
  // --output file
  // params= (because of the query string)
  // auth= (because the URL can have an auth string)
  const seenWarnings: Set<string> = new Set();
  const requestLines = [];
  let extraEmptyLine = false;
  for (const [urlObjIndex, urlObj] of request.urls.entries()) {
    const requestsMethods = [
      "GET",
      "HEAD",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS", // undocumented
    ];
    let fn;
    const args = [];
    const methodAsString = urlObj.method.toString();
    if (urlObj.method.isString() && requestsMethods.includes(methodAsString)) {
      fn = methodAsString.toLowerCase();
    } else {
      fn = "request";
      args.push(repr(urlObj.method, osVars, imports));

      if (
        urlObj.method.isString() &&
        methodAsString !== methodAsString.toUpperCase()
      ) {
        warnings.push([
          "method",
          "Requests will uppercase the HTTP method: " +
            JSON.stringify(methodAsString),
        ]);
      }
    }

    let urlParamsStr;
    let url = urlObj.url;
    if (request.urls.length === 1) {
      if (paramsStr) {
        url = urlObj.urlWithoutQueryArray;
      } else {
        url = urlObj.url;
      }
    } else {
      if (paramsStr) {
        url = urlObj.urlWithOriginalQuery;
      } else {
        if (urlObj.queryArray && urlObj.queryArray.length > 0) {
          const urlQueryAsEntries = formatDataAsEntries(
            urlObj.queryArray,
            osVars,
            imports,
            "params",
          );
          if (urlQueryAsEntries !== null) {
            let percentWarn;
            [urlParamsStr, percentWarn] = urlQueryAsEntries;
            url = urlObj.urlWithoutQueryArray;

            if (percentWarn) {
              warnings.push([
                "percent-encoded-spaces-in-query",
                // TODO: will they?
                'query contains spaces encoded by curl as "%20" which will be sent as "+" instead: ' +
                  JSON.stringify(percentWarn),
              ]);
            }
          } else if (readsFile(urlObj.queryArray)) {
            [urlParamsStr, shouldEncodeParams] = formatDataAsStr(
              urlObj.queryArray,
              imports,
              osVars,
              "params",
            );
            url = urlObj.urlWithoutQueryArray;
          }
        }
        // url = urlObj.url
      }
    }
    args.push(repr(url, osVars, imports));

    if (paramsStr || urlParamsStr) {
      args.push("params=params" + (shouldEncodeParams ? ".encode()" : ""));
    }
    if (cookieStr && !request.cookieJar) {
      args.push("cookies=cookies");
    }
    if (headerDict) {
      args.push("headers=headers");
    }
    if (urlObj.uploadFile) {
      if (request.urls.length > 1) {
        // If there's more than one URL we could have --data for all
        // of them and --upload-file for just one of them and we can't
        // overwrite the `data` variable in that case.
        args.push("data=file_contents");
      } else {
        args.push("data=data");
      }
    } else if (filesString) {
      args.push("files=files");
    } else if (request.data && !request.data.isEmpty()) {
      if (jsonDataString) {
        args.push("json=json_data");
      } else {
        args.push("data=data" + (shouldEncode ? ".encode()" : ""));
      }
    }
    if (proxyDict) {
      args.push("proxies=proxies");
    }
    if (certStr) {
      args.push("cert=cert");
    }
    const certOrPath = request.cacert || request.capath;
    if (request.insecure) {
      args.push("verify=False");
    } else if (certOrPath) {
      args.push("verify=" + repr(certOrPath, osVars, imports));
    }
    // TODO: does this header check apply to all auth methods?
    if (urlObj.auth && !request.headers.has("Authorization")) {
      const [user, password] = urlObj.auth;
      let auth =
        "(" +
        repr(user, osVars, imports) +
        ", " +
        repr(password, osVars, imports) +
        ")";
      switch (request.authType) {
        case "basic":
          break;
        case "digest":
          thirdPartyImports.add("requests.auth.HTTPDigestAuth");
          auth = "HTTPDigestAuth" + auth;
          break;
        case "ntlm":
        case "ntlm-wb":
          thirdPartyImports.add("requests_ntlm.HttpNtlmAuth");
          auth = "HttpNtlmAuth" + auth;
          // TODO: this could stop being true
          uniqueWarn(seenWarnings, warnings, [
            "ntlm",
            "requests-ntlm is unmaintained",
          ]);
          break;
        case "negotiate":
          thirdPartyImports.add("requests_gssapi.HTTPSPNEGOAuth");
          auth = "HTTPSPNEGOAuth(";
          if (request.delegation) {
            if (eq(request.delegation, "always")) {
              auth += "delegate=True";
            } else if (eq(request.delegation, "none")) {
              auth += "delegate=False";
            } else {
              uniqueWarn(seenWarnings, warnings, [
                "delegation",
                "--delegation value not supported: " +
                  JSON.stringify(request.delegation.toString()),
              ]);
            }
          }
          auth += ")";
          // TODO: use requests-kerberos instead?
          // https://star-history.com/#pythongssapi/requests-gssapi&requests/requests-kerberos
          uniqueWarn(seenWarnings, warnings, [
            "negotiate",
            "requests-gssapi is a fork of requests-kerberos",
          ]);
          break;
        case "aws-sigv4":
          thirdPartyImports.add("aws_requests_auth.aws_auth.AWSRequestsAuth");
          // TODO: move this "auth = " to separate line
          // TODO: try this.
          auth =
            "AWSRequestsAuth(aws_access_key=" +
            repr(user, osVars, imports) +
            ", aws_secret_access_key=" +
            repr(password, osVars, imports) +
            // TODO: parse
            ", aws_host=" +
            repr(request.awsSigV4 || new Word(), osVars, imports) +
            ", aws_region=" +
            repr(request.awsSigV4 || new Word(), osVars, imports) +
            ", aws_service=" +
            repr(request.awsSigV4 || new Word(), osVars, imports) +
            ")";
          uniqueWarn(seenWarnings, warnings, [
            "--aws-sigv4",
            "--aws-sigv4 value isn't parsed: " +
              JSON.stringify(
                request.awsSigV4 ? request.awsSigV4.toString() : "",
              ),
          ]);
          break;
        case "bearer":
          // Shouldn't happen because hasHeader(Authorization) should be true
          // TODO: use requests-oauthlib
          break;
      }
      args.push("auth=" + auth);
    }
    if (request.timeout || request.connectTimeout) {
      let connectTimeout = null;
      if (request.connectTimeout) {
        connectTimeout = asFloat(request.connectTimeout, osVars, imports);
      }
      let timeout = null;
      if (request.timeout) {
        if (request.timeout.isString()) {
          timeout = request.timeout.toString();
        } else {
          timeout =
            "float(" +
            repr(request.timeout, osVars, imports, false, true) +
            ")";
        }
      }

      if (timeout && connectTimeout && timeout !== connectTimeout) {
        args.push("timeout=(" + connectTimeout + ", " + timeout + ")");
      } else if (timeout) {
        args.push("timeout=" + timeout);
      } else if (connectTimeout) {
        args.push("timeout=(" + connectTimeout + ", None)");
      }

      if (timeout) {
        uniqueWarn(seenWarnings, warnings, [
          "--max-time",
          // https://requests.readthedocs.io/en/latest/user/advanced/#timeouts
          "unlike --max-time, Requests doesn't have a timeout for the whole request, only for the connect and the read",
        ]);
      }
    }

    if (!followRedirects || maxRedirects === "0") {
      args.push("allow_redirects=False");
    } else if (maxRedirects) {
      if (maxRedirects === "-1") {
        imports.add("math");
        maxRedirects = "math.inf";
      }
    }
    if (followRedirects && request.followRedirectsTrusted) {
      uniqueWarn(seenWarnings, warnings, [
        "--location-trusted",
        "Requests doesn't have an easy way to disable removing the Authorization: header on redirect",
      ]);
    }

    let requestLine = "";
    const isSession = hasMaxRedirects || request.cookieJar;
    const indentLevel = isSession ? 1 : 0;

    if (isSession && urlObjIndex === 0) {
      requestLine += "with requests.Session() as session:\n";
      if (hasMaxRedirects) {
        requestLine += `    session.max_redirects = ${maxRedirects}\n`;
      }
      if (request.cookieJar) {
        requestLine += `    session.cookies = cookies\n`;
      }
    }

    if (request.urls.length > 1) {
      if (urlParamsStr) {
        requestLine += indent(urlParamsStr, indentLevel);
      }

      if (urlObj.uploadFile) {
        let uploadFileLine = "";
        // TODO: https://docs.python-requests.org/en/latest/user/advanced/#streaming-uploads
        if (eq(urlObj.uploadFile, "-") || eq(urlObj.uploadFile, ".")) {
          uploadFileLine += "file_contents = sys.stdin.buffer.read()\n";
          imports.add("sys");
        } else {
          uploadFileLine +=
            "with open(" +
            repr(urlObj.uploadFile, osVars, imports, false, true) +
            ", 'rb') as f:\n";
          uploadFileLine += "    file_contents = f.read()\n";
        }
        requestLine += indent(uploadFileLine, indentLevel);
      }
    }

    const fnToCall =
      "response = " + (isSession ? "session" : "requests") + "." + fn;
    requestLine += indent(fnToCall + joinArgs(args) + "\n", indentLevel);

    if (jsonDataString && dataString && !urlObj.uploadFile) {
      // Adding empty lines to a "with" block breaks the code when pasted in the REPL
      requestLine += isSession || request.urls.length > 1 ? "" : "\n";

      // Should never be -1
      args[args.indexOf("json=json_data")] = shouldEncode
        ? "data=data.encode()"
        : "data=data";
      let dataAlternative =
        "# Note: json_data will not be serialized by requests\n" +
        "# exactly as it was in the original request.\n";
      dataAlternative += commentOut(dataString);
      dataAlternative += commentOut(fnToCall + joinArgs(args) + "\n");
      requestLine += indent(dataAlternative, indentLevel);
    }

    if (urlObj.output && !eq(urlObj.output, "/dev/null")) {
      let outputLine = "";
      if (eq(request.urls[0].output, "-")) {
        outputLine += "print(response.text)\n";
      } else {
        outputLine += isSession || request.urls.length > 1 ? "" : "\n";

        outputLine +=
          "with open(" +
          repr(urlObj.output, osVars, imports, false, true) +
          ", 'wb') as f:\n";
        outputLine += "    f.write(response.content)\n";
      }
      requestLine += indent(outputLine, indentLevel);
    }

    if (
      !isSession &&
      // request.urls.length > 1 &&
      (urlParamsStr ||
        (dataString && jsonDataString) ||
        urlObj.uploadFile ||
        (urlObj.output && !eq(urlObj.output, "/dev/null")))
    ) {
      extraEmptyLine = true;
    }
    requestLines.push(requestLine);
  }

  pythonCode += requestLines.join(extraEmptyLine ? "\n" : "");

  if (request.cookieJar) {
    let cookieSaveLine = "cookies.save(";
    if (!eq(request.cookieJar, cookieFile)) {
      cookieSaveLine += repr(request.cookieJar, osVars, imports) + ", ";
    }
    cookieSaveLine += "ignore_discard=True, ignore_expires=True)\n"; // TODO: necessary?
    pythonCode += indent(cookieSaveLine, 1);
  }

  if (request.http3) {
    warnings.push([
      "http3",
      "this was an HTTP/3 request but requests only supports HTTP/1.1",
    ]);
  } else if (request.http2) {
    warnings.push([
      "http2",
      "this was an HTTP/2 request but requests only supports HTTP/1.1",
    ]);
  } else if (request.headers.lowercase && request.headers.length > 1) {
    warnings.push([
      "--header",
      "all the --header/-H names are lowercase, which means this may have been an HTTP/2 or HTTP/3 request. Requests only sends HTTP/1.1",
    ]);
  }

  // It would be more correct to run the commands whenever we need
  // their values instead of running them all at the beginning.
  let variableCode = "";
  if (Object.keys(osVars).length) {
    for (const [varName, expr] of Object.entries(osVars)) {
      variableCode += `${varName} = ${expr}\n`;
    }
    variableCode += "\n";
  }

  return variableCode + pythonCode;
}

export function printImports(imps: Set<string>): string {
  let s = "";
  for (const imp of Array.from(imps).sort()) {
    if (imp === "read_headerfile") {
      continue;
    }
    if (imp.includes(".")) {
      const pos = imp.lastIndexOf(".");
      const module = imp.slice(0, pos);
      const name = imp.slice(pos + 1);
      s += "from " + module + " import " + name + "\n";
    } else {
      s += "import " + imp + "\n";
    }
  }
  return s;
}

export function _toPython(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const code = [];
  let joinTwoLines = false;
  const imports = new Set<string>();
  const thirdPartyImports = new Set<string>();
  for (const request of requests) {
    const requestCode = requestToPython(
      request,
      warnings,
      imports,
      thirdPartyImports,
    );
    code.push(requestCode);

    // If one of the requests defines variables (or its URL is very long),
    // separate all the configs with two empty lines.
    // curl example.com --next example.com
    // vs.
    // curl --data "foo=bar" example.com --next example.com
    // (+1 for the trailing newline)
    joinTwoLines ||= requestCode.split("\n").length > request.urls.length + 1;
  }

  let importCode = "";
  importCode += printImports(imports);
  if (imports.size > 1) {
    importCode += "\n";
  }
  importCode += "import requests\n";
  importCode += printImports(thirdPartyImports);
  importCode += "\n";
  if (imports.has("read_headerfile")) {
    importCode += "def read_headerfile(filename):\n";
    importCode += "    headers = {}\n";
    importCode += "    with open(filename) as f:\n";
    importCode += "        for line in f:\n";
    importCode += "            line = line.split('#', 1)[0].strip()\n";
    importCode += "            if line:\n";
    importCode += "                [key, value] = line.split(':', 1)\n";
    importCode += "                value = value or ''\n";
    importCode += "                headers[key.strip()] = value.strip()\n";
    importCode += "    return headers\n";
    importCode += "\n";
  }

  return importCode + code.join(joinTwoLines ? "\n\n" : "\n");
}

export function toPythonWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const python = _toPython(requests, warnings);
  return [python, warnings];
}

export function toPython(curlCommand: string | string[]): string {
  return toPythonWarn(curlCommand)[0];
}
