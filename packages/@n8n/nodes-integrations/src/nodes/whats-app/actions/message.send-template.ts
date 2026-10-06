import { t, type Infer } from '@n8n/node-sdk';

import { message, sendMessage, sent } from '../whats-app.node';

const bodyParameter = t.variant('type', {
	text: { text: t.str().title('Text') },
	currency: {
		code: t
			.str()
			.with({ pattern: '^[A-Z]{3}$' })
			.title('Currency Code')
			.hint('ISO 4217 code, e.g. EUR'),
		amount: t.num().title('Amount').hint('In the main unit, e.g. 12.5'),
		fallback: t
			.str()
			.title('Fallback Value')
			.hint('Text when the client cannot format it, e.g. €12.50'),
	},
	date_time: {
		fallback: t.str().title('Fallback Value').hint('The date as text, e.g. March 3, 2026'),
	},
});

const component = t.variant('type', {
	body: {
		parameters: t
			.arr(bodyParameter)
			.title('Parameters')
			.hint('One per template placeholder, in order'),
	},
	header: {
		parameter: t
			.variant('type', {
				text: { text: t.str().title('Text') },
				image: { link: t.str().with({ format: 'uri' }).title('Image Link') },
			})
			.title('Parameter'),
	},
	button: {
		index: t.int().with({ minimum: 0, maximum: 9 }).title('Index'),
		subType: t.oneOf('quick_reply', 'url').title('Sub Type'),
		value: t
			.str()
			.title('Payload')
			.hint('The payload of a quick reply, or the URL suffix of a URL button'),
	},
});

type Component = Infer<typeof component>;

/** Mirrors `componentsRequest` in nodes-base WhatsApp/MessageFunctions.ts. */
function componentOf(entry: Component) {
	switch (entry.type) {
		case 'body':
			return {
				type: 'body',
				parameters: entry.parameters.map((parameter) => {
					switch (parameter.type) {
						case 'text':
							return parameter;
						case 'currency':
							return {
								type: 'currency',
								currency: {
									code: parameter.code,
									fallback_value: parameter.fallback,
									amount_1000: Math.round(parameter.amount * 1000),
								},
							};
						case 'date_time':
							return { type: 'date_time', date_time: { fallback_value: parameter.fallback } };
					}
				}),
			};
		case 'header':
			return {
				type: 'header',
				parameters: [
					entry.parameter.type === 'text'
						? entry.parameter
						: { type: 'image', image: { link: entry.parameter.link } },
				],
			};
		case 'button':
			return {
				type: 'button',
				index: String(entry.index),
				sub_type: entry.subType,
				parameters: [
					entry.subType === 'quick_reply'
						? { type: 'payload', payload: entry.value }
						: { type: 'text', text: entry.value },
				],
			};
	}
}

export const sendWhatsAppTemplate = message.action('sendTemplate', {
	action: 'Send a template',
	summary: 'Send an approved message template, e.g. to start a chat outside the reply window.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['whatsapp_business_messaging'],
	input: {
		template: t
			.str()
			.with({ pattern: '^[a-z0-9_]+$' })
			.title('Template')
			.hint('Approved template name, e.g. order_confirmation'),
		language: t
			.str()
			.with({ pattern: '^[a-z]{2,3}(_[A-Z]{2})?$' })
			.title('Language')
			.hint('The language of the approved template, e.g. en_US'),
		components: t
			.arr(component)
			.title('Components')
			.hint('Values for the template placeholders')
			.optional(),
	},
	output: sent,
	async run({ input, http }) {
		return await sendMessage(http, input, 'template', {
			name: input.template,
			language: { code: input.language },
			...(input.components?.length ? { components: input.components.map(componentOf) } : {}),
		});
	},
});
