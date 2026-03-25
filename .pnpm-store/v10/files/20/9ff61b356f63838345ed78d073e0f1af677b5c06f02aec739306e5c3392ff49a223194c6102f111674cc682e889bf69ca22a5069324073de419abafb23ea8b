module.exports = function(data, options) {
  return typeof data === "string"
      ? new Buffer(data, typeof options === "string" ? options
          : options && options.encoding !== null ? options.encoding
          : "utf8")
      : data;
};
