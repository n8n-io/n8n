import { smart } from '@babel/template';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
}
typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * Rewrites known `import.meta`[1] properties into equivalent non-module node.js
 * expressions. In order to maintain compatibility with plugins transforming
 * non-standard properties, this plugin transforms only known properties and
 * does not touch expressions with unknown or without member property access.
 * Properties known to this plugin:
 *
 * - `url`[2]
 *
 * [1]: https://github.com/tc39/proposal-import-meta
 * [2]: https://html.spec.whatwg.org/#hostgetimportmetaproperties
 */
function index () {
    return {
        name: 'transform-import-meta',
        visitor: {
            // eslint-disable-next-line complexity -- I don't know how to do it better
            Program: function (path, state) {
                var _a;
                var _b = ((_a = state.opts) !== null && _a !== void 0 ? _a : {}).module, target = _b === void 0 ? 'CommonJS' : _b;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- user input may not match type
                if (target !== 'CommonJS' && target !== 'ES6') {
                    throw new Error('Invalid target, must be one of: "CommonJS" or "ES6"');
                }
                var urlMetas = [];
                var filenameMetas = [];
                var dirnameMetas = [];
                var resolveMetas = [];
                var urlScopeIdentifiers = new Set();
                var resolveScopeIdentifiers = new Set();
                // Gather all of the relevant data for import.meta's that we're going to replace later.
                path.traverse({
                    // eslint-disable-next-line complexity -- I don't know how to do it better
                    MemberExpression: function (memberExpPath) {
                        var node = memberExpPath.node;
                        if (node.object.type === 'MetaProperty' &&
                            node.object.meta.name === 'import' &&
                            node.object.property.name === 'meta' &&
                            node.property.type === 'Identifier' &&
                            node.property.name === 'url') {
                            urlMetas.push(memberExpPath);
                            for (var _i = 0, _a = Object.keys(memberExpPath.scope.getAllBindings()); _i < _a.length; _i++) {
                                var name = _a[_i];
                                urlScopeIdentifiers.add(name);
                            }
                        }
                        if (node.object.type === 'MetaProperty' &&
                            node.object.meta.name === 'import' &&
                            node.object.property.name === 'meta' &&
                            node.property.type === 'Identifier' &&
                            node.property.name === 'filename') {
                            filenameMetas.push(memberExpPath);
                        }
                        if (node.object.type === 'MetaProperty' &&
                            node.object.meta.name === 'import' &&
                            node.object.property.name === 'meta' &&
                            node.property.type === 'Identifier' &&
                            node.property.name === 'dirname') {
                            dirnameMetas.push(memberExpPath);
                        }
                    },
                    // eslint-disable-next-line complexity -- I don't know how to do it better
                    CallExpression: function (callExpPath) {
                        var node = callExpPath.node;
                        if (node.callee.type === 'MemberExpression' &&
                            node.callee.object.type === 'MetaProperty' &&
                            node.callee.object.meta.name === 'import' &&
                            node.callee.object.property.name === 'meta' &&
                            node.callee.property.type === 'Identifier' &&
                            node.callee.property.name === 'resolve') {
                            resolveMetas.push(callExpPath);
                            for (var _i = 0, _a = Object.keys(callExpPath.scope.getAllBindings()); _i < _a.length; _i++) {
                                var name = _a[_i];
                                resolveScopeIdentifiers.add(name);
                            }
                        }
                    },
                    // eslint-disable-next-line complexity -- I don't know how to do it better
                    OptionalCallExpression: function (callExpPath) {
                        var node = callExpPath.node;
                        if (node.callee.type === 'MemberExpression' &&
                            node.callee.object.type === 'MetaProperty' &&
                            node.callee.object.meta.name === 'import' &&
                            node.callee.object.property.name === 'meta' &&
                            node.callee.property.type === 'Identifier' &&
                            node.callee.property.name === 'resolve') {
                            resolveMetas.push(callExpPath);
                            for (var _i = 0, _a = Object.keys(callExpPath.scope.getAllBindings()); _i < _a.length; _i++) {
                                var name = _a[_i];
                                resolveScopeIdentifiers.add(name);
                            }
                        }
                    }
                });
                // For url and resolve, we'll potentially need to add imports, depending on the target.
                if ((urlMetas.length !== 0) || (resolveMetas.length !== 0)) {
                    // eslint-disable-next-line @typescript-eslint/init-declarations -- no obvious default
                    var metaUrlReplacement = void 0;
                    // eslint-disable-next-line @typescript-eslint/init-declarations -- no obvious default
                    var metaResolveReplacement = void 0;
                    switch (target) {
                        case 'CommonJS': {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                            metaUrlReplacement = smart.ast(templateObject_1 || (templateObject_1 = __makeTemplateObject(["require('url').pathToFileURL(__filename).toString()"], ["require('url').pathToFileURL(__filename).toString()"])));
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                            metaResolveReplacement = function (args) { return smart.ast(templateObject_2 || (templateObject_2 = __makeTemplateObject(["require('url').pathToFileURL(require.resolve(", ")).toString()"], ["require('url').pathToFileURL(require.resolve(", ")).toString()"])), args); };
                            break;
                        }
                        case 'ES6': {
                            var urlId_1 = 'url';
                            var createRequireId_1 = 'createRequire';
                            while (urlScopeIdentifiers.has(urlId_1) || resolveScopeIdentifiers.has(urlId_1)) {
                                urlId_1 = path.scope.generateUidIdentifier('url').name;
                            }
                            while (resolveScopeIdentifiers.has(createRequireId_1)) {
                                createRequireId_1 = path.scope.generateUidIdentifier('createRequire').name;
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                            path.node.body.unshift(smart.ast(templateObject_3 || (templateObject_3 = __makeTemplateObject(["import ", " from 'url';"], ["import ", " from 'url';"])), urlId_1));
                            if (resolveMetas.length !== 0) {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                                path.node.body.unshift(smart.ast(templateObject_4 || (templateObject_4 = __makeTemplateObject(["import { createRequire as ", " } from 'module';"], ["import { createRequire as ", " } from 'module';"])), createRequireId_1));
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                            metaUrlReplacement = smart.ast(templateObject_5 || (templateObject_5 = __makeTemplateObject(["", ".pathToFileURL(__filename).toString()"], ["", ".pathToFileURL(__filename).toString()"])), urlId_1);
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                            metaResolveReplacement = function (args) { return smart.ast(templateObject_6 || (templateObject_6 = __makeTemplateObject(["", ".pathToFileURL(", "(", ".pathToFileURL(__filename).toString()).resolve(", ")).toString()"], ["", ".pathToFileURL(", "(", ".pathToFileURL(__filename).toString()).resolve(", ")).toString()"])), urlId_1, createRequireId_1, urlId_1, args); };
                            break;
                        }
                    }
                    for (var _i = 0, urlMetas_1 = urlMetas; _i < urlMetas_1.length; _i++) {
                        var meta = urlMetas_1[_i];
                        meta.replaceWith(metaUrlReplacement);
                    }
                    for (var _c = 0, resolveMetas_1 = resolveMetas; _c < resolveMetas_1.length; _c++) {
                        var meta = resolveMetas_1[_c];
                        meta.replaceWith(metaResolveReplacement(meta.node.arguments));
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                var metaFilenameReplacement = smart.ast(templateObject_7 || (templateObject_7 = __makeTemplateObject(["__filename"], ["__filename"])));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deterministic casting
                var metaDirnameReplacement = smart.ast(templateObject_8 || (templateObject_8 = __makeTemplateObject(["__dirname"], ["__dirname"])));
                for (var _d = 0, filenameMetas_1 = filenameMetas; _d < filenameMetas_1.length; _d++) {
                    var meta = filenameMetas_1[_d];
                    meta.replaceWith(metaFilenameReplacement);
                }
                for (var _e = 0, dirnameMetas_1 = dirnameMetas; _e < dirnameMetas_1.length; _e++) {
                    var meta = dirnameMetas_1[_e];
                    meta.replaceWith(metaDirnameReplacement);
                }
            }
        }
    };
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8;

export { index as default };
