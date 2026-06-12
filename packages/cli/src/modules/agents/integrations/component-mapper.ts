import { Container } from '@n8n/di';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import { loadChatSdk } from './esm-loader';
import type { ButtonStyle, CardElement } from 'chat';

type ComponentText = string | { text?: string; [key: string]: unknown };

/**
 * Component type from agent SDK suspend/toMessage payloads.
 */
export interface SuspendComponent {
	type: string;
	text?: ComponentText;
	label?: string;
	value?: string;
	style?: ButtonStyle | string;
	url?: string;
	altText?: string;
	placeholder?: string;
	/** Accessory button on a section */
	button?: { label?: string; text?: ComponentText; value: string; style?: ButtonStyle | string };
	/** Options for select / radio_select components */
	options?: Array<{ label: string; value: string; description?: string }>;
	/** Fields for fields component */
	fields?: Array<{ label: string; value: string }>;
	/** Alias agents commonly use for fields component entries */
	items?: Array<{ label: string; value: string }>;
	/** Elements array for context components */
	elements?: Array<{ type: string; text?: ComponentText; url?: string; altText?: string }>;
	/** Allow additional properties from the payload */
	id?: string;
	[key: string]: unknown;
}

interface SuspendPayload {
	title?: string;
	message?: string;
	components: SuspendComponent[];
}

/**
 * JSON Schema shape passed to {@link ComponentMapper.toCard} when the suspend
 * payload comes from an integration action's interactive card.
 *
 * `wrapValueForSchema` inspects the top-level properties to pick the wrapping
 * convention — a schema with `{ type, value }` produces `{ type: 'button',
 * value: rawValue }` on click.
 */
export const INTERACTIVE_CARD_RESUME_JSON_SCHEMA = {
	type: 'object',
	properties: {
		type: { type: 'string' },
		id: { type: 'string' },
		value: { type: 'string' },
	},
} as const;

type ChatSdk = Awaited<ReturnType<typeof loadChatSdk>>;

export type ShortenCallback = (
	actionId: string,
	value: string,
) => Promise<{ id: string; value: string }>;

/** Shared state threaded through per-component render helpers. */
interface ComponentRenderContext {
	component: SuspendComponent;
	sdk: ChatSdk;
	runId: string;
	toolCallId: string;
	children: unknown[];
	buttons: unknown[];
	makeButton: (label: string, rawValue: string, style?: string) => Promise<unknown>;
}

/**
 * Converts agent SDK suspend payloads into Chat SDK Card elements.
 *
 * The `chat` package is ESM-only, so every method dynamically imports it
 * via the ESM loader to bypass TypeScript's CJS transform.
 */
export class ComponentMapper {
	/**
	 * Convert a suspend payload to a Chat SDK Card.
	 *
	 * Button values are JSON-encoded as the full resume payload that
	 * matches the tool's resume schema. This way the action handler
	 * can `JSON.parse(value)` and pass it directly — no guessing required.
	 *
	 * @param resumeSchema - JSON Schema from the tool's `.resume()` definition.
	 *   Used to wrap raw button values into the expected shape.
	 * @param platform - Integration type (e.g. 'slack', 'telegram') for component normalization.
	 */
	async toCard(
		payload: SuspendPayload,
		runId: string,
		toolCallId: string,
		resumeSchema?: unknown,
		shortenCallback?: ShortenCallback,
		platform?: string,
	): Promise<CardElement> {
		const sdk = await loadChatSdk();

		// Delegate per-platform normalization to the Integration implementation.
		const integration = platform ? Container.get(ChatIntegrationRegistry).get(platform) : undefined;
		const components = integration?.normalizeComponents?.(payload.components) ?? payload.components;

		const children: unknown[] = [];
		const buttons: unknown[] = [];
		const buttonIndex = { value: 0 };

		const makeButton = async (label: string, rawValue: string, style?: string) => {
			let id = `resume:${runId}:${toolCallId}:${buttonIndex.value++}`;
			let value = JSON.stringify(this.wrapValueForSchema(rawValue, resumeSchema));

			// For platforms with short callback limits (e.g. Telegram 64 bytes),
			// replace the full id/value with a short lookup key.
			if (shortenCallback) {
				const shortened = await shortenCallback(id, value);
				id = shortened.id;
				value = shortened.value;
			}

			return sdk.Button({
				id,
				label,
				...(isButtonStyle(style) ? { style } : {}),
				value,
			});
		};

		for (const component of components) {
			await this.appendComponent({
				component,
				sdk,
				runId,
				toolCallId,
				children,
				buttons,
				makeButton,
			});
		}

		if (buttons.length > 0) {
			children.push(sdk.Actions(buttons as never));
		}

		// Use message as title fallback if title isn't set
		const title = payload.title ?? payload.message;

		return sdk.Card({ title, children: children as never });
	}

	/** Dispatch a single component to its dedicated handler. */
	private async appendComponent(ctx: ComponentRenderContext): Promise<void> {
		const { component, children, buttons, makeButton } = ctx;
		switch (component.type) {
			case 'button':
				buttons.push(
					await makeButton(
						component.label ?? componentTextToString(component.text) ?? 'Action',
						component.value ?? '',
						component.style,
					),
				);
				return;
			case 'section':
				await this.appendSection(ctx);
				return;
			case 'divider':
				children.push(ctx.sdk.Divider());
				return;
			case 'image':
				this.appendImage(ctx);
				return;
			case 'context':
				this.appendContext(ctx);
				return;
			case 'select':
				this.appendSelect(ctx);
				return;
			case 'radio_select':
				this.appendRadioSelect(ctx);
				return;
			case 'fields':
				this.appendFields(ctx);
				return;
			// Unsupported types (text-input, select-input, modal) are silently dropped
			default:
				return;
		}
	}

	private async appendSection({
		component,
		sdk,
		children,
		makeButton,
	}: ComponentRenderContext): Promise<void> {
		const text = componentTextToString(component.text);
		if (text) {
			children.push(sdk.Section([sdk.CardText(text)] as never));
		}
		// Chat SDK adapters render interactive controls from Actions containers,
		// so section accessory buttons are emitted as adjacent actions.
		if (component.button) {
			children.push(
				sdk.Actions([
					await makeButton(
						component.button.label ?? componentTextToString(component.button.text) ?? 'Action',
						component.button.value,
						component.button.style,
					),
				] as never),
			);
		}
	}

	private appendImage({ component, sdk, children }: ComponentRenderContext): void {
		children.push(
			sdk.Image({
				url: component.url as string,
				alt: (component.altText as string) ?? 'image',
			}),
		);
	}

	private appendContext({ component, sdk, children }: ComponentRenderContext): void {
		// Context components can contain an elements array with text/image items.
		if (component.elements && Array.isArray(component.elements)) {
			for (const el of component.elements) {
				const text = componentTextToString(el.text);
				if (el.type === 'text' && text) {
					children.push(sdk.CardText(text));
				} else if (el.type === 'image' && el.url) {
					children.push(sdk.Image({ url: el.url, alt: el.altText ?? '' }));
				}
			}
		} else {
			const text = componentTextToString(component.text);
			if (!text) return;
			// Fallback: plain text context
			children.push(sdk.CardText(text));
		}
	}

	private appendSelect({
		component,
		sdk,
		runId,
		toolCallId,
		children,
	}: ComponentRenderContext): void {
		children.push(
			sdk.Actions([
				sdk.Select({
					id: `ri-sel:${component.id ?? 'select'}:${runId}:${toolCallId}`,
					label: component.label ?? 'Select',
					placeholder: component.placeholder,
					options: this.toSelectOptions(component),
				}),
			] as never),
		);
	}

	private appendRadioSelect({
		component,
		sdk,
		runId,
		toolCallId,
		children,
	}: ComponentRenderContext): void {
		children.push(
			sdk.Actions([
				sdk.RadioSelect({
					id: `ri-sel:${component.id ?? 'radio'}:${runId}:${toolCallId}`,
					label: component.label ?? 'Select',
					options: this.toSelectOptions(component),
				}),
			] as never),
		);
	}

	private appendFields({ component, sdk, children }: ComponentRenderContext): void {
		const fields = component.fields ?? component.items ?? [];
		if (fields.length === 0) return;

		const fieldElements = fields.map((f) => sdk.Field({ label: f.label, value: f.value }));
		children.push(sdk.Fields(fieldElements as never));
	}

	private toSelectOptions(
		component: SuspendComponent,
	): Array<{ label: string; value: string; description?: string }> {
		return (component.options ?? []).map((o) => ({
			label: o.label,
			value: o.value,
			description: o.description,
		}));
	}

	/**
	 * Wrap a raw button value into a full resume payload that matches the
	 * tool's resume schema.
	 *
	 * Inspects the JSON Schema top-level properties to determine the shape:
	 * - Schema has `approved` (boolean) → `{ approved: value === 'true' }`
	 * - Schema has `values` (object) → `{ values: { action: value } }`
	 * - No schema / unknown → try JSON.parse, fall back to `{ value }`
	 */
	private wrapValueForSchema(rawValue: string, resumeSchema?: unknown): unknown {
		if (!resumeSchema || typeof resumeSchema !== 'object') {
			// No schema — try to parse as JSON, otherwise wrap generically
			try {
				const parsed = JSON.parse(rawValue) as unknown;
				if (typeof parsed === 'object' && parsed !== null) return parsed;
			} catch {
				// not JSON
			}
			return { value: rawValue };
		}

		const schema = resumeSchema as {
			properties?: Record<string, { type?: string }>;
		};
		const props = schema.properties ?? {};

		if ('approved' in props) {
			return { approved: rawValue === 'true' };
		}

		// Interactive card resume schema: { type, value }
		if ('type' in props && 'value' in props) {
			return { type: 'button', value: rawValue };
		}

		if ('values' in props) {
			return { values: { action: rawValue } };
		}

		// Unknown schema shape — try JSON parse, fall back to raw object
		try {
			const parsed = JSON.parse(rawValue) as unknown;
			if (typeof parsed === 'object' && parsed !== null) return parsed;
		} catch {
			// not JSON
		}
		return { value: rawValue };
	}

	/**
	 * Convert a tool's `toMessage()` output to a Card or markdown string.
	 */
	async toCardOrMarkdown(message: unknown): Promise<unknown> {
		if (typeof message === 'string') return message;

		if (message && typeof message === 'object' && 'components' in message) {
			const sdk = await loadChatSdk();
			const { components } = message as { components: SuspendComponent[] };
			const children: unknown[] = [];

			for (const c of components) {
				this.appendMarkdownChild(c, sdk, children);
			}

			return sdk.Card({ children: children as never });
		}

		return String(message);
	}

	/** Render a single component into the flat markdown-style child list. */
	private appendMarkdownChild(c: SuspendComponent, sdk: ChatSdk, children: unknown[]): void {
		switch (c.type) {
			case 'section':
				{
					const text = componentTextToString(c.text);
					if (text) children.push(sdk.Section([sdk.CardText(text)] as never));
				}
				return;
			case 'divider':
				children.push(sdk.Divider());
				return;
			case 'image':
				if (c.url) children.push(sdk.Image({ url: c.url, alt: c.altText ?? '' }));
				return;
			case 'context':
				this.appendMarkdownContext(c, sdk, children);
				return;
			default:
				{
					const text = componentTextToString(c.text);
					if (text) children.push(sdk.CardText(text));
				}
				return;
		}
	}

	private appendMarkdownContext(c: SuspendComponent, sdk: ChatSdk, children: unknown[]): void {
		if (c.elements) {
			for (const el of c.elements) {
				const text = componentTextToString(el.text);
				if (el.type === 'text' && text) {
					children.push(sdk.CardText(text));
				} else if (el.type === 'image' && el.url) {
					children.push(sdk.Image({ url: el.url, alt: el.altText ?? '' }));
				}
			}
		} else {
			const text = componentTextToString(c.text);
			if (text) children.push(sdk.CardText(text));
		}
	}
}

function componentTextToString(text: unknown): string | undefined {
	if (typeof text === 'string') return text;
	if (text && typeof text === 'object' && 'text' in text) {
		const value = (text as { text?: unknown }).text;
		if (typeof value === 'string') return value;
	}
	return undefined;
}

function isButtonStyle(style: unknown): style is ButtonStyle {
	return style === 'primary' || style === 'danger' || style === 'default';
}
