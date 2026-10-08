import type { InterruptibleToolContext } from '@n8n/agents';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	instanceAiConfirmationSeveritySchema,
	type InstanceAiConfirmRequest,
	type InstanceAiPermissionMode,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { UserError } from 'n8n-workflow';
import z from 'zod';

const offeredValueSchema = z.union([z.string(), z.boolean()]);

type OfferedValue = z.infer<typeof offeredValueSchema>;

/**
 * The options that the user chose on a card. The limits are the same as in the
 * `capabilityDecision` kind of the confirm DTO, because an answer that the DTO rejects
 * reaches the tool as the raw request body.
 */
const chosenValuesSchema = z.record(
	z.string().max(128),
	z.union([z.string().max(2048), z.boolean()]),
);

/** A card that the n8n Assistant shows before a capability acts. */
export type CapabilityCard = {
	message: string;
	severity: 'info' | 'warning' | 'destructive';
	/** Display name of the resource that the action changes, shown in the card title. */
	resourceName?: string;
	/** More payload fields for the card renderer. */
	fields?: Record<string, unknown>;
	/** The values that the card offers for each answer field. Other answers are rejected. */
	offered?: Record<string, readonly OfferedValue[]>;
};

/** The answer to a card after normalisation. */
export type CapabilityAnswer = { approved: boolean } & Record<string, unknown>;

/** The resume data of the `capabilityDecision` confirmation, without its kind. */
type CapabilityDecision = Omit<
	Extract<InstanceAiConfirmRequest, { kind: 'capabilityDecision' }>,
	'kind'
>;

/**
 * The default answer: approval, and the options chosen on the card in `values`. It also takes
 * a plain approval. `satisfies` makes a change of the wire shape fail typecheck here.
 */
export const DEFAULT_CAPABILITY_ANSWER_SCHEMA: z.ZodType<CapabilityAnswer> = z.object({
	approved: z.boolean(),
	values: chosenValuesSchema.optional(),
}) satisfies z.ZodType<CapabilityDecision>;

/**
 * The suspend payload. `requestId`, `message` and `severity` make the frontend show the
 * Assistant confirmation card. The checkpoint keeps `offered` on the server, so that the
 * answer is checked against what the card offered and not against what the client sends.
 */
export const capabilityCardPayloadSchema = z
	.object({
		requestId: z.string(),
		message: z.string(),
		severity: instanceAiConfirmationSeveritySchema,
		resourceName: z.string().optional(),
		offered: z.record(z.array(offeredValueSchema)),
	})
	.passthrough();

export type CapabilityCardPayload = z.infer<typeof capabilityCardPayloadSchema>;

export type ConfirmationContext = InterruptibleToolContext<CapabilityCardPayload, CapabilityAnswer>;

export type ConfirmationOptions<A> = {
	/** Validates input with the input schema of the tool. Throws a UserError for invalid input. */
	parse: (input: unknown) => A;
	/** The admin permission mode for these arguments. */
	mode: (args: A) => InstanceAiPermissionMode;
	confirm?: (args: A) => Promise<CapabilityCard | undefined>;
	/** The card for `require_approval` when `confirm` returns no card. */
	defaultCard: () => CapabilityCard;
	/** Only `values` of the answer is checked against `offered`. */
	answerSchema: z.ZodType<CapabilityAnswer>;
	/** `card` is the suspend payload from the checkpoint, so the client cannot change it. */
	applyAnswer?: (args: A, answer: CapabilityAnswer, card: CapabilityCardPayload) => A;
	/** Runs the capability handler with arguments that `parse` returned. */
	run: (args: A) => Promise<unknown>;
};

export const DENIED_MESSAGE = 'The user did not approve this action. Nothing was changed.';

export const BLOCKED_MESSAGE =
	'An admin has blocked this action for the n8n Assistant. Nothing was changed.';

/** The admin permission mode. Without a permission key, the capability decides with `confirm`. */
export function resolvePermissionMode(
	key: keyof InstanceAiPermissions | undefined,
	permissions: InstanceAiPermissions | undefined,
): InstanceAiPermissionMode {
	if (key === undefined) return 'always_allow';
	return permissions?.[key] ?? DEFAULT_INSTANCE_AI_PERMISSIONS[key];
}

function toCardPayload(card: CapabilityCard): CapabilityCardPayload {
	const offered = Object.fromEntries(
		Object.entries(card.offered ?? {}).map(([field, values]) => [field, [...values]]),
	);
	// The fixed keys come last, so that renderer fields cannot replace them.
	return {
		...card.fields,
		requestId: generateNanoId(),
		message: card.message,
		severity: card.severity,
		...(card.resourceName !== undefined ? { resourceName: card.resourceName } : {}),
		offered,
	};
}

async function cardFor<A>(
	args: A,
	mode: InstanceAiPermissionMode,
	options: ConfirmationOptions<A>,
): Promise<CapabilityCard | undefined> {
	const card = await options.confirm?.(args);
	if (card === undefined && mode === 'require_approval') return options.defaultCard();
	return card;
}

function parseAnswer(schema: z.ZodType<CapabilityAnswer>, resumeData: unknown): CapabilityAnswer {
	const parsed = schema.safeParse(resumeData);
	if (!parsed.success) throw new UserError('The answer to the confirmation card is not valid');
	return parsed.data;
}

/**
 * Rejects a chosen value that the card did not offer. The offer comes from the checkpoint.
 * Returns the card of the checkpoint.
 */
export function assertAnswerWasOffered(
	answer: CapabilityAnswer,
	suspendPayload: unknown,
): CapabilityCardPayload {
	const card = capabilityCardPayloadSchema.safeParse(suspendPayload);
	if (!card.success) throw new UserError('The confirmation card of this call is missing');
	const chosen = chosenValuesSchema.optional().safeParse(answer.values);
	if (!chosen.success) throw new UserError('The answer to the confirmation card is not valid');

	const { offered } = card.data;
	for (const [field, value] of Object.entries(chosen.data ?? {})) {
		const options = Object.hasOwn(offered, field) ? offered[field] : [];
		if (!options.includes(value)) {
			throw new UserError(`The confirmation card did not offer this value for "${field}"`);
		}
	}
	return card.data;
}

const blocked = () => ({ denied: true, message: BLOCKED_MESSAGE });

async function runResumedCall<A>(
	args: A,
	ctx: ConfirmationContext,
	options: ConfirmationOptions<A>,
): Promise<unknown> {
	const answer = parseAnswer(options.answerSchema, ctx.resumeData);
	if (!answer.approved) return { denied: true, message: DENIED_MESSAGE };
	const card = assertAnswerWasOffered(answer, ctx.suspendPayload);

	// The answer can change the arguments, and so the permission that applies. Validate the
	// arguments that the handler receives, and read their mode before the handler runs.
	const applied = options.parse(
		options.applyAnswer ? options.applyAnswer(args, answer, card) : args,
	);
	if (options.mode(applied) === 'blocked') return blocked();
	return await options.run(applied);
}

/**
 * Runs a capability on the Assistant surface. A blocked action never runs. Otherwise the
 * first call suspends with a card when one is needed, and the resumed call runs only after
 * the user approves with values that the card offered.
 */
export async function runWithConfirmation<A>(
	input: unknown,
	ctx: ConfirmationContext,
	options: ConfirmationOptions<A>,
): Promise<unknown> {
	const args = options.parse(input);
	// Read the mode on every call, so that a block set while the card waits applies too.
	const mode = options.mode(args);
	if (mode === 'blocked') return blocked();
	if (ctx.resumeData !== undefined) return await runResumedCall(args, ctx, options);

	const card = await cardFor(args, mode, options);
	if (card === undefined) return await options.run(args);
	return await ctx.suspend(toCardPayload(card));
}
