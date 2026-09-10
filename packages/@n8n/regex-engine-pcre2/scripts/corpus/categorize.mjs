// Cheap heuristics on pattern text, good enough to route a failure to "which feature
// area" -- not a real regex parser.
const FEATURE_TESTS = [
  ['backreference', /\\[1-9]\d*|\\k<|\(\?P=/],
  ['lookahead', /\(\?[=!]/],
  ['lookbehind', /\(\?<[=!]/],
  ['named-group', /\(\?P?<[A-Za-z_]/],
  ['non-capturing-group', /\(\?:/],
  ['atomic-group', /\(\?>/],
  ['possessive-quantifier', /[+*?}][+]|\{\d+(,\d*)?\}\+/],
  ['unicode-property', /\\[pP]\{/],
  ['posix-class', /\[:[a-z]+:\]/],
  ['inline-flag', /\(\?[a-zA-Z-]+[:)]/],
  ['word-boundary', /\\[bB]/],
  ['anchor', /[$^]/],
  ['character-class', /\[[^\]]/],
  ['quantifier-braces', /\{\d+(,\d*)?\}/],
  ['dotall-or-multiline-marker', /\(\?[a-zA-Z]*[ms]/],
  ['case-insensitive-flag', /\(\?[a-zA-Z]*i/],
];

export function detectFeatureTags(pattern) {
  const tags = [];
  for (const [tag, re] of FEATURE_TESTS) {
    if (re.test(pattern)) tags.push(tag);
  }
  return tags;
}

// Most specific tag wins when a pattern matches several (e.g. backreference inside a
// character class files under the rarer feature, not the catch-all one).
const CATEGORY_PRIORITY = [
  'backreference',
  'lookbehind',
  'lookahead',
  'named-group',
  'atomic-group',
  'possessive-quantifier',
  'unicode-property',
  'posix-class',
  'inline-flag',
  'non-capturing-group',
  'word-boundary',
  'quantifier-braces',
  'character-class',
  'anchor',
];

export function classifyPrimaryCategory(tags) {
  for (const category of CATEGORY_PRIORITY) {
    if (tags.includes(category)) return category;
  }
  return 'basic'; // no notable feature detected -- plain literal/simple pattern
}
