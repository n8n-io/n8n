"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSSOTokenFromFile = exports.tokenIntercept = void 0;
const promises_1 = require("fs/promises");
const getSSOTokenFilepath_1 = require("./getSSOTokenFilepath");
exports.tokenIntercept = {};
const getSSOTokenFromFile = async (id) => {
    if (exports.tokenIntercept[id]) {
        return exports.tokenIntercept[id];
    }
    const ssoTokenFilepath = (0, getSSOTokenFilepath_1.getSSOTokenFilepath)(id);
    const ssoTokenText = await (0, promises_1.readFile)(ssoTokenFilepath, "utf8");
    return JSON.parse(ssoTokenText);
};
exports.getSSOTokenFromFile = getSSOTokenFromFile;
