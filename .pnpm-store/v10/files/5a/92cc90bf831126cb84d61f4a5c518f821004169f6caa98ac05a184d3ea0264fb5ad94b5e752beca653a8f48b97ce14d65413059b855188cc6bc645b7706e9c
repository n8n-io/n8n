import { _ as _inherits } from "./_inherits.js";
import { _ as _set_prototype_of } from "./_set_prototype_of.js";

function _wrap_reg_exp(re, groups) {
    _wrap_reg_exp = function(re, groups) {
        return new WrappedRegExp(re, undefined, groups);
    };
    var _super = RegExp.prototype;
    var _groups = new WeakMap();
    function WrappedRegExp(re, flags, groups) {
        var _re = new RegExp(re, flags);
        _groups.set(_re, groups || _groups.get(re));
        return _set_prototype_of(_re, WrappedRegExp.prototype);
    }
    _inherits(WrappedRegExp, RegExp);
    WrappedRegExp.prototype.exec = function(str) {
        var result = _super.exec.call(this, str);
        if (result) {
            result.groups = buildGroups(result, this);
            var indices = result.indices;
            if (indices) indices.groups = buildGroups(indices, this);
        }
        return result;
    };
    WrappedRegExp.prototype[Symbol.replace] = function(str, substitution) {
        if (typeof substitution === "string") {
            var groups = _groups.get(this);
            return _super[Symbol.replace].call(
                this,
                str,
                substitution.replace(/\$<([^>]+)>/g, function(_, name) {
                    var group = groups ? groups[name] : undefined;
                    if (group === undefined) return "";
                    return "$" + (Array.isArray(group) ? group.join("$") : group);
                })
            );
        }
        if (typeof substitution === "function") {
            var _this = this;
            return _super[Symbol.replace].call(this, str, function() {
                var args = arguments;
                if (typeof args[args.length - 1] !== "object") {
                    args = [].slice.call(args);
                    args.push(buildGroups(args, _this));
                }
                return substitution.apply(this, args);
            });
        }
        return _super[Symbol.replace].call(this, str, substitution);
    };
    function buildGroups(result, re) {
        var g = _groups.get(re);
        return Object.keys(g).reduce(function(groups, name) {
            var i = g[name];
            if (typeof i === "number") groups[name] = result[i];
            else {
                var k = 0;
                while (result[i[k]] === undefined && k + 1 < i.length) k++;
                groups[name] = result[i[k]];
            }
            return groups;
        }, Object.create(null));
    }
    return _wrap_reg_exp.apply(this, arguments);
}
export { _wrap_reg_exp as _ };
