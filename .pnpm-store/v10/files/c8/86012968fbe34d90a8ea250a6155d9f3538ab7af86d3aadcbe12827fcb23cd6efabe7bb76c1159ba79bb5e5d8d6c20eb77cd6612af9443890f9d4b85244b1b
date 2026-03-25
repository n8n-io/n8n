var promises = require("../lib/promises");
var zipfile = require("../lib/zipfile");

exports.openZip = openZip;

function openZip(options) {
    if (options.arrayBuffer) {
        return promises.resolve(zipfile.openArrayBuffer(options.arrayBuffer));
    } else {
        return promises.reject(new Error("Could not find file in options"));
    }
}
