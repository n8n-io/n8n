"use strict";
module.exports = newSuite;

var benchmark = require("benchmark"),
    chalk     = require("chalk");

var padSize = 27;

function newSuite(name) {
    var benches = [];
    return new benchmark.Suite(name)
    .on("add", function(event) {
        benches.push(event.target);
    })
    .on("start", function() {
        process.stdout.write("benchmarking " + name + " performance ...\n\n");
    })
    .on("cycle", function(event) {
        process.stdout.write(String(event.target) + "\n");
    })
    .on("complete", function() {
        if (benches.length > 1) {
            var fastest = this.filter("fastest"), // eslint-disable-line no-invalid-this
                fastestHz = getHz(fastest[0]);
            process.stdout.write("\n" + chalk.white(pad(fastest[0].name, padSize)) + " was " + chalk.green("fastest") + "\n");
            benches.forEach(function(bench) {
                if (fastest.indexOf(bench) === 0)
                    return;
                var hz = hz = getHz(bench);
                var percent = (1 - hz / fastestHz) * 100;
                process.stdout.write(chalk.white(pad(bench.name, padSize)) + " was " + chalk.red(percent.toFixed(1) + "% slower") + "\n");
            });
        }
        process.stdout.write("\n");
    });
}

function getHz(bench) {
    return 1 / (bench.stats.mean + bench.stats.moe);
}

function pad(str, len, l) {
    while (str.length < len)
        str = l ? str + " " : " " + str;
    return str;
}
