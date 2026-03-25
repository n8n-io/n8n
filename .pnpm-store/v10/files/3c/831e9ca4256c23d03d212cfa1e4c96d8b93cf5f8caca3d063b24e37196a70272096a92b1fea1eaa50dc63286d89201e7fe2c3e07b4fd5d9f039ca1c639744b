"use strict";
/**
 * Copyright 2021, 2024 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCrTokenFile = exports.constructFilepath = exports.fileExistsAtPath = exports.readCredentialsFile = void 0;
var dotenv_1 = require("dotenv");
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
var logger_1 = __importDefault(require("../../lib/logger"));
// Putting all file-reading related code in this file to isolate the usage of the
// `fs` module, as it causes problems in browser environments.
var defaultCredsFilename = 'ibm-credentials.env';
/**
 * Return a config object based on a credentials file. Credentials files can
 * be specified filepath via the environment variable: `IBM_CREDENTIALS_FILE`.
 */
function readCredentialsFile() {
    if (!fs_1.existsSync) {
        return {};
    }
    // first look for an env variable called IBM_CREDENTIALS_FILE
    // it should be the path to the file
    // then look at the current working directory
    // then at the os-dependent home directory
    var givenFilepath = process.env.IBM_CREDENTIALS_FILE || '';
    var workingDir = constructFilepath(process.cwd());
    var homeDir = constructFilepath((0, os_1.homedir)());
    var filepathToUse;
    if (givenFilepath) {
        if (fileExistsAtPath(givenFilepath)) {
            // see if user gave a path to a file named something other than `ibm-credentials.env`
            filepathToUse = givenFilepath;
        }
        else if (fileExistsAtPath(constructFilepath(givenFilepath))) {
            // see if user gave a path to the directory where file is located
            filepathToUse = constructFilepath(givenFilepath);
        }
    }
    else if (fileExistsAtPath(workingDir)) {
        filepathToUse = workingDir;
    }
    else if (fileExistsAtPath(homeDir)) {
        filepathToUse = homeDir;
    }
    else {
        // file does not exist anywhere, will not be used
        logger_1.default.info('Credential file does not exist. Will not be used');
        return {};
    }
    var credsFile = (0, fs_1.readFileSync)(filepathToUse);
    return (0, dotenv_1.parse)(credsFile);
}
exports.readCredentialsFile = readCredentialsFile;
function fileExistsAtPath(filepath) {
    if ((0, fs_1.existsSync)(filepath)) {
        var stats = (0, fs_1.lstatSync)(filepath);
        return stats.isFile() || stats.isSymbolicLink();
    }
    return false;
}
exports.fileExistsAtPath = fileExistsAtPath;
function constructFilepath(filepath) {
    // ensure filepath includes the filename
    if (!filepath.endsWith(defaultCredsFilename)) {
        filepath = (0, path_1.join)(filepath, defaultCredsFilename);
    }
    return filepath;
}
exports.constructFilepath = constructFilepath;
function readCrTokenFile(filepath) {
    if (!fs_1.existsSync) {
        return '';
    }
    try {
        var token = '';
        logger_1.default.debug("Attempting to read CR token from file: ".concat(filepath));
        token = (0, fs_1.readFileSync)(filepath, 'utf8');
        logger_1.default.debug("Successfully read CR token from file: ".concat(filepath));
        return token;
    }
    catch (err) {
        var msg = "Error reading CR token: ".concat(err.toString());
        logger_1.default.debug(msg);
        throw new Error(msg);
    }
}
exports.readCrTokenFile = readCrTokenFile;
