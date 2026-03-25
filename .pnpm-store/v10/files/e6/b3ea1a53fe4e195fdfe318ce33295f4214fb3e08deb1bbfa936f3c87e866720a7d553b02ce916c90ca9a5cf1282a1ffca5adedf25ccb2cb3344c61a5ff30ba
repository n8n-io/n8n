"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handleMjmlConfig;
exports.handleMjmlConfigComponents = handleMjmlConfigComponents;
exports.readMjmlConfig = readMjmlConfig;
exports.registerCustomComponent = registerCustomComponent;
exports.resolveComponentPath = resolveComponentPath;
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _mjmlValidator = require("mjml-validator");
var _components = require("../components");
function readMjmlConfig(configPathOrDir = process.cwd()) {
  let componentRootPath = process.cwd();
  let mjmlConfigPath = configPathOrDir;
  try {
    mjmlConfigPath = _path.default.basename(configPathOrDir).match(/^\.mjmlconfig(\.js)?$/) ? _path.default.resolve(configPathOrDir) : _path.default.resolve(configPathOrDir, '.mjmlconfig');
    componentRootPath = _path.default.dirname(mjmlConfigPath);
    const fullPath = _path.default.resolve(mjmlConfigPath);
    let mjmlConfig;
    if (_path.default.extname(mjmlConfigPath) === '.js') {
      delete require.cache[fullPath];
      mjmlConfig = require(fullPath); // eslint-disable-line global-require, import/no-dynamic-require
    } else {
      mjmlConfig = JSON.parse(_fs.default.readFileSync(fullPath, 'utf8'));
    }
    return {
      mjmlConfig,
      componentRootPath
    };
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error('Error reading mjmlconfig : ', e); // eslint-disable-line no-console
    }
    return {
      mjmlConfig: {
        packages: [],
        options: {}
      },
      mjmlConfigPath,
      componentRootPath,
      error: e
    };
  }
}
function resolveComponentPath(compPath, componentRootPath) {
  if (!compPath) {
    return null;
  }
  if (!compPath.startsWith('.') && !_path.default.isAbsolute(compPath)) {
    try {
      return require.resolve(compPath);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        console.error('Error resolving custom component path : ', e); // eslint-disable-line no-console
        return null;
      }
      // we got a 'MODULE_NOT_FOUND' error
      try {
        // try again as relative path to node_modules: (this may be necessary if mjml is installed globally or by npm link)
        return resolveComponentPath(`./node_modules/${compPath}`, componentRootPath);
      } catch (e) {
        //  try again as a plain local path:
        return resolveComponentPath(`./${compPath}`, componentRootPath);
      }
    }
  }
  return require.resolve(_path.default.resolve(componentRootPath, compPath));
}
function registerCustomComponent(comp, registerCompFn = _components.registerComponent) {
  if (comp instanceof Function) {
    registerCompFn(comp);
  } else {
    const compNames = Object.keys(comp); // this approach handles both an array and an object (like the mjml-accordion default export)
    compNames.forEach(compName => {
      registerCustomComponent(comp[compName], registerCompFn);
    });
  }
}
function handleMjmlConfigComponents(packages, componentRootPath, registerCompFn) {
  const result = {
    success: [],
    failures: []
  };
  packages.forEach(compPath => {
    let resolvedPath = compPath;
    try {
      resolvedPath = resolveComponentPath(compPath, componentRootPath);
      if (resolvedPath) {
        const requiredComp = require(resolvedPath); // eslint-disable-line global-require, import/no-dynamic-require
        registerCustomComponent(requiredComp.default || requiredComp, registerCompFn);
        (0, _mjmlValidator.registerDependencies)((requiredComp.default || requiredComp).dependencies || {});
        result.success.push(compPath);
      }
    } catch (e) {
      result.failures.push({
        error: e,
        compPath
      });
      if (e.code === 'ENOENT' || e.code === 'MODULE_NOT_FOUND') {
        console.error('Missing or unreadable custom component : ', resolvedPath); // eslint-disable-line no-console
      } else {
        // eslint-disable-next-line no-console
        console.error('Error when registering custom component : ', resolvedPath, e);
      }
    }
  });
  return result;
}
function handleMjmlConfig(configPathOrDir = process.cwd(), registerCompFn = _components.registerComponent) {
  const {
    mjmlConfig: {
      packages
    },
    componentRootPath,
    error
  } = readMjmlConfig(configPathOrDir);
  if (error) return {
    error
  };
  return handleMjmlConfigComponents(packages, componentRootPath, registerCompFn);
}