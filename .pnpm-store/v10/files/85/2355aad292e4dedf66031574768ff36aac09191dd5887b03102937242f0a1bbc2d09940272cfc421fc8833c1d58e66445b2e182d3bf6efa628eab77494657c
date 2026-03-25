var pug = require('./');
var resolvedPug = JSON.stringify(require.resolve('./'));

function compileTemplate(module, filename) {
  var template = pug.compileFileClient(filename, {
    inlineRuntimeFunctions: false,
  });
  var body =
    'var pug = require(' +
    resolvedPug +
    ').runtime;\n\n' +
    'module.exports = ' +
    template +
    ';';
  module._compile(body, filename);
}

if (require.extensions) {
  require.extensions['.pug'] = compileTemplate;
}
