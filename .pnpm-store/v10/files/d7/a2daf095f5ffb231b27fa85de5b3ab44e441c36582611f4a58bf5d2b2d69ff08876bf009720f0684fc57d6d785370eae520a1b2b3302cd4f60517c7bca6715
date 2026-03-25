"use strict";
// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSubjectTokenSupplier = void 0;
const util_1 = require("util");
const fs = require("fs");
// fs.readfile is undefined in browser karma tests causing
// `npm run browser-test` to fail as test.oauth2.ts imports this file via
// src/index.ts.
// Fallback to void function to avoid promisify throwing a TypeError.
const readFile = (0, util_1.promisify)(fs.readFile ?? (() => { }));
const realpath = (0, util_1.promisify)(fs.realpath ?? (() => { }));
const lstat = (0, util_1.promisify)(fs.lstat ?? (() => { }));
/**
 * Internal subject token supplier implementation used when a file location
 * is configured in the credential configuration used to build an {@link IdentityPoolClient}
 */
class FileSubjectTokenSupplier {
    filePath;
    formatType;
    subjectTokenFieldName;
    /**
     * Instantiates a new file based subject token supplier.
     * @param opts The file subject token supplier options to build the supplier
     *   with.
     */
    constructor(opts) {
        this.filePath = opts.filePath;
        this.formatType = opts.formatType;
        this.subjectTokenFieldName = opts.subjectTokenFieldName;
    }
    /**
     * Returns the subject token stored at the file specified in the constructor.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link IdentityPoolClient}, contains the requested audience and subject
     *   token type for the external account identity. Not used.
     */
    async getSubjectToken() {
        // Make sure there is a file at the path. lstatSync will throw if there is
        // nothing there.
        let parsedFilePath = this.filePath;
        try {
            // Resolve path to actual file in case of symlink. Expect a thrown error
            // if not resolvable.
            parsedFilePath = await realpath(parsedFilePath);
            if (!(await lstat(parsedFilePath)).isFile()) {
                throw new Error();
            }
        }
        catch (err) {
            if (err instanceof Error) {
                err.message = `The file at ${parsedFilePath} does not exist, or it is not a file. ${err.message}`;
            }
            throw err;
        }
        let subjectToken;
        const rawText = await readFile(parsedFilePath, { encoding: 'utf8' });
        if (this.formatType === 'text') {
            subjectToken = rawText;
        }
        else if (this.formatType === 'json' && this.subjectTokenFieldName) {
            const json = JSON.parse(rawText);
            subjectToken = json[this.subjectTokenFieldName];
        }
        if (!subjectToken) {
            throw new Error('Unable to parse the subject_token from the credential_source file');
        }
        return subjectToken;
    }
}
exports.FileSubjectTokenSupplier = FileSubjectTokenSupplier;
//# sourceMappingURL=filesubjecttokensupplier.js.map