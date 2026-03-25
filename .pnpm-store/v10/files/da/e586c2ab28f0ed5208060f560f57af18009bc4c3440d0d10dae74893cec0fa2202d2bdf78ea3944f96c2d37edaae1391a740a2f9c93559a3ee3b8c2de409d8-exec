#!/usr/bin/env node

import fs from "fs";
import path from "path";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { fixturesDir, converters } from "../test/test-utils.js";
import type { Converter } from "../test/test-utils.js";

const curlCommandDir = path.resolve(fixturesDir, "curl_commands");

const argv = await yargs(hideBin(process.argv))
  .scriptName("gen-test")
  .usage("Usage: $0 [-l <language>] [curl_command_filename...]")
  .option("l", {
    alias: "language",
    describe:
      "the language to convert the curl command to " +
      "(`--language parser` saves parser state as JSON)",
    choices: Object.keys(converters),
    default: Object.keys(converters),
    defaultDescription: "all of them",
    demandOption: false,
    type: "string",
  })
  .option("all", {
    describe: "generate all tests for all languages",
    default: false,
    demandOption: false,
    type: "boolean",
  })
  .positional("curl_command_filename", {
    // this has no effect, it's here for --help
    describe:
      "the file to read the curl command from (or just its name without its path or file extension)",
    type: "string",
  })
  .alias("h", "help")
  .help().argv;

const languages: Converter[] = Array.isArray(argv.language)
  ? argv.language
  : [argv.language];
for (const language of languages) {
  // Create the directory if it doesn't exist
  const outDir = path.resolve(curlCommandDir, "..", language);
  if (!fs.existsSync(outDir)) {
    console.error("creating directory " + outDir);
    fs.mkdirSync(outDir);
  }
}

if (argv.all && argv._.length) {
  console.error("--all passed, ignoring names of test files");
}
const overwriteExistingOnly = !argv._.length && !argv.all;
const inFiles =
  !argv._.length || argv.all
    ? fs.readdirSync(curlCommandDir).filter((p) => p.endsWith(".sh"))
    : argv._;
const inPaths = inFiles.map((infile) => {
  // Remove path and file extension
  const filename = path.parse(infile.toString()).name;
  const testfile = path.join(curlCommandDir, filename + ".sh");
  if (!fs.existsSync(testfile)) {
    console.error("no such file: " + testfile);
    process.exit();
  }
  return testfile;
});

const printEachFile =
  inPaths.length < 10 || languages.length < Object.keys(converters).length;
let total = 0;
for (const inPath of inPaths) {
  const curl = fs.readFileSync(inPath, "utf8");
  for (const language of languages) {
    const converter = converters[language];
    const newFilename = path
      .basename(inPath)
      .replace(/\.sh$/, converter.extension);
    const outDir = path.resolve(inPath, "../..", language);
    if (!fs.existsSync(outDir)) {
      console.error("creating directory " + outDir);
      fs.mkdirSync(outDir);
    }
    const outPath = path.join(outDir, newFilename);

    let code;
    try {
      code = converter.converter(curl);
    } catch (e) {
      console.error("error converting curl command to " + language);
      console.error(inPath);
      console.error();
      console.error(curl);
      console.error();

      console.error(e);
      continue;
    }

    // Might as well generate the output to check
    if (overwriteExistingOnly && !fs.existsSync(outPath)) {
      continue;
    }

    const orig = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
    fs.writeFileSync(outPath, code);
    if (orig !== code) {
      if (printEachFile) {
        console.error("wrote to " + path.relative(fixturesDir, outPath));
      } else {
        total += 1;
      }
    }
  }
}
if (!printEachFile) {
  console.error("wrote " + total + " file" + (total === 1 ? "" : "s"));
}

// if (inPaths.length && languages.length) {
//   console.error(
//     "Please carefully check all the output for correctness before committing."
//   );
// }
