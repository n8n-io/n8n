// This extractor is used in level 2 optimizations
// IMPORTANT: Mind Token class and this code is not related!
// Properties will be tokenized in one step, see #429

var Token = require('../../tokenizer/token');
var serializeRules = require('../../writer/one-time').rules;
var serializeValue = require('../../writer/one-time').value;

function extractProperties(token) {
  var properties = [];
  var inSpecificSelector;
  var property;
  var name;
  var value;
  var i, l;

  if (token[0] == Token.RULE) {
    inSpecificSelector = !/[\.\+>~]/.test(serializeRules(token[1]));

    for (i = 0, l = token[2].length; i < l; i++) {
      property = token[2][i];

      if (property[0] != Token.PROPERTY)
        continue;

      name = property[1][1];
      if (name.length === 0)
        continue;

      if (name.indexOf('--') === 0)
        continue;

      value = serializeValue(property, i);

      properties.push([
        name,
        value,
        findNameRoot(name),
        token[2][i],
        name + ':' + value,
        token[1],
        inSpecificSelector
      ]);
    }
  } else if (token[0] == Token.NESTED_BLOCK) {
    for (i = 0, l = token[2].length; i < l; i++) {
      properties = properties.concat(extractProperties(token[2][i]));
    }
  }

  return properties;
}

function findNameRoot(name) {
  if (name == 'list-style')
    return name;
  if (name.indexOf('-radius') > 0)
    return 'border-radius';
  if (name == 'border-collapse' || name == 'border-spacing' || name == 'border-image')
    return name;
  if (name.indexOf('border-') === 0 && /^border\-\w+\-\w+$/.test(name))
    return name.match(/border\-\w+/)[0];
  if (name.indexOf('border-') === 0 && /^border\-\w+$/.test(name))
    return 'border';
  if (name.indexOf('text-') === 0)
    return name;
  if (name == '-chrome-')
    return name;

  return name.replace(/^\-\w+\-/, '').match(/([a-zA-Z]+)/)[0].toLowerCase();
}

module.exports = extractProperties;
