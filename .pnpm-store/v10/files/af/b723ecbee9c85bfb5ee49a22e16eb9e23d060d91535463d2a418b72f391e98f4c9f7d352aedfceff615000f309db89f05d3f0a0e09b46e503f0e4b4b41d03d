#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = function(cb, mod) {
  return function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
};

// node_modules/semver-compare/index.js
var require_semver_compare = __commonJS({
  "node_modules/semver-compare/index.js": function(exports2, module2) {
    module2.exports = function cmp(a, b) {
      var pa = a.split(".");
      var pb = b.split(".");
      for (var i = 0; i < 3; i++) {
        var na = Number(pa[i]);
        var nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
      }
      return 0;
    };
  }
});

// node_modules/please-upgrade-node/index.js
var require_please_upgrade_node = __commonJS({
  "node_modules/please-upgrade-node/index.js": function(exports2, module2) {
    var semverCompare = require_semver_compare();
    module2.exports = function pleaseUpgradeNode2(pkg, opts) {
      var opts = opts || {};
      var requiredVersion = pkg.engines.node.replace(">=", "");
      var currentVersion = process.version.replace("v", "");
      if (semverCompare(currentVersion, requiredVersion) === -1) {
        if (opts.message) {
          console.error(opts.message(requiredVersion));
        } else {
          console.error(
            pkg.name + " requires at least version " + requiredVersion + " of Node, please upgrade"
          );
        }
        if (opts.hasOwnProperty("exitCode")) {
          process.exit(opts.exitCode);
        } else {
          process.exit(1);
        }
      }
    };
  }
});

// bin/prettier.cjs
var pleaseUpgradeNode = require_please_upgrade_node();
var packageJson = require("../package.json");
pleaseUpgradeNode(packageJson);
function runCli(cli) {
  return cli.run();
}
var dynamicImport = new Function("module", "return import(module)");
var promise = dynamicImport("../internal/cli.mjs").then(runCli);
module.exports.__promise = promise;
