#!/usr/bin/env node

// This script should reprint the contents of the given file without
// reusing the original source, but with identical AST structure.

var recast = require("recast");

recast.run(function(ast, callback) {
    recast.visit(ast, {
        visitNode: function(path) {
            this.traverse(path);
            path.node.original = null;
        }
    });

    callback(ast);
});
