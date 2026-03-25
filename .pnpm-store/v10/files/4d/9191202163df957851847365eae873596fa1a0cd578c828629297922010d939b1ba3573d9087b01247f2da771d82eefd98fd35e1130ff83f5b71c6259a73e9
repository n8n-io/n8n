"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    useCustomJiti: function() {
        return useCustomJiti;
    },
    loadConfig: function() {
        return loadConfig;
    }
});
const _jiti = /*#__PURE__*/ _interop_require_default(require("jiti"));
const _sucrase = require("sucrase");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let jiti = null;
function useCustomJiti(_jiti) {
    jiti = _jiti();
}
function lazyJiti() {
    return jiti !== null && jiti !== void 0 ? jiti : jiti = (0, _jiti.default)(__filename, {
        interopDefault: true,
        transform: (opts)=>{
            // Sucrase can't transform import.meta so we have to use Babel
            if (opts.source.includes("import.meta")) {
                return require("jiti/dist/babel.js")(opts);
            }
            return (0, _sucrase.transform)(opts.source, {
                transforms: [
                    "typescript",
                    "imports"
                ]
            });
        }
    });
}
function loadConfig(path) {
    let config = function() {
        try {
            return path ? require(path) : {};
        } catch  {
            return lazyJiti()(path);
        }
    }();
    var _config_default;
    return (_config_default = config.default) !== null && _config_default !== void 0 ? _config_default : config;
}
