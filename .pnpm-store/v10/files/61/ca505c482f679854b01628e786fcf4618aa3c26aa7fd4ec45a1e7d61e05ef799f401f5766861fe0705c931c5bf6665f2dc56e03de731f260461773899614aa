// src/utils/basic-auth.ts
import { decodeBase64 } from "./encode.js";
var CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;
var USER_PASS_REGEXP = /^([^:]*):(.*)$/;
var utf8Decoder = new TextDecoder();
var auth = (req) => {
  const match = CREDENTIALS_REGEXP.exec(req.headers.get("Authorization") || "");
  if (!match) {
    return void 0;
  }
  let userPass = void 0;
  try {
    userPass = USER_PASS_REGEXP.exec(utf8Decoder.decode(decodeBase64(match[1])));
  } catch {
  }
  if (!userPass) {
    return void 0;
  }
  return { username: userPass[1], password: userPass[2] };
};
export {
  auth
};
