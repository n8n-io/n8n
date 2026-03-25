"use strict";

const madge = require("madge");
const path = require("path");
const ts = require("typescript");

const DIR = "./lib";

async function main() {
    const tsconfigPath = ts.findConfigFile("./", ts.sys.fileExists);
    const tsconfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile).config;
    const parsedConfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, "./");
    const typedPaths = parsedConfig.fileNames.map(filename => path.resolve("./", filename));

    const excludeTypedPaths = path => !typedPaths.includes(path);

    const res = await madge(DIR, {
        dependencyFilter: excludeTypedPaths
    });

    const untypedLeaves = res.leaves().map(filename => path.resolve(DIR, filename)).filter(excludeTypedPaths);
    if (untypedLeaves.length) {
        console.log("Convert next:");
        console.log(untypedLeaves.join("\n"));
    } else {
        console.log("No untyped leaf dependencies found.");
        console.log("Try looking at circular dependencies, or the image to decide what to convert next:");
        const untypedCircular = res.circular().flat().map(filename => path.resolve(DIR, filename)).filter(excludeTypedPaths);
        console.log(untypedCircular.join("\n"));
    }

    const imagePath = await res.image("graph.svg");
    console.log();
    console.log("Image written to " + imagePath);
}

main();
