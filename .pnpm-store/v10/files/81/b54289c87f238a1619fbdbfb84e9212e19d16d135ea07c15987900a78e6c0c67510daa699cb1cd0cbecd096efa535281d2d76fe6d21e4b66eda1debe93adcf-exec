#!/usr/bin/env node

var spawn = require('child_process').spawn;
const { getExePath } = require('../get-exe');

var command_args = process.argv.slice(2);

var child = spawn(
    getExePath(),
    command_args,
    { stdio: "inherit" });

child.on('close', function (code) {
    if (code !== 0) {
        process.exit(1);
    }
});
