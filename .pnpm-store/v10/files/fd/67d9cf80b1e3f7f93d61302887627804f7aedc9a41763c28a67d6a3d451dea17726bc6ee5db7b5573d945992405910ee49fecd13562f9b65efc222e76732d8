"use strict";
/**
 * Created by user on 2018/2/1/001.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipFile = void 0;
try {
    // zipfile is an optional dependency:
    exports.ZipFile = require("zipfile").ZipFile;
}
catch (err) {
    // Mock zipfile using pure-JS adm-zip:
    const AdmZip = require('adm-zip');
    // @ts-ignore
    exports.ZipFile = (class {
        constructor(filename) {
            this.admZip = new AdmZip(filename);
            this.names = this.admZip.getEntries().map(function (zipEntry) {
                return zipEntry.entryName;
            });
        }
        readFile(name, cb) {
            this.admZip.readFileAsync(this.admZip.getEntry(name), (buffer, error) => {
                if (error || !buffer) {
                    name = decodeURIComponent(name);
                    this.admZip.readFileAsync(this.admZip.getEntry(name), (buffer, error) => cb(error, buffer));
                }
                else {
                    cb(error, buffer);
                }
            });
        }
        get count() {
            return this.names.length;
        }
    });
}
exports.default = exports.ZipFile;
//# sourceMappingURL=zipfile.js.map