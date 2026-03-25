var MetaScript = require("metascript"),
    path = require("path"),
    fs = require("fs");

var rootDir = path.join(__dirname, ".."),
    srcDir = path.join(rootDir, "src"),
    distDir = path.join(rootDir, "dist"),
    pkg = require(path.join(rootDir, "package.json")),
    filename;

var scope = {
    VERSION: pkg.version,
    ISAAC: false
};

// Make standard build
console.log("Building bcrypt.js with scope", JSON.stringify(scope, null, 2));
fs.writeFileSync(
    path.join(distDir, "bcrypt.js"),
    MetaScript.transform(fs.readFileSync(filename = path.join(srcDir, "wrap.js")), filename, scope, srcDir)
);

// Make isaac build - see: https://github.com/dcodeIO/bcrypt.js/issues/16
/* scope.ISAAC = true;
console.log("Building bcrypt-isaac.js with scope", JSON.stringify(scope, null, 2));
fs.writeFileSync(
    path.join(distDir, "bcrypt-isaac.js"),
    MetaScript.transform(fs.readFileSync(filename = path.join(srcDir, "bcrypt.js")), filename, scope, srcDir)
); */

// Update bower.json
scope = { VERSION: pkg.version };
console.log("Updating bower.json with scope", JSON.stringify(scope, null, 2));
fs.writeFileSync(
    path.join(rootDir, "bower.json"),
    MetaScript.transform(fs.readFileSync(filename = path.join(srcDir, "bower.json")), filename, scope, srcDir)
);
