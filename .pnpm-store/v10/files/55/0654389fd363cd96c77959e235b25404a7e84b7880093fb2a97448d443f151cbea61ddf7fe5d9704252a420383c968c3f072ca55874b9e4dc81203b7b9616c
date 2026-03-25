function inlineOptionsFrom(rules) {
  if (Array.isArray(rules)) {
    return rules;
  }

  if (rules === false) {
    return ['none'];
  }

  return undefined === rules ?
    ['local'] :
    rules.split(',');
}

module.exports = inlineOptionsFrom;
