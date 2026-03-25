import { MagicastError, generateCode, parseExpression, builders } from './index.mjs';
import 'node:fs';
import 'fs';
import 'source-map-js';
import '@babel/parser';

function deepMergeObject(magicast, object) {
  if (typeof object === "object") {
    for (const key in object) {
      if (typeof magicast[key] === "object" && typeof object[key] === "object") {
        deepMergeObject(magicast[key], object[key]);
      } else {
        magicast[key] = object[key];
      }
    }
  }
}

function getDefaultExportOptions(magicast) {
  return configFromNode(magicast.exports.default);
}
function getConfigFromVariableDeclaration(magicast) {
  if (magicast.exports.default.$type !== "identifier") {
    throw new MagicastError(
      `Not supported: Cannot modify this kind of default export (${magicast.exports.default.$type})`
    );
  }
  const configDecalarationId = magicast.exports.default.$name;
  for (const node of magicast.$ast.body) {
    if (node.type === "VariableDeclaration") {
      for (const declaration of node.declarations) {
        if (declaration.id.type === "Identifier" && declaration.id.name === configDecalarationId && declaration.init) {
          const init = declaration.init.type === "TSSatisfiesExpression" ? declaration.init.expression : declaration.init;
          const code = generateCode(init).code;
          const configExpression = parseExpression(code);
          return {
            declaration,
            config: configFromNode(configExpression)
          };
        }
      }
    }
  }
  throw new MagicastError("Couldn't find config declaration");
}
function configFromNode(node) {
  if (node.$type === "function-call") {
    return node.$args[0];
  }
  return node;
}

function addNuxtModule(magicast, name, optionsKey, options) {
  const config = getDefaultExportOptions(magicast);
  config.modules || (config.modules = []);
  if (!config.modules.includes(name)) {
    config.modules.push(name);
  }
  if (optionsKey) {
    config[optionsKey] || (config[optionsKey] = {});
    deepMergeObject(config[optionsKey], options);
  }
}

function addVitePlugin(magicast, plugin) {
  const config = getDefaultExportOptions(magicast);
  if (config.$type === "identifier") {
    insertPluginIntoVariableDeclarationConfig(magicast, plugin);
  } else {
    insertPluginIntoConfig(plugin, config);
  }
  magicast.imports.$prepend({
    from: plugin.from,
    local: plugin.constructor,
    imported: plugin.imported || "default"
  });
  return true;
}
function findVitePluginCall(magicast, plugin) {
  const _plugin = typeof plugin === "string" ? { from: plugin, imported: "default" } : plugin;
  const config = getDefaultExportOptions(magicast);
  const constructor = magicast.imports.$items.find(
    (i) => i.from === _plugin.from && i.imported === (_plugin.imported || "default")
  )?.local;
  return config.plugins?.find(
    (p) => p && p.$type === "function-call" && p.$callee === constructor
  );
}
function updateVitePluginConfig(magicast, plugin, handler) {
  const item = findVitePluginCall(magicast, plugin);
  if (!item) {
    return false;
  }
  if (typeof handler === "function") {
    item.$args = handler(item.$args);
  } else if (item.$args[0]) {
    deepMergeObject(item.$args[0], handler);
  } else {
    item.$args[0] = handler;
  }
  return true;
}
function insertPluginIntoVariableDeclarationConfig(magicast, plugin) {
  const { config: configObject, declaration } = getConfigFromVariableDeclaration(magicast);
  insertPluginIntoConfig(plugin, configObject);
  if (declaration.init) {
    if (declaration.init.type === "ObjectExpression") {
      declaration.init = generateCode(configObject).code;
    } else if (declaration.init.type === "CallExpression" && declaration.init.callee.type === "Identifier") {
      declaration.init = generateCode(
        builders.functionCall(declaration.init.callee.name, configObject)
      ).code;
    } else if (declaration.init.type === "TSSatisfiesExpression") {
      if (declaration.init.expression.type === "ObjectExpression") {
        declaration.init.expression = generateCode(configObject).code;
      }
      if (declaration.init.expression.type === "CallExpression" && declaration.init.expression.callee.type === "Identifier") {
        declaration.init.expression = generateCode(
          builders.functionCall(
            declaration.init.expression.callee.name,
            configObject
          )
        ).code;
      }
    }
  }
}
function insertPluginIntoConfig(plugin, config) {
  const insertionIndex = plugin.index ?? config.plugins?.length ?? 0;
  config.plugins || (config.plugins = []);
  config.plugins.splice(
    insertionIndex,
    0,
    plugin.options ? builders.functionCall(plugin.constructor, plugin.options) : builders.functionCall(plugin.constructor)
  );
}

export { addNuxtModule, addVitePlugin, deepMergeObject, findVitePluginCall, getConfigFromVariableDeclaration, getDefaultExportOptions, updateVitePluginConfig };
