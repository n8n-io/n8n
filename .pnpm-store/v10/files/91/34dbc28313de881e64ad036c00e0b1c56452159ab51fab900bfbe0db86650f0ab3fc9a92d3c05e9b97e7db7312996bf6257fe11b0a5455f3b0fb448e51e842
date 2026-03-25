const { createMacro, MacroError } = require("babel-plugin-macros");
const dedent = require("./dist/dedent.js").default;

module.exports = createMacro(prevalMacros);

function prevalMacros({ references, state, babel }) {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type === "TaggedTemplateExpression") {
      asTag(referencePath.parentPath.get("quasi"), state, babel);
    } else if (referencePath.parentPath.type === "CallExpression") {
      asFunction(referencePath.parentPath.get("arguments"), state, babel);
    } else {
      throw new MacroError(
        `dedent.macro can only be used as tagged template expression or function call. You tried ${
          referencePath.parentPath.type
        }.`
      );
    }
  });
}

function asTag(quasiPath, { file: { opts: { filename } } }, babel) {
  const string = quasiPath.parentPath.get("quasi").evaluate().value;
  const { types: t } = babel;

  quasiPath.parentPath.replaceWith(t.stringLiteral(dedent(string)));
}

function asFunction(argumentsPaths, { file: { opts: { filename } } }, babel) {
  const string = argumentsPaths[0].evaluate().value;
  const { types: t } = babel;

  argumentsPaths[0].parentPath.replaceWith(t.stringLiteral(dedent(string)));
}
