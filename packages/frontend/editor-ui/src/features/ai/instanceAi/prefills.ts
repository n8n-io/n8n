import {
	INSTANCE_AI_PREFILL_TYPES,
	INSTANCE_AI_PREFILL_TYPE_FALLBACK,
	type InstanceAiPrefillType,
	type InstanceAiPrefillTypeReported,
} from '@n8n/api-types';

/**
 * Editor-side plumbing for the pre-fill taxonomy. The list of types lives in
 * `@n8n/api-types` (`INSTANCE_AI_PREFILL_TYPES`), beside the thread-source
 * taxonomy and the request schemas that enforce it; this module holds the
 * pieces only the editor needs and re-exports the vocabulary so call sites have
 * one import.
 *
 * A pre-fill is message text n8n wrote, not text the user typed. It is reported
 * on `User sent builder message` so analytics no longer has to recover the type
 * by string-matching the message body.
 *
 * Nothing can report an untagged pre-fill: `sendMessage` and
 * `PendingFirstMessage` require an authorship, suggestion catalogs intersect
 * their insert payload with `InstanceAiPrefillDeclaration`, and pre-filled text
 * reaches the composer through `setPrefill` rather than `setText`.
 */
export {
	INSTANCE_AI_PREFILL_TYPES,
	INSTANCE_AI_PREFILL_TYPE_FALLBACK,
	type InstanceAiPrefillType,
	type InstanceAiPrefillTypeReported,
	type InstanceAiPrefillPayload,
};

/** Who wrote the message being sent. Required at every send boundary. */
export type InstanceAiMessageAuthorship =
	| { kind: 'user_typed' }
	| {
			kind: 'prefill';
			prefillType: InstanceAiPrefillTypeReported;
			/** Catalog entry id, for types that have sub-items. */
			prefillId?: string;
			/**
			 * Composer pre-fills only. Auto-sent text is never shown before it
			 * goes, so the user cannot have edited it, and the one composer that
			 * can be edited derives this centrally.
			 */
			promptModified?: boolean;
	  };

/**
 * Every suggestion catalog intersects its own insert payload with this, so a
 * new catalog that forgets to say which pre-fill type its entries are fails
 * typecheck at the emit rather than reporting them as user-typed.
 */
export type InstanceAiPrefillDeclaration = { prefillType: InstanceAiPrefillType };

export const USER_TYPED_MESSAGE: InstanceAiMessageAuthorship = { kind: 'user_typed' };

const INSTANCE_AI_PREFILL_TYPE_SET: ReadonlySet<string> = new Set(INSTANCE_AI_PREFILL_TYPES);

export function isInstanceAiPrefillType(value: unknown): value is InstanceAiPrefillType {
	return typeof value === 'string' && INSTANCE_AI_PREFILL_TYPE_SET.has(value);
}

/**
 * Accepts the read-path fallback as well, for values coming back out of storage.
 * Surfaces declare `InstanceAiPrefillType` and so cannot reach for the fallback.
 */
export function isInstanceAiPrefillTypeReported(
	value: unknown,
): value is InstanceAiPrefillTypeReported {
	return isInstanceAiPrefillType(value) || value === INSTANCE_AI_PREFILL_TYPE_FALLBACK;
}

/**
 * Validates an authorship read back from storage. Everything that reaches
 * telemetry is checked, not just the discriminant: an unrecognised type would
 * widen the reported enum, and a non-string id or non-boolean flag would break
 * the event's schema.
 */
export function isMessageAuthorship(value: unknown): value is InstanceAiMessageAuthorship {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as {
		kind?: unknown;
		prefillType?: unknown;
		prefillId?: unknown;
		promptModified?: unknown;
	};
	if (candidate.kind === 'user_typed') return true;
	if (candidate.kind !== 'prefill') return false;
	if (!isInstanceAiPrefillTypeReported(candidate.prefillType)) return false;
	if (candidate.prefillId !== undefined && typeof candidate.prefillId !== 'string') return false;
	return candidate.promptModified === undefined || typeof candidate.promptModified === 'boolean';
}
