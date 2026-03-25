"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addDeprecatedGenerators = addDeprecatedGenerators;
function addDeprecatedGenerators(PrinterClass) {
  {
    const deprecatedBabel7Generators = {
      Noop() {},
      TSExpressionWithTypeArguments(node) {
        this.print(node.expression);
        this.print(node.typeParameters);
      },
      DecimalLiteral(node) {
        const raw = this.getPossibleRaw(node);
        if (!this.format.minified && raw !== undefined) {
          this.word(raw);
          return;
        }
        this.word(node.value + "m");
      }
    };
    Object.assign(PrinterClass.prototype, deprecatedBabel7Generators);
  }
}

//# sourceMappingURL=deprecated.js.map
