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
var types_exports = {};
__export(types_exports, {
  CryptoKeyUsage: () => CryptoKeyUsage,
  JwtAlgorithmMismatch: () => JwtAlgorithmMismatch,
  JwtAlgorithmNotAllowed: () => JwtAlgorithmNotAllowed,
  JwtAlgorithmNotImplemented: () => JwtAlgorithmNotImplemented,
  JwtAlgorithmRequired: () => JwtAlgorithmRequired,
  JwtHeaderInvalid: () => JwtHeaderInvalid,
  JwtHeaderRequiresKid: () => JwtHeaderRequiresKid,
  JwtPayloadRequiresAud: () => JwtPayloadRequiresAud,
  JwtSymmetricAlgorithmNotAllowed: () => JwtSymmetricAlgorithmNotAllowed,
  JwtTokenAudience: () => JwtTokenAudience,
  JwtTokenExpired: () => JwtTokenExpired,
  JwtTokenInvalid: () => JwtTokenInvalid,
  JwtTokenIssuedAt: () => JwtTokenIssuedAt,
  JwtTokenIssuer: () => JwtTokenIssuer,
  JwtTokenNotBefore: () => JwtTokenNotBefore,
  JwtTokenSignatureMismatched: () => JwtTokenSignatureMismatched
});
module.exports = __toCommonJS(types_exports);
class JwtAlgorithmNotImplemented extends Error {
  constructor(alg) {
    super(`${alg} is not an implemented algorithm`);
    this.name = "JwtAlgorithmNotImplemented";
  }
}
class JwtAlgorithmRequired extends Error {
  constructor() {
    super('JWT verification requires "alg" option to be specified');
    this.name = "JwtAlgorithmRequired";
  }
}
class JwtAlgorithmMismatch extends Error {
  constructor(expected, actual) {
    super(`JWT algorithm mismatch: expected "${expected}", got "${actual}"`);
    this.name = "JwtAlgorithmMismatch";
  }
}
class JwtTokenInvalid extends Error {
  constructor(token) {
    super(`invalid JWT token: ${token}`);
    this.name = "JwtTokenInvalid";
  }
}
class JwtTokenNotBefore extends Error {
  constructor(token) {
    super(`token (${token}) is being used before it's valid`);
    this.name = "JwtTokenNotBefore";
  }
}
class JwtTokenExpired extends Error {
  constructor(token) {
    super(`token (${token}) expired`);
    this.name = "JwtTokenExpired";
  }
}
class JwtTokenIssuedAt extends Error {
  constructor(currentTimestamp, iat) {
    super(
      `Invalid "iat" claim, must be a valid number lower than "${currentTimestamp}" (iat: "${iat}")`
    );
    this.name = "JwtTokenIssuedAt";
  }
}
class JwtTokenIssuer extends Error {
  constructor(expected, iss) {
    super(`expected issuer "${expected}", got ${iss ? `"${iss}"` : "none"} `);
    this.name = "JwtTokenIssuer";
  }
}
class JwtHeaderInvalid extends Error {
  constructor(header) {
    super(`jwt header is invalid: ${JSON.stringify(header)}`);
    this.name = "JwtHeaderInvalid";
  }
}
class JwtHeaderRequiresKid extends Error {
  constructor(header) {
    super(`required "kid" in jwt header: ${JSON.stringify(header)}`);
    this.name = "JwtHeaderRequiresKid";
  }
}
class JwtSymmetricAlgorithmNotAllowed extends Error {
  constructor(alg) {
    super(`symmetric algorithm "${alg}" is not allowed for JWK verification`);
    this.name = "JwtSymmetricAlgorithmNotAllowed";
  }
}
class JwtAlgorithmNotAllowed extends Error {
  constructor(alg, allowedAlgorithms) {
    super(`algorithm "${alg}" is not in the allowed list: [${allowedAlgorithms.join(", ")}]`);
    this.name = "JwtAlgorithmNotAllowed";
  }
}
class JwtTokenSignatureMismatched extends Error {
  constructor(token) {
    super(`token(${token}) signature mismatched`);
    this.name = "JwtTokenSignatureMismatched";
  }
}
class JwtPayloadRequiresAud extends Error {
  constructor(payload) {
    super(`required "aud" in jwt payload: ${JSON.stringify(payload)}`);
    this.name = "JwtPayloadRequiresAud";
  }
}
class JwtTokenAudience extends Error {
  constructor(expected, aud) {
    super(
      `expected audience "${Array.isArray(expected) ? expected.join(", ") : expected}", got "${aud}"`
    );
    this.name = "JwtTokenAudience";
  }
}
var CryptoKeyUsage = /* @__PURE__ */ ((CryptoKeyUsage2) => {
  CryptoKeyUsage2["Encrypt"] = "encrypt";
  CryptoKeyUsage2["Decrypt"] = "decrypt";
  CryptoKeyUsage2["Sign"] = "sign";
  CryptoKeyUsage2["Verify"] = "verify";
  CryptoKeyUsage2["DeriveKey"] = "deriveKey";
  CryptoKeyUsage2["DeriveBits"] = "deriveBits";
  CryptoKeyUsage2["WrapKey"] = "wrapKey";
  CryptoKeyUsage2["UnwrapKey"] = "unwrapKey";
  return CryptoKeyUsage2;
})(CryptoKeyUsage || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CryptoKeyUsage,
  JwtAlgorithmMismatch,
  JwtAlgorithmNotAllowed,
  JwtAlgorithmNotImplemented,
  JwtAlgorithmRequired,
  JwtHeaderInvalid,
  JwtHeaderRequiresKid,
  JwtPayloadRequiresAud,
  JwtSymmetricAlgorithmNotAllowed,
  JwtTokenAudience,
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenIssuer,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched
});
