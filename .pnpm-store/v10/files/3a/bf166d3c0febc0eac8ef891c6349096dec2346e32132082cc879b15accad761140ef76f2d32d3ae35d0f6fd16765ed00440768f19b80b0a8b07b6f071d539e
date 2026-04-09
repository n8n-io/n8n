#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("node:fs");
const constants_1 = require("./constants");
const index_js_1 = require("./index.js");
function readCwdPackage(packageName, packageVersion) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(constants_1.PACKAGE_JSON, 'utf8'));
        if (packageJson.name === packageName &&
            packageJson.version === packageVersion) {
            return packageJson;
        }
    }
    catch { }
}
const packageName = process.argv[2];
const packageVersion = process.argv[3];
const checkVersion = ['1', 'check', 'true', 'yes'].includes(process.argv[4]);
const packageJson = readCwdPackage(packageName, packageVersion);
if (packageJson) {
    void (0, index_js_1.checkAndPreparePackage)(packageJson, checkVersion);
}
else {
    void (0, index_js_1.checkAndPreparePackage)(packageName, packageVersion, checkVersion);
}
//# sourceMappingURL=cli.js.map