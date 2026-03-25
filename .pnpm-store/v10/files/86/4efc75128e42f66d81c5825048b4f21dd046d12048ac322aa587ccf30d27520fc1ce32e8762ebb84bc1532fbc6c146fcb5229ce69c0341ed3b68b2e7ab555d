"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSSOTokenFromFile = exports.tokenIntercept = void 0;
const fs_1 = require("fs");
const getSSOTokenFilepath_1 = require("./getSSOTokenFilepath");
const { readFile } = fs_1.promises;
exports.tokenIntercept = {};
const getSSOTokenFromFile = async (id) => {
    if (exports.tokenIntercept[id]) {
        return exports.tokenIntercept[id];
    }
    const ssoTokenFilepath = (0, getSSOTokenFilepath_1.getSSOTokenFilepath)(id);
    const ssoTokenText = await readFile(ssoTokenFilepath, "utf8");
    return JSON.parse(ssoTokenText);
};
exports.getSSOTokenFromFile = getSSOTokenFromFile;
