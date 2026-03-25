"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return createUtilityPlugin;
    }
});
const _transformThemeValue = /*#__PURE__*/ _interop_require_default(require("./transformThemeValue"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function createUtilityPlugin(themeKey, utilityVariations = [
    [
        themeKey,
        [
            themeKey
        ]
    ]
], { filterDefault =false , ...options } = {}) {
    let transformValue = (0, _transformThemeValue.default)(themeKey);
    return function({ matchUtilities , theme  }) {
        for (let utilityVariation of utilityVariations){
            let group = Array.isArray(utilityVariation[0]) ? utilityVariation : [
                utilityVariation
            ];
            var _theme;
            matchUtilities(group.reduce((obj, [classPrefix, properties])=>{
                return Object.assign(obj, {
                    [classPrefix]: (value)=>{
                        return properties.reduce((obj, name)=>{
                            if (Array.isArray(name)) {
                                return Object.assign(obj, {
                                    [name[0]]: name[1]
                                });
                            }
                            return Object.assign(obj, {
                                [name]: transformValue(value)
                            });
                        }, {});
                    }
                });
            }, {}), {
                ...options,
                values: filterDefault ? Object.fromEntries(Object.entries((_theme = theme(themeKey)) !== null && _theme !== void 0 ? _theme : {}).filter(([modifier])=>modifier !== "DEFAULT")) : theme(themeKey)
            });
        }
    };
}
