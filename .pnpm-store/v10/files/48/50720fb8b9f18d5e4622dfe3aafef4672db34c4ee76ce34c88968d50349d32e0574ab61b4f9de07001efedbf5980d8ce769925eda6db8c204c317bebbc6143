"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagDescriptionOverride = void 0;
const utils_1 = require("../../utils");
const TagDescriptionOverride = ({ tagNames }) => {
    return {
        Tag: {
            leave(tag, { report }) {
                if (!tagNames)
                    throw new Error(`Parameter "tagNames" is not provided for "tag-description-override" rule`);
                if (tagNames[tag.name]) {
                    try {
                        tag.description = (0, utils_1.readFileAsStringSync)(tagNames[tag.name]);
                    }
                    catch (e) {
                        report({
                            message: `Failed to read markdown override file for tag "${tag.name}".\n${e.message}`,
                        });
                    }
                }
            },
        },
    };
};
exports.TagDescriptionOverride = TagDescriptionOverride;
