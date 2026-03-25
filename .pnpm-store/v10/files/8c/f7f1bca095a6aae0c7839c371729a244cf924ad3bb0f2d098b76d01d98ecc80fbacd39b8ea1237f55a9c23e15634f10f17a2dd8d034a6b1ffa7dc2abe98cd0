import { Word, eq } from "./shell/Word.js";
import { UTF8encoder } from "./utils.js";

export type QueryList = Array<[Word, Word]>;
export type QueryDict = Array<[Word, Word | Array<Word>]>;

// Can't have a QueryDict without a QueryList
export type Query = [QueryList, QueryDict | null] | [null, null];

// Match Python's urllib.parse.quote() behavior
// https://github.com/python/cpython/blob/3.11/Lib/urllib/parse.py#L826
// curl and Python let you send non-ASCII characters by encoding each UTF-8 byte.
// TODO: ignore hex case?
function _percentEncode(s: string): string {
  return [...UTF8encoder.encode(s)]
    .map((b) => {
      if (
        // A-Z
        (b >= 0x41 && b <= 0x5a) ||
        // a-z
        (b >= 0x61 && b <= 0x7a) ||
        // 0-9
        (b >= 0x30 && b <= 0x39) ||
        // -._~
        b === 0x2d ||
        b === 0x2e ||
        b === 0x5f ||
        b === 0x7e
      ) {
        return String.fromCharCode(b);
      }
      return "%" + b.toString(16).toUpperCase().padStart(2, "0");
    })
    .join("");
}

export function percentEncode(s: Word): Word {
  const newTokens = [];
  for (const token of s.tokens) {
    if (typeof token === "string") {
      newTokens.push(_percentEncode(token));
    } else {
      newTokens.push(token);
    }
  }
  return new Word(newTokens);
}
export function percentEncodePlus(s: Word): Word {
  const newTokens = [];
  for (const token of s.tokens) {
    if (typeof token === "string") {
      newTokens.push(_percentEncode(token).replace(/%20/g, "+"));
    } else {
      newTokens.push(token);
    }
  }
  return new Word(newTokens);
}

// Reimplements decodeURIComponent but ignores variables/commands
export function wordDecodeURIComponent(s: Word): Word {
  const newTokens = [];
  for (const token of s.tokens) {
    if (typeof token === "string") {
      newTokens.push(decodeURIComponent(token));
    } else {
      newTokens.push(token);
    }
  }
  return new Word(newTokens);
}

// if url is 'example.com?' the s is ''
// if url is 'example.com'  the s is null
export function parseQueryString(s: Word | null): Query {
  if (!s || s.isEmpty()) {
    return [null, null];
  }

  const asList: QueryList = [];
  for (const param of s.split("&")) {
    // Most software libraries don't let you distinguish between a=&b= and a&b,
    // so if we get an `a&b`-type query string, don't bother.
    if (!param.includes("=")) {
      return [null, null];
    }

    const [key, val] = param.split("=", 2);
    let decodedKey;
    let decodedVal;
    try {
      // https://url.spec.whatwg.org/#urlencoded-parsing
      // recommends replacing + with space before decoding.
      decodedKey = wordDecodeURIComponent(key.replace(/\+/g, " "));
      decodedVal = wordDecodeURIComponent(val.replace(/\+/g, " "));
    } catch (e) {
      if (e instanceof URIError) {
        // Query string contains invalid percent encoded characters,
        // we cannot properly convert it.
        return [null, null];
      }
      throw e;
    }
    // If the query string doesn't round-trip, we cannot properly convert it.
    // TODO: this is a bit Python-specific, ideally we would check how each runtime/library
    // percent-encodes query strings. For example, a %27 character in the input query
    // string will be decoded to a ' but won't be re-encoded into a %27 by encodeURIComponent
    const roundTripKey = percentEncode(decodedKey);
    const roundTripVal = percentEncode(decodedVal);
    // If the original data used %20 instead of + (what requests will send), that's close enough
    if (
      (!eq(roundTripKey, key) && !eq(roundTripKey.replace(/%20/g, "+"), key)) ||
      (!eq(roundTripVal, val) && !eq(roundTripVal.replace(/%20/g, "+"), val))
    ) {
      return [null, null];
    }
    asList.push([decodedKey, decodedVal]);
  }

  // Group keys
  const keyWords: { [key: string]: Word } = {};
  const uniqueKeys: { [key: string]: Array<Word> } = {};
  let prevKey = null;
  for (const [key, val] of asList) {
    const keyStr = key.toString(); // TODO: do this better
    if (prevKey === keyStr) {
      uniqueKeys[keyStr].push(val);
    } else if (!Object.prototype.hasOwnProperty.call(uniqueKeys, keyStr)) {
      uniqueKeys[keyStr] = [val];
      keyWords[keyStr] = key;
    } else {
      // If there's a repeated key with a different key between
      // one of its repetitions, there is no way to represent
      // this query string as a dictionary.
      return [asList, null];
    }
    prevKey = keyStr;
  }

  // Convert lists with 1 element to the element
  const asDict: QueryDict = [];
  for (const [keyStr, val] of Object.entries(uniqueKeys)) {
    asDict.push([keyWords[keyStr], val.length === 1 ? val[0] : val]);
  }

  return [asList, asDict];
}
