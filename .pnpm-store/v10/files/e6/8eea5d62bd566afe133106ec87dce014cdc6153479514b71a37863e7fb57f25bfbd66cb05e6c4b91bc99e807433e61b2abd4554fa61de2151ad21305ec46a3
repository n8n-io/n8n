function ruleSorter(s1, s2) {
  return s1[1] > s2[1] ? 1 : -1;
}

function tidyRuleDuplicates(rules) {
  var list = [];
  var repeated = [];

  for (var i = 0, l = rules.length; i < l; i++) {
    var rule = rules[i];

    if (repeated.indexOf(rule[1]) == -1) {
      repeated.push(rule[1]);
      list.push(rule);
    }
  }

  return list.sort(ruleSorter);
}

module.exports = tidyRuleDuplicates;
