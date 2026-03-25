'use strict';
var YAMLException = (function () {
    function YAMLException(reason, mark, isWarning) {
        if (mark === void 0) { mark = null; }
        if (isWarning === void 0) { isWarning = false; }
        this.name = 'YAMLException';
        this.reason = reason;
        this.mark = mark;
        this.message = this.toString(false);
        this.isWarning = isWarning;
    }
    YAMLException.isInstance = function (instance) {
        if (instance != null && instance.getClassIdentifier
            && typeof (instance.getClassIdentifier) == "function") {
            for (var _i = 0, _a = instance.getClassIdentifier(); _i < _a.length; _i++) {
                var currentIdentifier = _a[_i];
                if (currentIdentifier == YAMLException.CLASS_IDENTIFIER)
                    return true;
            }
        }
        return false;
    };
    YAMLException.prototype.getClassIdentifier = function () {
        var superIdentifiers = [];
        return superIdentifiers.concat(YAMLException.CLASS_IDENTIFIER);
    };
    YAMLException.prototype.toString = function (compact) {
        if (compact === void 0) { compact = false; }
        var result;
        result = 'JS-YAML: ' + (this.reason || '(unknown reason)');
        if (!compact && this.mark) {
            result += ' ' + this.mark.toString();
        }
        return result;
    };
    YAMLException.CLASS_IDENTIFIER = "yaml-ast-parser.YAMLException";
    return YAMLException;
}());
module.exports = YAMLException;
//# sourceMappingURL=exception.js.map