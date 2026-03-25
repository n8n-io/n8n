'use strict';

const format = {
  selectorStart: {
    compressed: "{",
    compact: " {",
    expanded: " {"
  },
  selectorEnd: {
    compressed: "}",
    compact: "; }\n",
    expanded: ";\n}\n"
  },
  rule: {
    compressed: "{key}:",
    compact: " {key}: ",
    expanded: "\n  {key}: "
  }
};
function formatCSS(data, mode = "expanded") {
  const results = [];
  for (let i = 0; i < data.length; i++) {
    const { selector, rules } = data[i];
    const fullSelector = selector instanceof Array ? selector.join(mode === "compressed" ? "," : ", ") : selector;
    let entry = fullSelector + format.selectorStart[mode];
    let firstRule = true;
    for (const key in rules) {
      if (!firstRule) {
        entry += ";";
      }
      entry += format.rule[mode].replace("{key}", key) + rules[key];
      firstRule = false;
    }
    entry += format.selectorEnd[mode];
    results.push(entry);
  }
  return results.join(mode === "compressed" ? "" : "\n");
}

exports.formatCSS = formatCSS;
