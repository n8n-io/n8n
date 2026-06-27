import type { ReviewCommentAnchor } from '@n8n/api-types';

const METADATA_PATTERN = /^<!-- n8n-review:nodeId=([^;\s]+)(?:;jsonPath=([^\s]+))?\s*-->\n\n?/s;

/** Embeds review anchor metadata so comments can be reattached to nodes in the UI. */
export function encodeReviewCommentBody(body: string, anchor: ReviewCommentAnchor): string {
	const jsonPathPart = anchor.jsonPath ? `;jsonPath=${anchor.jsonPath}` : '';
	return `<!-- n8n-review:nodeId=${anchor.nodeId}${jsonPathPart} -->\n\n${body.trim()}`;
}

export function parseReviewCommentBody(body: string): {
	body: string;
	anchor?: ReviewCommentAnchor;
} {
	const match = METADATA_PATTERN.exec(body);
	if (!match) {
		return { body };
	}
	return {
		body: body.slice(match[0].length),
		anchor: {
			nodeId: match[1],
			jsonPath: match[2],
		},
	};
}
