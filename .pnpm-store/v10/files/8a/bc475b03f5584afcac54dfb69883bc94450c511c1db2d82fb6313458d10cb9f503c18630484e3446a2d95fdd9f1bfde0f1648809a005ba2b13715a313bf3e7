"use strict";

var path = require("path"),
    fs   = require("fs"),
    pkg  = require(path.join(__dirname, "..", "package.json"));

// check version scheme used by dependents
if (!pkg.versionScheme)
    return;

var warn = process.stderr.isTTY
    ? "\x1b[30m\x1b[43mWARN\x1b[0m \x1b[35m" + path.basename(process.argv[1], ".js") + "\x1b[0m"
    : "WARN " + path.basename(process.argv[1], ".js");

var basePkg;
try {
    basePkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json")));
} catch (e) {
    return;
}

[
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies"
]
.forEach(function(check) {
    var version = basePkg && basePkg[check] && basePkg[check][pkg.name];
    if (typeof version === "string" && version.charAt(0) !== pkg.versionScheme)
        process.stderr.write(pkg.name + " " + warn + " " + pkg.name + "@" + version + " is configured as a dependency of " + basePkg.name + ". use " + pkg.name + "@" + pkg.versionScheme + version.substring(1) + " instead for API compatibility.\n");
});
