var base64js = require("base64-js");
var JSZip = require("jszip");

exports.openArrayBuffer = openArrayBuffer;
exports.splitPath = splitPath;
exports.joinPath = joinPath;

function openArrayBuffer(arrayBuffer) {
    return JSZip.loadAsync(arrayBuffer).then(function(zipFile) {
        function exists(name) {
            return zipFile.file(name) !== null;
        }

        function read(name, encoding) {
            return zipFile.file(name).async("uint8array").then(function(array) {
                if (encoding === "base64") {
                    return base64js.fromByteArray(array);
                } else if (encoding) {
                    var decoder = new TextDecoder(encoding);
                    return decoder.decode(array);
                } else {
                    return array;
                }
            });
        }

        function write(name, contents) {
            zipFile.file(name, contents);
        }

        function toArrayBuffer() {
            return zipFile.generateAsync({type: "arraybuffer"});
        }

        return {
            exists: exists,
            read: read,
            write: write,
            toArrayBuffer: toArrayBuffer
        };
    });
}

function splitPath(path) {
    var lastIndex = path.lastIndexOf("/");
    if (lastIndex === -1) {
        return {dirname: "", basename: path};
    } else {
        return {
            dirname: path.substring(0, lastIndex),
            basename: path.substring(lastIndex + 1)
        };
    }
}

function joinPath() {
    var nonEmptyPaths = Array.prototype.filter.call(arguments, function(path) {
        return path;
    });

    var relevantPaths = [];

    nonEmptyPaths.forEach(function(path) {
        if (/^\//.test(path)) {
            relevantPaths = [path];
        } else {
            relevantPaths.push(path);
        }
    });

    return relevantPaths.join("/");
}
