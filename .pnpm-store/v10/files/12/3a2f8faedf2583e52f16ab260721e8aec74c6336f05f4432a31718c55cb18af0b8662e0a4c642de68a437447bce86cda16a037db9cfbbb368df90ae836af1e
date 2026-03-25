var runtime = require('./');

module.exports = wrap;
function wrap(template, templateName) {
  templateName = templateName || 'template';
  return Function(
    'pug',
    template + '\n' + 'return ' + templateName + ';'
  )(runtime);
}
