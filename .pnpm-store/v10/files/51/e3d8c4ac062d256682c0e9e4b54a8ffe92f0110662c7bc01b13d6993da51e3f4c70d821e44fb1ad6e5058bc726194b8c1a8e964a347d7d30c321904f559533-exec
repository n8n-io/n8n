#!/usr/bin/env node

const {build} = require("../src/build.js")
const {resolve} = require("path")

let args = process.argv.slice(2)

if (args.length != 1) {
  console.log("Usage: cm-buildhelper src/mainfile.ts")
  process.exit(1)
}

build(resolve(args[0])).then(result => {
  if (!result) process.exit(1)
})
