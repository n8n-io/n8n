"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function transformTagsIntoObject(tags) {
    return tags.reduce(function (acc, tag) {
        if (isContentTag(tag)) {
            var newTag = {
                description: tag.content,
                title: tag.title
            };
            tag = newTag;
        }
        var title = tag.title === 'param' ? 'params' : tag.title;
        if (acc[title]) {
            acc[title].push(tag);
        }
        else {
            acc[title] = [tag];
        }
        return acc;
    }, {});
}
exports.default = transformTagsIntoObject;
function isContentTag(tag) {
    return tag.content !== undefined;
}
