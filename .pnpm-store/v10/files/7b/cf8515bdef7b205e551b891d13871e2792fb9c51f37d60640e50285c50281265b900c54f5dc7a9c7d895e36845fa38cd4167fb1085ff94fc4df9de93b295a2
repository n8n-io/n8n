"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCryptoKey = void 0;
const crypto = require("crypto");
const util = require("util");
const webcrypto = crypto.webcrypto;
exports.default = webcrypto;
exports.isCryptoKey = util.types.isCryptoKey
    ? (key) => util.types.isCryptoKey(key)
    :
        (key) => false;
