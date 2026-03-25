#!/usr/bin/env node
'use strict';
/*eslint-disable no-console*/
import fs from 'fs';
import { resolve } from 'path';
import {XMLParser, XMLValidator} from "../fxp.js";
import ReadToEnd from './read.js';
import cmdDetail from "./man.js"

console.warn("\x1b[33m%s\x1b[0m", "⚠️  Warning: The built-in CLI interface is now deprecated.");
console.warn("Please install the dedicated CLI package instead:");
console.warn("  npm install -g fxp-cli");

if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(cmdDetail);
} else if (process.argv[2] === '--version') {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  const version = JSON.parse(fs.readFileSync(packageJsonPath).toString()).version;
  console.log(version);
} else {
  const options = {
    removeNSPrefix: true,
    ignoreAttributes: false,
    parseTagValue: true,
    parseAttributeValue: true,
  };
  let fileName = '';
  let outputFileName;
  let validate = false;
  let validateOnly = false;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-ns') {
      options.removeNSPrefix = false;
    } else if (process.argv[i] === '-a') {
      options.ignoreAttributes = true;
    } else if (process.argv[i] === '-c') {
      options.parseTagValue = false;
      options.parseAttributeValue = false;
    } else if (process.argv[i] === '-o') {
      outputFileName = process.argv[++i];
    } else if (process.argv[i] === '-v') {
      validate = true;
    } else if (process.argv[i] === '-V') {
      validateOnly = true;
    } else {
      //filename
      fileName = process.argv[i];
    }
  }
  
  const callback = function(xmlData) {
    let output = '';
    if (validateOnly) {
      output = XMLValidator.validate(xmlData);
      process.exitCode = output === true ? 0 : 1;
    }  else {
      const parser = new XMLParser(options);
      output = JSON.stringify(parser.parse(xmlData,validate), null, 4);
    }
    if (outputFileName) {
      writeToFile(outputFileName, output);
    } else {
      console.log(output);
    }
  };


  try {
    
    if (!fileName) {
      ReadToEnd.readToEnd(process.stdin, function(err, data) {
        if (err) {
          throw err;
        }
        callback(data.toString());
      });
    } else {
      fs.readFile(fileName, function(err, data) {
        if (err) {
          throw err;
        }
        callback(data.toString());
      });
    }
  } catch (e) {
    console.log('Seems an invalid file or stream.' + e);
  }
}

function writeToFile(fileName, data) {
  fs.writeFile(fileName, data, function(err) {
    if (err) {
      throw err;
    }
    console.log('JSON output has been written to ' + fileName);
  });
}
