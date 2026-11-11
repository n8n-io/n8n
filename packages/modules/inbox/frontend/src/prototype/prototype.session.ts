import type { InboxState } from '@n8n/api-types';
import { reactive } from 'vue';

export type PrototypeComment = {
	id: string;
	body: string;
	createdAt: string;
	firstName: string;
	lastName: string;
	/** A request for changes shows as a decision in the feed. Without a kind, it is a comment. */
	kind?: 'changes_requested';
};

type PrototypePatch = {
	title?: string;
	state?: InboxState;
	description?: string;
	comments?: PrototypeComment[];
};

/** The row styles of the New list. The first one is the card list of the product. */
export const PROTOTYPE_LIST_VARIANTS = ['cards', 'dividers', 'email', 'compact'] as const;
export type PrototypeListVariant = (typeof PROTOTYPE_LIST_VARIANTS)[number];

/** Local edits for the reviews prototype. Nothing here is saved. */
export const prototypeSession = reactive({
	active: false,
	patches: {} as Record<string, PrototypePatch>,
	listVariant: 'cards' as PrototypeListVariant,
	/** The ids of the items that the viewer opened. The other open items are unread. */
	readIds: [] as string[],
});

export function prototypeTitle(id: string, fallback: string) {
	return prototypeSession.patches[id]?.title ?? fallback;
}

export function prototypeState(id: string, fallback: InboxState): InboxState {
	return prototypeSession.patches[id]?.state ?? fallback;
}

export function renamePrototypeItem(id: string, title: string) {
	const next = title.trim();
	if (!next) return;
	prototypeSession.patches[id] = { ...prototypeSession.patches[id], title: next };
}

export function setPrototypeState(id: string, state: InboxState) {
	prototypeSession.patches[id] = { ...prototypeSession.patches[id], state };
}

export function prototypeDescription(id: string, fallback: string) {
	const patch = prototypeSession.patches[id];
	if (patch && 'description' in patch && patch.description !== undefined) return patch.description;
	return fallback;
}

export function setPrototypeDescription(id: string, description: string) {
	prototypeSession.patches[id] = { ...prototypeSession.patches[id], description };
}

export function prototypeComments(id: string): PrototypeComment[] {
	return prototypeSession.patches[id]?.comments ?? [];
}

export function addPrototypeComment(id: string, comment: PrototypeComment) {
	const comments = prototypeSession.patches[id]?.comments ?? [];
	prototypeSession.patches[id] = {
		...prototypeSession.patches[id],
		comments: [...comments, comment],
	};
}

export function isPrototypeUnread(id: string, state: InboxState) {
	return state === 'open' && !prototypeSession.readIds.includes(id);
}

export function markPrototypeRead(id: string) {
	if (!prototypeSession.readIds.includes(id)) prototypeSession.readIds.push(id);
}

export function markPrototypeUnread(id: string) {
	const index = prototypeSession.readIds.indexOf(id);
	if (index >= 0) prototypeSession.readIds.splice(index, 1);
}
