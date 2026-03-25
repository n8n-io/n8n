var helpers = require('./helpers');

function store(serializeContext, token) {
  serializeContext.output.push(typeof token == 'string' ? token : token[1]);
}

function context() {
  var newContext = {
    output: [],
    store: store
  };

  return newContext;
}

function all(tokens) {
  var oneTimeContext = context();
  helpers.all(oneTimeContext, tokens);
  return oneTimeContext.output.join('');
}

function body(tokens) {
  var oneTimeContext = context();
  helpers.body(oneTimeContext, tokens);
  return oneTimeContext.output.join('');
}

function property(tokens, position) {
  var oneTimeContext = context();
  helpers.property(oneTimeContext, tokens, position, true);
  return oneTimeContext.output.join('');
}

function rules(tokens) {
  var oneTimeContext = context();
  helpers.rules(oneTimeContext, tokens);
  return oneTimeContext.output.join('');
}

function value(tokens) {
  var oneTimeContext = context();
  helpers.value(oneTimeContext, tokens);
  return oneTimeContext.output.join('');
}

module.exports = {
  all: all,
  body: body,
  property: property,
  rules: rules,
  value: value
};
