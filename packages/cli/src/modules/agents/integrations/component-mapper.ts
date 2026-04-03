import { loadChatSdk } from './esm-loader';

/**
 * Component type from agent SDK suspend/toMessage payloads.
 */
interface SuspendComponent {
	type: string;
	text?: string;
	label?: string;
	value?: string;
	style?: string;
	url?: string;
	altText?: string;
	placeholder?: string;
	/** Accessory button on a section */
	button?: { label: string; value: string; style?: string };
	/** Options for select / radio_select components */
	options?: Array<{ label: string; value: string; description?: string }>;
	/** Fields for fields component */
	fields?: Array<{ label: string; value: string }>;
	/** Elements array for context blocks */
	elements?: Array<{ type: string; text?: string; url?: string; altText?: string }>;
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
 * Converts agent SDK suspend payloads into Chat SDK Card elements.
 *
 * The `chat` package is ESM-only, so every method dynamically imports it
 * via the ESM loader to bypass TypeScript's CJS transform.
 */
export class ComponentMapper {
	/**
	 * Convert a suspend payload to a Chat SDK Card.
	 * Encodes `runId:toolCallId` in button IDs for the resume flow.
	 */
	/**
	 * Convert a suspend payload to a Chat SDK Card.
	 *
	 * Button values are JSON-encoded as the full resume payload that
	 * matches the tool's resume schema. This way the action handler
	 * can `JSON.parse(value)` and pass it directly — no guessing required.
	 *
	 * @param resumeSchema - JSON Schema from the tool's `.resume()` definition.
	 *   Used to wrap raw button values into the expected shape.
	 */
	async toCard(
		payload: SuspendPayload,
		runId: string,
		toolCallId: string,
		resumeSchema?: unknown,
	): Promise<unknown> {
		const {
			Card,
			Button,
			Actions,
			CardText,
			Section,
			Divider,
			Image,
			Select,
			RadioSelect,
			Fields,
			Field,
		} = await loadChatSdk();

		const children: unknown[] = [];
		const buttons: unknown[] = [];
		let buttonIndex = 0;

		// Helper to create a resume button with the value wrapped as a full
		// resume payload matching the tool's schema.
		const makeButton = (label: string, rawValue: string, style?: string) => {
			const resumePayload = this.wrapValueForSchema(rawValue, resumeSchema);
			return Button({
				id: `resume:${runId}:${toolCallId}:${buttonIndex++}`,
				label,
				style: style === 'danger' ? 'danger' : 'primary',
				value: JSON.stringify(resumePayload),
			});
		};

		for (const component of payload.components) {
			switch (component.type) {
				case 'button':
					buttons.push(
						makeButton(component.label ?? 'Action', component.value ?? '', component.style),
					);
					break;

				case 'section': {
					if (component.text) {
						children.push(Section([CardText(component.text)] as never));
					}
					// Section accessory buttons must be in a separate Actions block.
					// Chat SDK's cardToBlockKit silently drops Button children
					// inside Section — only Actions blocks render buttons.
					if (component.button) {
						children.push(
							Actions([
								makeButton(component.button.label, component.button.value, component.button.style),
							] as never),
						);
					}
					break;
				}

				case 'divider':
					children.push(Divider());
					break;

				case 'image':
					children.push(
						Image({
							url: component.url as string,
							alt: (component.altText as string) ?? 'image',
						}),
					);
					break;

				case 'context':
					// Context blocks contain an elements array with text/image items
					if (component.elements && Array.isArray(component.elements)) {
						for (const el of component.elements) {
							if (el.type === 'text' && el.text) {
								children.push(CardText(el.text));
							} else if (el.type === 'image' && el.url) {
								children.push(Image({ url: el.url, alt: el.altText ?? '' }));
							}
						}
					} else if (component.text) {
						// Fallback: plain text context
						children.push(CardText(component.text));
					}
					break;

				case 'select': {
					const opts = (component.options ?? []).map((o) => ({
						label: o.label,
						value: o.value,
						description: o.description,
					}));
					children.push(
						Actions([
							Select({
								id: `ri-sel:${component.id ?? 'select'}:${runId}:${toolCallId}`,
								label: component.label ?? 'Select',
								placeholder: component.placeholder,
								options: opts,
							}),
						] as never),
					);
					break;
				}

				case 'radio_select': {
					const opts = (component.options ?? []).map((o) => ({
						label: o.label,
						value: o.value,
						description: o.description,
					}));
					children.push(
						RadioSelect({
							id: `ri-sel:${component.id ?? 'radio'}:${runId}:${toolCallId}`,
							label: component.label ?? 'Select',
							options: opts,
						}),
					);
					break;
				}

				case 'fields': {
					const fieldElements = (component.fields ?? []).map((f) =>
						Field({ label: f.label, value: f.value }),
					);
					children.push(Fields(fieldElements as never));
					break;
				}

				// Unsupported types (text-input, select-input, modal) are silently dropped
				default:
					break;
			}
		}

		if (buttons.length > 0) {
			children.push(Actions(buttons as never));
		}

		// Use message as title fallback if title isn't set
		const title = payload.title ?? payload.message;

		return Card({ title, children: children as never });
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
				const parsed = JSON.parse(rawValue);
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

		// Rich interaction resume schema: { type, value }
		if ('type' in props && 'value' in props) {
			return { type: 'button', value: rawValue };
		}

		if ('values' in props) {
			return { values: { action: rawValue } };
		}

		// Unknown schema shape — try JSON parse, fall back to raw object
		try {
			const parsed = JSON.parse(rawValue);
			if (typeof parsed === 'object' && parsed !== null) return parsed;
		} catch {
			// not JSON
		}
		return { value: rawValue };
	}

	/**
	 * Convert a tool's `toMessage()` output to a Card or markdown string.
	 */
	async toCardOrMarkdown(message: unknown): Promise<string | unknown> {
		if (typeof message === 'string') return message;

		if (message && typeof message === 'object' && 'components' in message) {
			const { Card, Section, CardText, Divider, Image } = await loadChatSdk();
			const { components } = message as { components: SuspendComponent[] };
			const children: unknown[] = [];

			for (const c of components) {
				switch (c.type) {
					case 'section':
						if (c.text) children.push(Section([CardText(c.text)] as never));
						break;
					case 'divider':
						children.push(Divider());
						break;
					case 'image':
						if (c.url) children.push(Image({ url: c.url, alt: c.altText ?? '' }));
						break;
					case 'context':
						if (c.elements) {
							for (const el of c.elements) {
								if (el.type === 'text' && el.text) children.push(CardText(el.text));
								else if (el.type === 'image' && el.url)
									children.push(Image({ url: el.url, alt: el.altText ?? '' }));
							}
						} else if (c.text) {
							children.push(CardText(c.text));
						}
						break;
					default:
						if (c.text) children.push(CardText(c.text));
						break;
				}
			}

			return Card({ children: children as never });
		}

		return String(message);
	}
}
