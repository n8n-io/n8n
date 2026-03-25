"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilePseudoSelector = exports.aliases = exports.pseudos = exports.filters = void 0;
var css_what_1 = require("css-what");
var filters_js_1 = require("./filters.js");
Object.defineProperty(exports, "filters", { enumerable: true, get: function () { return filters_js_1.filters; } });
var pseudos_js_1 = require("./pseudos.js");
Object.defineProperty(exports, "pseudos", { enumerable: true, get: function () { return pseudos_js_1.pseudos; } });
var aliases_js_1 = require("./aliases.js");
Object.defineProperty(exports, "aliases", { enumerable: true, get: function () { return aliases_js_1.aliases; } });
var subselects_js_1 = require("./subselects.js");
function compilePseudoSelector(next, selector, options, context, compileToken) {
    var _a;
    var name = selector.name, data = selector.data;
    if (Array.isArray(data)) {
        if (!(name in subselects_js_1.subselects)) {
            throw new Error("Unknown pseudo-class :".concat(name, "(").concat(data, ")"));
        }
        return subselects_js_1.subselects[name](next, data, options, context, compileToken);
    }
    var userPseudo = (_a = options.pseudos) === null || _a === void 0 ? void 0 : _a[name];
    var stringPseudo = typeof userPseudo === "string" ? userPseudo : aliases_js_1.aliases[name];
    if (typeof stringPseudo === "string") {
        if (data != null) {
            throw new Error("Pseudo ".concat(name, " doesn't have any arguments"));
        }
        // The alias has to be parsed here, to make sure options are respected.
        var alias = (0, css_what_1.parse)(stringPseudo);
        return subselects_js_1.subselects["is"](next, alias, options, context, compileToken);
    }
    if (typeof userPseudo === "function") {
        (0, pseudos_js_1.verifyPseudoArgs)(userPseudo, name, data, 1);
        return function (elem) { return userPseudo(elem, data) && next(elem); };
    }
    if (name in filters_js_1.filters) {
        return filters_js_1.filters[name](next, data, options, context);
    }
    if (name in pseudos_js_1.pseudos) {
        var pseudo_1 = pseudos_js_1.pseudos[name];
        (0, pseudos_js_1.verifyPseudoArgs)(pseudo_1, name, data, 2);
        return function (elem) { return pseudo_1(elem, options, data) && next(elem); };
    }
    throw new Error("Unknown pseudo-class :".concat(name));
}
exports.compilePseudoSelector = compilePseudoSelector;
//# sourceMappingURL=index.js.map