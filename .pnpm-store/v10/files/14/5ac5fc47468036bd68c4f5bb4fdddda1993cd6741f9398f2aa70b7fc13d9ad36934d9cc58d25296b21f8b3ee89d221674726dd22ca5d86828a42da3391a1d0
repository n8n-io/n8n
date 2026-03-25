"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var crypto_exports = {};
__export(crypto_exports, {
  calculateSha1: () => calculateSha1,
  createGuid: () => createGuid,
  generateSelfSignedCertificate: () => generateSelfSignedCertificate
});
module.exports = __toCommonJS(crypto_exports);
var import_crypto = __toESM(require("crypto"));
var import_assert = require("../../utils/isomorphic/assert");
function createGuid() {
  return import_crypto.default.randomBytes(16).toString("hex");
}
function calculateSha1(buffer) {
  const hash = import_crypto.default.createHash("sha1");
  hash.update(buffer);
  return hash.digest("hex");
}
function encodeBase128(value) {
  const bytes = [];
  do {
    let byte = value & 127;
    value >>>= 7;
    if (bytes.length > 0)
      byte |= 128;
    bytes.push(byte);
  } while (value > 0);
  return Buffer.from(bytes.reverse());
}
class DER {
  static encodeSequence(data) {
    return this._encode(48, Buffer.concat(data));
  }
  static encodeInteger(data) {
    (0, import_assert.assert)(data >= -128 && data <= 127);
    return this._encode(2, Buffer.from([data]));
  }
  static encodeObjectIdentifier(oid) {
    const parts = oid.split(".").map((v) => Number(v));
    const output = [encodeBase128(40 * parts[0] + parts[1])];
    for (let i = 2; i < parts.length; i++)
      output.push(encodeBase128(parts[i]));
    return this._encode(6, Buffer.concat(output));
  }
  static encodeNull() {
    return Buffer.from([5, 0]);
  }
  static encodeSet(data) {
    (0, import_assert.assert)(data.length === 1, "Only one item in the set is supported. We'd need to sort the data to support more.");
    return this._encode(49, Buffer.concat(data));
  }
  static encodeExplicitContextDependent(tag, data) {
    return this._encode(160 + tag, data);
  }
  static encodePrintableString(data) {
    return this._encode(19, Buffer.from(data));
  }
  static encodeBitString(data) {
    const unusedBits = 0;
    const content = Buffer.concat([Buffer.from([unusedBits]), data]);
    return this._encode(3, content);
  }
  static encodeDate(date) {
    const year = date.getUTCFullYear();
    const isGeneralizedTime = year >= 2050;
    const parts = [
      isGeneralizedTime ? year.toString() : year.toString().slice(-2),
      (date.getUTCMonth() + 1).toString().padStart(2, "0"),
      date.getUTCDate().toString().padStart(2, "0"),
      date.getUTCHours().toString().padStart(2, "0"),
      date.getUTCMinutes().toString().padStart(2, "0"),
      date.getUTCSeconds().toString().padStart(2, "0")
    ];
    const encodedDate = parts.join("") + "Z";
    const tag = isGeneralizedTime ? 24 : 23;
    return this._encode(tag, Buffer.from(encodedDate));
  }
  static _encode(tag, data) {
    const lengthBytes = this._encodeLength(data.length);
    return Buffer.concat([Buffer.from([tag]), lengthBytes, data]);
  }
  static _encodeLength(length) {
    if (length < 128) {
      return Buffer.from([length]);
    } else {
      const lengthBytes = [];
      while (length > 0) {
        lengthBytes.unshift(length & 255);
        length >>= 8;
      }
      return Buffer.from([128 | lengthBytes.length, ...lengthBytes]);
    }
  }
}
function generateSelfSignedCertificate() {
  const { privateKey, publicKey } = import_crypto.default.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKeyDer = publicKey.export({ type: "pkcs1", format: "der" });
  const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1e3;
  const notBefore = new Date((/* @__PURE__ */ new Date()).getTime() - oneYearInMilliseconds);
  const notAfter = new Date((/* @__PURE__ */ new Date()).getTime() + oneYearInMilliseconds);
  const tbsCertificate = DER.encodeSequence([
    DER.encodeExplicitContextDependent(0, DER.encodeInteger(1)),
    // version
    DER.encodeInteger(1),
    // serialNumber
    DER.encodeSequence([
      DER.encodeObjectIdentifier("1.2.840.113549.1.1.11"),
      // sha256WithRSAEncryption PKCS #1
      DER.encodeNull()
    ]),
    // signature
    DER.encodeSequence([
      DER.encodeSet([
        DER.encodeSequence([
          DER.encodeObjectIdentifier("2.5.4.3"),
          // commonName X.520 DN component
          DER.encodePrintableString("localhost")
        ])
      ]),
      DER.encodeSet([
        DER.encodeSequence([
          DER.encodeObjectIdentifier("2.5.4.10"),
          // organizationName X.520 DN component
          DER.encodePrintableString("Playwright Client Certificate Support")
        ])
      ])
    ]),
    // issuer
    DER.encodeSequence([
      DER.encodeDate(notBefore),
      // notBefore
      DER.encodeDate(notAfter)
      // notAfter
    ]),
    // validity
    DER.encodeSequence([
      DER.encodeSet([
        DER.encodeSequence([
          DER.encodeObjectIdentifier("2.5.4.3"),
          // commonName X.520 DN component
          DER.encodePrintableString("localhost")
        ])
      ]),
      DER.encodeSet([
        DER.encodeSequence([
          DER.encodeObjectIdentifier("2.5.4.10"),
          // organizationName X.520 DN component
          DER.encodePrintableString("Playwright Client Certificate Support")
        ])
      ])
    ]),
    // subject
    DER.encodeSequence([
      DER.encodeSequence([
        DER.encodeObjectIdentifier("1.2.840.113549.1.1.1"),
        // rsaEncryption PKCS #1
        DER.encodeNull()
      ]),
      DER.encodeBitString(publicKeyDer)
    ])
    // SubjectPublicKeyInfo
  ]);
  const signature = import_crypto.default.sign("sha256", tbsCertificate, privateKey);
  const certificate = DER.encodeSequence([
    tbsCertificate,
    DER.encodeSequence([
      DER.encodeObjectIdentifier("1.2.840.113549.1.1.11"),
      // sha256WithRSAEncryption PKCS #1
      DER.encodeNull()
    ]),
    DER.encodeBitString(signature)
  ]);
  const certPem = [
    "-----BEGIN CERTIFICATE-----",
    // Split the base64 string into lines of 64 characters
    certificate.toString("base64").match(/.{1,64}/g).join("\n"),
    "-----END CERTIFICATE-----"
  ].join("\n");
  return {
    cert: certPem,
    key: privateKey.export({ type: "pkcs1", format: "pem" })
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateSha1,
  createGuid,
  generateSelfSignedCertificate
});
