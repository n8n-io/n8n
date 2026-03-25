var fs = require("fs"),
    encode = require("./encode");

module.exports = function(filename, data, options) {
  var stat;

  try {
    stat = fs.statSync(filename);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (!stat || stat.isFile()) {
    fs.writeFileSync(filename, data, options);
  } else {
    var fd = fs.openSync(filename, options && options.flag || "w"),
        bytesWritten = 0,
        bytesTotal = (data = encode(data, options)).length;

    while (bytesWritten < bytesTotal) {
      try {
        bytesWritten += fs.writeSync(fd, data, bytesWritten, bytesTotal - bytesWritten, null);
      } catch (error) {
        if (error.code === "EPIPE") break; // ignore broken pipe, e.g., | head
        fs.closeSync(fd);
        throw error;
      }
    }

    fs.closeSync(fd);
  }
};
