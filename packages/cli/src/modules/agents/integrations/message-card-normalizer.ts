import { z } from 'zod';

type ComponentText = string | { text?: string; [key: string]: unknown };

export const cardTextSchema = z.union([
	z.string(),
	z
		.object({
			type: z.string().optional(),
			text: z.string(),
		})
		.passthrough(),
]);

export const incomingMessageOptionSchema = z
	.object({
		text: cardTextSchema.optional(),
		value: z.string().optional(),
		description: cardTextSchema.optional(),
	})
	.passthrough();

export const incomingMessageElementSchema = z
	.object({
		type: z.string(),
		text: cardTextSchema.optional(),
		value: z.string().optional(),
		style: z.string().optional(),
		action_id: z.string().optional(),
		placeholder: cardTextSchema.optional(),
		options: z.array(incomingMessageOptionSchema).optional(),
	})
	.passthrough();

export const incomingMessageBlockSchema = z
	.object({
		type: z.string(),
		text: cardTextSchema.optional(),
		fields: z.array(cardTextSchema).optional(),
		elements: z.array(incomingMessageElementSchema).optional(),
		image_url: z.string().optional(),
		alt_text: z.string().optional(),
	})
	.passthrough();

export interface GenericCardComponent {
	type: string;
	text?: ComponentText;
	label?: string;
	value?: string;
	style?: string;
	url?: string;
	altText?: string;
	placeholder?: string;
	options?: Array<{ label: string; value: string; description?: string }>;
	fields?: Array<{ label: string; value: string }>;
	[key: string]: unknown;
}

export interface GenericCardPayload {
	awaitResponse?: boolean;
	title?: string;
	message?: string;
	components: GenericCardComponent[];
}

export interface GenericMessagePayload {
	text?: string;
	card?: GenericCardPayload;
	blocks?: IncomingMessageBlock[];
	[key: string]: unknown;
}

export interface IncomingMessageBlock {
	type: string;
	text?: ComponentText;
	fields?: ComponentText[];
	elements?: IncomingMessageElement[];
	image_url?: string;
	alt_text?: string;
	[key: string]: unknown;
}

export interface IncomingMessageElement {
	type: string;
	text?: ComponentText;
	value?: string;
	style?: string;
	action_id?: string;
	placeholder?: ComponentText;
	options?: IncomingMessageOption[];
	[key: string]: unknown;
}

export interface IncomingMessageOption {
	text?: ComponentText;
	value?: string;
	description?: ComponentText;
	[key: string]: unknown;
}

export function normalizeMessagePayload(message: GenericMessagePayload): GenericMessagePayload {
	if (message.card || !message.blocks?.length) return message;

	const card = blocksToCard(message.blocks, message.text);
	const { blocks: _blocks, ...rest } = message;
	return { ...rest, card };
}

export function messageAwaitsResponse(message: GenericMessagePayload | undefined): boolean {
	const normalizedMessage = message ? normalizeMessagePayload(message) : undefined;
	const card = normalizedMessage?.card;
	if (card?.awaitResponse === true) return true;
	return (
		card?.components.some((component) =>
			['button', 'select', 'radio_select'].includes(component.type),
		) ?? false
	);
}

function blocksToCard(blocks: IncomingMessageBlock[], fallbackTitle?: string): GenericCardPayload {
	const components: GenericCardComponent[] = [];
	let title = fallbackTitle;

	for (const block of blocks) {
		switch (block.type) {
			case 'header':
				title = textToString(block.text) ?? title;
				break;
			case 'section':
				appendSectionBlock(block, components);
				break;
			case 'divider':
				components.push({ type: 'divider' });
				break;
			case 'image':
				if (typeof block.image_url === 'string') {
					components.push({
						type: 'image',
						url: block.image_url,
						altText: typeof block.alt_text === 'string' ? block.alt_text : undefined,
					});
				}
				break;
			case 'actions':
				appendActionElements(block.elements, components);
				break;
			case 'context':
				appendContextBlock(block, components);
				break;
		}
	}

	return { title, components };
}

function appendSectionBlock(block: IncomingMessageBlock, components: GenericCardComponent[]): void {
	const text = textToString(block.text);
	if (text) components.push({ type: 'section', text });

	if (block.fields?.length) {
		components.push({
			type: 'fields',
			fields: block.fields
				.map((field, index) => ({ label: `Field ${index + 1}`, value: textToString(field) }))
				.filter((field): field is { label: string; value: string } => field.value !== undefined),
		});
	}
}

function appendContextBlock(block: IncomingMessageBlock, components: GenericCardComponent[]): void {
	const text = block.elements
		?.map((element) => textToString(element.text))
		.filter(Boolean)
		.join('\n');
	if (text) components.push({ type: 'context', text });
}

function appendActionElements(
	elements: IncomingMessageElement[] | undefined,
	components: GenericCardComponent[],
): void {
	for (const element of elements ?? []) {
		if (element.type === 'button') {
			const label =
				textToString(element.text) ?? stringValue(element.value) ?? stringValue(element.action_id);
			components.push({
				type: 'button',
				label,
				value: stringValue(element.value) ?? stringValue(element.action_id) ?? label,
				style: buttonStyle(element.style),
			});
			continue;
		}

		if (element.type === 'static_select') {
			components.push({
				type: 'select',
				id: stringValue(element.action_id),
				label: textToString(element.placeholder) ?? 'Select',
				options: toSelectOptions(element.options),
			});
		}
	}
}

function toSelectOptions(
	options: IncomingMessageOption[] | undefined,
): Array<{ label: string; value: string; description?: string }> {
	const mappedOptions: Array<{ label: string; value: string; description?: string }> = [];

	for (const option of options ?? []) {
		const label = textToString(option.text);
		const value = stringValue(option.value);
		if (!label || !value) continue;

		const description = textToString(option.description);
		mappedOptions.push(
			description === undefined ? { label, value } : { label, value, description },
		);
	}

	return mappedOptions;
}

function textToString(text: unknown): string | undefined {
	if (typeof text === 'string') return text;
	if (text && typeof text === 'object' && 'text' in text) {
		const value = (text as { text?: unknown }).text;
		if (typeof value === 'string') return value;
	}
	return undefined;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function buttonStyle(style: unknown): 'primary' | 'danger' | undefined {
	return style === 'primary' || style === 'danger' ? style : undefined;
}
