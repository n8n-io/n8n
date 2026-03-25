import { sep } from 'path';
import { createFilter, attachScopes, makeLegalIdentifier } from '@rollup/pluginutils';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';

var escape = function (str) { return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'); };

var isReference = function (node, parent) {
  if (node.type === 'MemberExpression') {
    return !node.computed && isReference(node.object, node);
  }

  if (node.type === 'Identifier') {
    // TODO is this right?
    if (parent.type === 'MemberExpression') { return parent.computed || node === parent.object; }

    // disregard the `bar` in { bar: foo }
    if (parent.type === 'Property' && node !== parent.value) { return false; }

    // disregard the `bar` in `class Foo { bar () {...} }`
    if (parent.type === 'MethodDefinition') { return false; }

    // disregard the `bar` in `export { foo as bar }`
    if (parent.type === 'ExportSpecifier' && node !== parent.local) { return false; }

    // disregard the `bar` in `import { bar as foo }`
    if (parent.type === 'ImportSpecifier' && node === parent.imported) {
      return false;
    }

    return true;
  }

  return false;
};

var flatten = function (startNode) {
  var parts = [];
  var node = startNode;

  while (node.type === 'MemberExpression') {
    parts.unshift(node.property.name);
    node = node.object;
  }

  var name = node.name;
  parts.unshift(name);

  return { name: name, keypath: parts.join('.') };
};

function inject(options) {
  if (!options) { throw new Error('Missing options'); }

  var filter = createFilter(options.include, options.exclude);

  var modules = options.modules;

  if (!modules) {
    modules = Object.assign({}, options);
    delete modules.include;
    delete modules.exclude;
    delete modules.sourceMap;
    delete modules.sourcemap;
  }

  var modulesMap = new Map(Object.entries(modules));

  // Fix paths on Windows
  if (sep !== '/') {
    modulesMap.forEach(function (mod, key) {
      modulesMap.set(
        key,
        Array.isArray(mod) ? [mod[0].split(sep).join('/'), mod[1]] : mod.split(sep).join('/')
      );
    });
  }

  var firstpass = new RegExp(("(?:" + (Array.from(modulesMap.keys()).map(escape).join('|')) + ")"), 'g');
  var sourceMap = options.sourceMap !== false && options.sourcemap !== false;

  return {
    name: 'inject',

    transform: function transform(code, id) {
      if (!filter(id)) { return null; }
      if (code.search(firstpass) === -1) { return null; }

      if (sep !== '/') { id = id.split(sep).join('/'); } // eslint-disable-line no-param-reassign

      var ast = null;
      try {
        ast = this.parse(code);
      } catch (err) {
        this.warn({
          code: 'PARSE_ERROR',
          message: ("rollup-plugin-inject: failed to parse " + id + ". Consider restricting the plugin to particular files via options.include")
        });
      }
      if (!ast) {
        return null;
      }

      var imports = new Set();
      ast.body.forEach(function (node) {
        if (node.type === 'ImportDeclaration') {
          node.specifiers.forEach(function (specifier) {
            imports.add(specifier.local.name);
          });
        }
      });

      // analyse scopes
      var scope = attachScopes(ast, 'scope');

      var magicString = new MagicString(code);

      var newImports = new Map();

      function handleReference(node, name, keypath) {
        var mod = modulesMap.get(keypath);
        if (mod && !imports.has(name) && !scope.contains(name)) {
          if (typeof mod === 'string') { mod = [mod, 'default']; }

          // prevent module from importing itself
          if (mod[0] === id) { return false; }

          var hash = keypath + ":" + (mod[0]) + ":" + (mod[1]);

          var importLocalName =
            name === keypath ? name : makeLegalIdentifier(("$inject_" + keypath));

          if (!newImports.has(hash)) {
            // escape apostrophes and backslashes for use in single-quoted string literal
            var modName = mod[0].replace(/[''\\]/g, '\\$&');
            if (mod[1] === '*') {
              newImports.set(hash, ("import * as " + importLocalName + " from '" + modName + "';"));
            } else {
              newImports.set(hash, ("import { " + (mod[1]) + " as " + importLocalName + " } from '" + modName + "';"));
            }
          }

          if (name !== keypath) {
            magicString.overwrite(node.start, node.end, importLocalName, {
              storeName: true
            });
          }

          return true;
        }

        return false;
      }

      walk(ast, {
        enter: function enter(node, parent) {
          if (sourceMap) {
            magicString.addSourcemapLocation(node.start);
            magicString.addSourcemapLocation(node.end);
          }

          if (node.scope) {
            scope = node.scope; // eslint-disable-line prefer-destructuring
          }

          // special case – shorthand properties. because node.key === node.value,
          // we can't differentiate once we've descended into the node
          if (node.type === 'Property' && node.shorthand && node.value.type === 'Identifier') {
            var ref = node.key;
            var name = ref.name;
            handleReference(node, name, name);
            this.skip();
            return;
          }

          if (isReference(node, parent)) {
            var ref$1 = flatten(node);
            var name$1 = ref$1.name;
            var keypath = ref$1.keypath;
            var handled = handleReference(node, name$1, keypath);
            if (handled) {
              this.skip();
            }
          }
        },
        leave: function leave(node) {
          if (node.scope) {
            scope = scope.parent;
          }
        }
      });

      if (newImports.size === 0) {
        return {
          code: code,
          ast: ast,
          map: sourceMap ? magicString.generateMap({ hires: true }) : null
        };
      }
      var importBlock = Array.from(newImports.values()).join('\n\n');

      magicString.prepend((importBlock + "\n\n"));

      return {
        code: magicString.toString(),
        map: sourceMap ? magicString.generateMap({ hires: true }) : null
      };
    }
  };
}

export { inject as default };
//# sourceMappingURL=index.js.map
