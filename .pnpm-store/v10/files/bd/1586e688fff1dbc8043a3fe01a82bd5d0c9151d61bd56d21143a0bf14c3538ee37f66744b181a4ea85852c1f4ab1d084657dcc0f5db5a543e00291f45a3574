"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = exports.equal = void 0;
const Serialize_1 = require("./Serialize");
const Parse_1 = require("./Parse");
__exportStar(require("./Resolve"), exports);
__exportStar(require("./Serialize"), exports);
__exportStar(require("./Parse"), exports);
function equal(uriA, uriB) {
    let processedA;
    let processedB;
    if (typeof uriA === "string") {
        processedA = (0, Serialize_1.serialize)((0, Parse_1.parse)(uriA));
    }
    else {
        processedA = (0, Serialize_1.serialize)(uriA);
    }
    if (typeof uriB === "string") {
        processedB = (0, Serialize_1.serialize)((0, Parse_1.parse)(uriB));
    }
    else {
        processedB = (0, Serialize_1.serialize)(uriB);
    }
    return processedA.toLowerCase() === processedB.toLowerCase();
}
exports.equal = equal;
function normalize(uri) {
    if (typeof uri === "string") {
        return (0, Serialize_1.serialize)((0, Parse_1.parse)(uri));
    }
    else {
        return (0, Parse_1.parse)((0, Serialize_1.serialize)(uri));
    }
}
exports.normalize = normalize;
