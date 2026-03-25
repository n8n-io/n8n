"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SignatureV4MultiRegion: () => SignatureV4MultiRegion,
  signatureV4CrtContainer: () => signatureV4CrtContainer
});
module.exports = __toCommonJS(index_exports);

// src/SignatureV4MultiRegion.ts
var import_middleware_sdk_s3 = require("@aws-sdk/middleware-sdk-s3");
var import_signature_v4 = require("@smithy/signature-v4");

// src/signature-v4-crt-container.ts
var signatureV4CrtContainer = {
  CrtSignerV4: null
};

// src/SignatureV4MultiRegion.ts
var SignatureV4MultiRegion = class {
  static {
    __name(this, "SignatureV4MultiRegion");
  }
  sigv4aSigner;
  sigv4Signer;
  signerOptions;
  constructor(options) {
    this.sigv4Signer = new import_middleware_sdk_s3.SignatureV4S3Express(options);
    this.signerOptions = options;
  }
  async sign(requestToSign, options = {}) {
    if (options.signingRegion === "*") {
      return this.getSigv4aSigner().sign(requestToSign, options);
    }
    return this.sigv4Signer.sign(requestToSign, options);
  }
  /**
   * Sign with alternate credentials to the ones provided in the constructor.
   * Note: This is only supported for SigV4a when using the CRT implementation.
   */
  async signWithCredentials(requestToSign, credentials, options = {}) {
    if (options.signingRegion === "*") {
      const signer = this.getSigv4aSigner();
      const CrtSignerV4 = signatureV4CrtContainer.CrtSignerV4;
      if (CrtSignerV4 && signer instanceof CrtSignerV4) {
        return signer.signWithCredentials(requestToSign, credentials, options);
      } else {
        throw new Error(
          `signWithCredentials with signingRegion '*' is only supported when using the CRT dependency @aws-sdk/signature-v4-crt. Please check whether you have installed the "@aws-sdk/signature-v4-crt" package explicitly. You must also register the package by calling [require("@aws-sdk/signature-v4-crt");] or an ESM equivalent such as [import "@aws-sdk/signature-v4-crt";]. For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt`
        );
      }
    }
    return this.sigv4Signer.signWithCredentials(requestToSign, credentials, options);
  }
  /**
   * Presign a request.
   * Note: This is only supported for SigV4a when using the CRT implementation.
   */
  async presign(originalRequest, options = {}) {
    if (options.signingRegion === "*") {
      const signer = this.getSigv4aSigner();
      const CrtSignerV4 = signatureV4CrtContainer.CrtSignerV4;
      if (CrtSignerV4 && signer instanceof CrtSignerV4) {
        return signer.presign(originalRequest, options);
      } else {
        throw new Error(
          `presign with signingRegion '*' is only supported when using the CRT dependency @aws-sdk/signature-v4-crt. Please check whether you have installed the "@aws-sdk/signature-v4-crt" package explicitly. You must also register the package by calling [require("@aws-sdk/signature-v4-crt");] or an ESM equivalent such as [import "@aws-sdk/signature-v4-crt";]. For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt`
        );
      }
    }
    return this.sigv4Signer.presign(originalRequest, options);
  }
  async presignWithCredentials(originalRequest, credentials, options = {}) {
    if (options.signingRegion === "*") {
      throw new Error("Method presignWithCredentials is not supported for [signingRegion=*].");
    }
    return this.sigv4Signer.presignWithCredentials(originalRequest, credentials, options);
  }
  getSigv4aSigner() {
    if (!this.sigv4aSigner) {
      const CrtSignerV4 = signatureV4CrtContainer.CrtSignerV4;
      const JsSigV4aSigner = import_signature_v4.signatureV4aContainer.SignatureV4a;
      if (this.signerOptions.runtime === "node") {
        if (!CrtSignerV4 && !JsSigV4aSigner) {
          throw new Error(
            "Neither CRT nor JS SigV4a implementation is available. Please load either @aws-sdk/signature-v4-crt or @aws-sdk/signature-v4a. For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt"
          );
        }
        if (CrtSignerV4 && typeof CrtSignerV4 === "function") {
          this.sigv4aSigner = new CrtSignerV4({
            ...this.signerOptions,
            signingAlgorithm: 1
          });
        } else if (JsSigV4aSigner && typeof JsSigV4aSigner === "function") {
          this.sigv4aSigner = new JsSigV4aSigner({
            ...this.signerOptions
          });
        } else {
          throw new Error(
            "Available SigV4a implementation is not a valid constructor. Please ensure you've properly imported @aws-sdk/signature-v4-crt or @aws-sdk/signature-v4a.For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt"
          );
        }
      } else {
        if (!JsSigV4aSigner || typeof JsSigV4aSigner !== "function") {
          throw new Error(
            "JS SigV4a implementation is not available or not a valid constructor. Please check whether you have installed the @aws-sdk/signature-v4a package explicitly. The CRT implementation is not available for browsers. You must also register the package by calling [require('@aws-sdk/signature-v4a');] or an ESM equivalent such as [import '@aws-sdk/signature-v4a';]. For more information please go to https://github.com/aws/aws-sdk-js-v3#using-javascript-non-crt-implementation-of-sigv4a"
          );
        }
        this.sigv4aSigner = new JsSigV4aSigner({
          ...this.signerOptions
        });
      }
    }
    return this.sigv4aSigner;
  }
};
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  SignatureV4MultiRegion,
  signatureV4CrtContainer
});

