"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return isKeyframeRule;
    }
});
function isKeyframeRule(rule) {
    return rule.parent && rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name);
}
