var slice = Array.prototype.slice;

function dashify(method, file) {
  return function(path) {
    var argv = arguments;
    if (path == "-") (argv = slice.call(argv)).splice(0, 1, file);
    return method.apply(null, argv);
  };
}

exports.readFile = dashify(require("./read-file"), "/dev/stdin");
exports.readFileSync = dashify(require("./read-file-sync"), "/dev/stdin");
exports.writeFile = dashify(require("./write-file"), "/dev/stdout");
exports.writeFileSync = dashify(require("./write-file-sync"), "/dev/stdout");
