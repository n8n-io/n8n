/**
 * The entity type name for WPX comments.
 */
export const WPX_COMMENT_TYPE = 'WpxComment';
/**
 * Type guard to check if an entity is a WpxComment.
 */
export function isWpxComment(entity) {
    return entity?.type?.toLowerCase() === WPX_COMMENT_TYPE.toLowerCase();
}
/**
 * Factory function to create a WpxComment entity.
 */
export function createWpxComment(odataId, documentId, initiatingCommentId, subjectCommentId) {
    return {
        type: 'WpxComment',
        odataId,
        documentId,
        initiatingCommentId,
        subjectCommentId,
    };
}
//# sourceMappingURL=wpx-comment.js.map