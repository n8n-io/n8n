import {
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
} from '../../integration-origin-support';

export function buildLinearOriginDraft(
	{ subject }: OriginInput,
	decoded: DecodedThread,
): OriginDraft {
	return {
		type: 'linear',
		issueId: text(decoded.issueId),
		identifier: text(subject?.id),
		title: text(subject?.title),
		projectId: text(subject?.projectId),
	};
}
