var VENDOR_PREFIX_PATTERN = /(?:^|\W)(\-\w+\-)/g;

function unique(value) {
  var prefixes = [];
  var match;

  while ((match = VENDOR_PREFIX_PATTERN.exec(value)) !== null) {
    if (prefixes.indexOf(match[0]) == -1) {
      prefixes.push(match[0]);
    }
  }

  return prefixes;
}

function same(value1, value2) {
  return unique(value1).sort().join(',') == unique(value2).sort().join(',');
}

module.exports = {
  unique: unique,
  same: same
};
