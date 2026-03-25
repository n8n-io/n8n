var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var jwt_exports = {};
__export(jwt_exports, {
  decode: () => decode,
  decodeHeader: () => decodeHeader,
  isTokenHeader: () => isTokenHeader,
  sign: () => sign,
  verify: () => verify,
  verifyWithJwks: () => verifyWithJwks
});
module.exports = __toCommonJS(jwt_exports);
var import_encode = require("../../utils/encode");
var import_jwa = require("./jwa");
var import_jws = require("./jws");
var import_types = require("./types");
var import_utf8 = require("./utf8");
const encodeJwtPart = (part) => (0, import_encode.encodeBase64Url)(import_utf8.utf8Encoder.encode(JSON.stringify(part)).buffer).replace(/=/g, "");
const encodeSignaturePart = (buf) => (0, import_encode.encodeBase64Url)(buf).replace(/=/g, "");
const decodeJwtPart = (part) => JSON.parse(import_utf8.utf8Decoder.decode((0, import_encode.decodeBase64Url)(part)));
function isTokenHeader(obj) {
  if (typeof obj === "object" && obj !== null) {
    const objWithAlg = obj;
    return "alg" in objWithAlg && Object.values(import_jwa.AlgorithmTypes).includes(objWithAlg.alg) && (!("typ" in objWithAlg) || objWithAlg.typ === "JWT");
  }
  return false;
}
const sign = async (payload, privateKey, alg = "HS256") => {
  const encodedPayload = encodeJwtPart(payload);
  let encodedHeader;
  if (typeof privateKey === "object" && "alg" in privateKey) {
    alg = privateKey.alg;
    encodedHeader = encodeJwtPart({ alg, typ: "JWT", kid: privateKey.kid });
  } else {
    encodedHeader = encodeJwtPart({ alg, typ: "JWT" });
  }
  const partialToken = `${encodedHeader}.${encodedPayload}`;
  const signaturePart = await (0, import_jws.signing)(privateKey, alg, import_utf8.utf8Encoder.encode(partialToken));
  const signature = encodeSignaturePart(signaturePart);
  return `${partialToken}.${signature}`;
};
const verify = async (token, publicKey, algOrOptions) => {
  if (!algOrOptions) {
    throw new import_types.JwtAlgorithmRequired();
  }
  const {
    alg,
    iss,
    nbf = true,
    exp = true,
    iat = true,
    aud
  } = typeof algOrOptions === "string" ? { alg: algOrOptions } : algOrOptions;
  if (!alg) {
    throw new import_types.JwtAlgorithmRequired();
  }
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new import_types.JwtTokenInvalid(token);
  }
  const { header, payload } = decode(token);
  if (!isTokenHeader(header)) {
    throw new import_types.JwtHeaderInvalid(header);
  }
  if (header.alg !== alg) {
    throw new import_types.JwtAlgorithmMismatch(alg, header.alg);
  }
  const now = Math.floor(Date.now() / 1e3);
  if (nbf && payload.nbf && payload.nbf > now) {
    throw new import_types.JwtTokenNotBefore(token);
  }
  if (exp && payload.exp && payload.exp <= now) {
    throw new import_types.JwtTokenExpired(token);
  }
  if (iat && payload.iat && now < payload.iat) {
    throw new import_types.JwtTokenIssuedAt(now, payload.iat);
  }
  if (iss) {
    if (!payload.iss) {
      throw new import_types.JwtTokenIssuer(iss, null);
    }
    if (typeof iss === "string" && payload.iss !== iss) {
      throw new import_types.JwtTokenIssuer(iss, payload.iss);
    }
    if (iss instanceof RegExp && !iss.test(payload.iss)) {
      throw new import_types.JwtTokenIssuer(iss, payload.iss);
    }
  }
  if (aud) {
    if (!payload.aud) {
      throw new import_types.JwtPayloadRequiresAud(payload);
    }
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const matched = audiences.some(
      (payloadAud) => aud instanceof RegExp ? aud.test(payloadAud) : typeof aud === "string" ? payloadAud === aud : Array.isArray(aud) && aud.includes(payloadAud)
    );
    if (!matched) {
      throw new import_types.JwtTokenAudience(aud, payload.aud);
    }
  }
  const headerPayload = token.substring(0, token.lastIndexOf("."));
  const verified = await (0, import_jws.verifying)(
    publicKey,
    alg,
    (0, import_encode.decodeBase64Url)(tokenParts[2]),
    import_utf8.utf8Encoder.encode(headerPayload)
  );
  if (!verified) {
    throw new import_types.JwtTokenSignatureMismatched(token);
  }
  return payload;
};
const symmetricAlgorithms = [
  import_jwa.AlgorithmTypes.HS256,
  import_jwa.AlgorithmTypes.HS384,
  import_jwa.AlgorithmTypes.HS512
];
const verifyWithJwks = async (token, options, init) => {
  const verifyOpts = options.verification || {};
  const header = decodeHeader(token);
  if (!isTokenHeader(header)) {
    throw new import_types.JwtHeaderInvalid(header);
  }
  if (!header.kid) {
    throw new import_types.JwtHeaderRequiresKid(header);
  }
  if (symmetricAlgorithms.includes(header.alg)) {
    throw new import_types.JwtSymmetricAlgorithmNotAllowed(header.alg);
  }
  if (!options.allowedAlgorithms.includes(header.alg)) {
    throw new import_types.JwtAlgorithmNotAllowed(header.alg, options.allowedAlgorithms);
  }
  let verifyKeys = options.keys ? [...options.keys] : void 0;
  if (options.jwks_uri) {
    const response = await fetch(options.jwks_uri, init);
    if (!response.ok) {
      throw new Error(`failed to fetch JWKS from ${options.jwks_uri}`);
    }
    const data = await response.json();
    if (!data.keys) {
      throw new Error('invalid JWKS response. "keys" field is missing');
    }
    if (!Array.isArray(data.keys)) {
      throw new Error('invalid JWKS response. "keys" field is not an array');
    }
    verifyKeys ??= [];
    verifyKeys.push(...data.keys);
  } else if (!verifyKeys) {
    throw new Error('verifyWithJwks requires options for either "keys" or "jwks_uri" or both');
  }
  const matchingKey = verifyKeys.find((key) => key.kid === header.kid);
  if (!matchingKey) {
    throw new import_types.JwtTokenInvalid(token);
  }
  if (matchingKey.alg && matchingKey.alg !== header.alg) {
    throw new import_types.JwtAlgorithmMismatch(matchingKey.alg, header.alg);
  }
  return await verify(token, matchingKey, {
    alg: header.alg,
    ...verifyOpts
  });
};
const decode = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new import_types.JwtTokenInvalid(token);
  }
  try {
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    return {
      header,
      payload
    };
  } catch {
    throw new import_types.JwtTokenInvalid(token);
  }
};
const decodeHeader = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new import_types.JwtTokenInvalid(token);
  }
  try {
    return decodeJwtPart(parts[0]);
  } catch {
    throw new import_types.JwtTokenInvalid(token);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  decode,
  decodeHeader,
  isTokenHeader,
  sign,
  verify,
  verifyWithJwks
});
