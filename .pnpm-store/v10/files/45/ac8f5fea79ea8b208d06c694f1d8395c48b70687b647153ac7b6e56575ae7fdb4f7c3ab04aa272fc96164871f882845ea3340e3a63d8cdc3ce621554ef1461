"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoDescriptionOverride = void 0;
const utils_1 = require("../../utils");
const InfoDescriptionOverride = ({ filePath }) => {
    return {
        Info: {
            leave(info, { report, location }) {
                if (!filePath)
                    throw new Error(`Parameter "filePath" is not provided for "info-description-override" rule`);
                try {
                    info.description = (0, utils_1.readFileAsStringSync)(filePath);
                }
                catch (e) {
                    report({
                        message: `Failed to read markdown override file for "info.description".\n${e.message}`,
                        location: location.child('description'),
                    });
                }
            },
        },
    };
};
exports.InfoDescriptionOverride = InfoDescriptionOverride;
