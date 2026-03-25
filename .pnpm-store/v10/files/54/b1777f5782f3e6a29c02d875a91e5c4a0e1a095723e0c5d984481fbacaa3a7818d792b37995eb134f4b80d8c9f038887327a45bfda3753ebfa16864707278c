"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _normalizeScreens = require("../util/normalizeScreens");
const _buildMediaQuery = /*#__PURE__*/ _interop_require_default(require("../util/buildMediaQuery"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _default({ tailwindConfig: { theme  }  }) {
    return function(css) {
        css.walkAtRules("screen", (atRule)=>{
            let screen = atRule.params;
            let screens = (0, _normalizeScreens.normalizeScreens)(theme.screens);
            let screenDefinition = screens.find(({ name  })=>name === screen);
            if (!screenDefinition) {
                throw atRule.error(`No \`${screen}\` screen found.`);
            }
            atRule.name = "media";
            atRule.params = (0, _buildMediaQuery.default)(screenDefinition);
        });
    };
}
