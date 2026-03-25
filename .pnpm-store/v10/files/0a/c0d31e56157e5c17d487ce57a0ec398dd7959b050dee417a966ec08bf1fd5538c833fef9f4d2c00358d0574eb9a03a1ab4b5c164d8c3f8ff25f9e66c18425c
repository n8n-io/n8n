"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WPX_COMMENT_TYPE = void 0;
exports.isWpxComment = isWpxComment;
exports.createWpxComment = createWpxComment;
/**
 * The entity type name for WPX comments.
 */
exports.WPX_COMMENT_TYPE = 'WpxComment';
/**
 * Type guard to check if an entity is a WpxComment.
 */
function isWpxComment(entity) {
    return entity?.type?.toLowerCase() === exports.WPX_COMMENT_TYPE.toLowerCase();
}
/**
 * Factory function to create a WpxComment entity.
 */
function createWpxComment(odataId, documentId, initiatingCommentId, subjectCommentId) {
    return {
        type: 'WpxComment',
        odataId,
        documentId,
        initiatingCommentId,
        subjectCommentId,
    };
}
//# sourceMappingURL=wpx-comment.js.map