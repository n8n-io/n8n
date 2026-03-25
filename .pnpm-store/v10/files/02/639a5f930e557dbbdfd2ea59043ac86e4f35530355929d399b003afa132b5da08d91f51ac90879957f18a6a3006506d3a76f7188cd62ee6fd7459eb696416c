"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const semver = require("semver");
const path = require("path");
const process = require("process");
const colorette_1 = require("colorette");
try {
    const { engines } = require(path.join(__dirname, '../package.json'));
    const version = engines.node;
    if (!semver.satisfies(process.version, version)) {
        process.stderr.write((0, colorette_1.yellow)(`\n⚠️ Warning: failed to satisfy expected node version. Expected: "${version}", Current "${process.version}"\n\n`));
    }
}
catch (e) {
    // Do nothing
}
