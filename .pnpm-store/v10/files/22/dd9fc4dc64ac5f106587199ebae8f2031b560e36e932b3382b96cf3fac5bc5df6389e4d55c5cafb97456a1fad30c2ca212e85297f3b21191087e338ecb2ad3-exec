#!/usr/bin/env node

"use strict";

import "../tools/exit.cjs";

import fs from "fs"
import path from "path"
import program from "commander"

import { run_cli } from "../lib/cli.js"

const packageJson = {
    name: "terser",
    version: "experimental module CLI"
}

run_cli({ program, packageJson, fs, path }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
