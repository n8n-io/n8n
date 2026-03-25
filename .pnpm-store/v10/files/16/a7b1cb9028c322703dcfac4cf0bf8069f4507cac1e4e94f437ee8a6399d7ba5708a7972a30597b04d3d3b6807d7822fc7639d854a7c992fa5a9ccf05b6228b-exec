#!/usr/bin/env node

var os = require("os"),
    rw = require("rw").dash,
    path = require("path"),
    iconv = require("iconv-lite"),
    commander = require("commander"),
    dsv = require("../");

var program = path.basename(process.argv[1]),
    defaultOutDelimiter = program.slice(-3) === "tsv" ? "\t" : ",";

commander
    .version(require("../package.json").version)
    .usage("[options] [file]")
    .option("-o, --out <file>", "output file name; defaults to “-” for stdout", "-")
    .option("-w, --output-delimiter <character>", "output delimiter character", defaultOutDelimiter)
    .option("-n, --newline-delimited", "accept newline-delimited JSON")
    .option("--input-encoding <encoding>", "input character encoding; defaults to “utf8”", "utf8")
    .option("--output-encoding <encoding>", "output character encoding; defaults to “utf8”", "utf8")
    .parse(process.argv);

var outFormat = dsv.dsvFormat(commander.outputDelimiter);

rw.readFile(commander.args[0] || "-", function(error, text) {
  if (error) throw error;
  text = iconv.decode(text, commander.inputEncoding);
  rw.writeFile(commander.out, iconv.encode(outFormat.format(commander.newlineDelimited
      ? text.trim().split(/\r?\n/g).map(function(line) { return JSON.parse(line); })
      : JSON.parse(text)) + os.EOL, commander.outputEncoding), function(error) {
    if (error) throw error;
  });
});
