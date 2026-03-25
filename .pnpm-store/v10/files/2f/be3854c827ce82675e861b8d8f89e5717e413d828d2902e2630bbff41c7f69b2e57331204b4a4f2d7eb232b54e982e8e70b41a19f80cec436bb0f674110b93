function tidyAtRule(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/url\(\s+/g, 'url(')
    .replace(/\s+\)/g, ')')
    .trim();
}

module.exports = tidyAtRule;
