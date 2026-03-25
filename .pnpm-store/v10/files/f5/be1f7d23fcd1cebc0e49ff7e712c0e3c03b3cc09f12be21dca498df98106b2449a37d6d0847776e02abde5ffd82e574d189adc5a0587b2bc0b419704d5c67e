"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "findAtConfigPath", {
    enumerable: true,
    get: function() {
        return findAtConfigPath;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function findAtConfigPath(root, result) {
    let configPath = null;
    let relativeTo = null;
    root.walkAtRules("config", (rule)=>{
        var _rule_source;
        var _rule_source_input_file, _ref;
        relativeTo = (_ref = (_rule_source_input_file = (_rule_source = rule.source) === null || _rule_source === void 0 ? void 0 : _rule_source.input.file) !== null && _rule_source_input_file !== void 0 ? _rule_source_input_file : result.opts.from) !== null && _ref !== void 0 ? _ref : null;
        if (relativeTo === null) {
            throw rule.error("The `@config` directive cannot be used without setting `from` in your PostCSS config.");
        }
        if (configPath) {
            throw rule.error("Only one `@config` directive is allowed per file.");
        }
        let matches = rule.params.match(/(['"])(.*?)\1/);
        if (!matches) {
            throw rule.error("A path is required when using the `@config` directive.");
        }
        let inputPath = matches[2];
        if (_path.default.isAbsolute(inputPath)) {
            throw rule.error("The `@config` directive cannot be used with an absolute path.");
        }
        configPath = _path.default.resolve(_path.default.dirname(relativeTo), inputPath);
        if (!_fs.default.existsSync(configPath)) {
            throw rule.error(`The config file at "${inputPath}" does not exist. Make sure the path is correct and the file exists.`);
        }
        rule.remove();
    });
    return configPath ? configPath : null;
}
