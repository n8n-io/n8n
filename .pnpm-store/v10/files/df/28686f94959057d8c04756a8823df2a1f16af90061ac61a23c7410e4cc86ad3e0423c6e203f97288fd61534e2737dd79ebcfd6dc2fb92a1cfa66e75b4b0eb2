module.exports = function(options) {
  if (options) {
    if (typeof options === "string") return encoding(options);
    if (options.encoding !== null) return encoding(options.encoding);
  }
  return identity();
};

function identity() {
  var chunks = [];
  return {
    push: function(chunk) { chunks.push(chunk); },
    value: function() { return Buffer.concat(chunks); }
  };
}

function encoding(encoding) {
  var chunks = [];
  return {
    push: function(chunk) { chunks.push(chunk); },
    value: function() { return Buffer.concat(chunks).toString(encoding); }
  };
}
