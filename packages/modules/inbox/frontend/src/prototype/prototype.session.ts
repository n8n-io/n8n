import type { InboxState } from '@n8n/api-types';
import { reactive } from 'vue';

export type PrototypeComment = {
	id: string;
	body: string;
	createdAt: string;
	firstName: string;
	lastName: string;
};

type PrototypePatch = {
	title?: string;
	state?: InboxState;
	description?: string;
	comments?: PrototypeComment[];
};

/** Local edits for the reviews prototype. Nothing here is saved. */
export const prototypeSession = reactive({
	active: false,
	patches: {} as Record<string, PrototypePatch>,
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
