"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagsAlphabetical = void 0;
const TagsAlphabetical = ({ ignoreCase = false }) => {
    return {
        Root(root, { report, location }) {
            if (!root.tags)
                return;
            for (let i = 0; i < root.tags.length - 1; i++) {
                if (getTagName(root.tags[i], ignoreCase) > getTagName(root.tags[i + 1], ignoreCase)) {
                    report({
                        message: 'The `tags` array should be in alphabetical order.',
                        location: location.child(['tags', i]),
                    });
                }
            }
        },
    };
};
exports.TagsAlphabetical = TagsAlphabetical;
function getTagName(tag, ignoreCase) {
    return ignoreCase ? tag.name.toLowerCase() : tag.name;
}
