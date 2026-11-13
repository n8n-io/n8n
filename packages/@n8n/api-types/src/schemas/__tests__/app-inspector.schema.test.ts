import { appInspectorEventSchema, APP_INSPECTOR_MESSAGE_SOURCE } from '../app.schema';
import { instanceAiAttachmentSchema } from '../instance-ai.schema';

describe('appInspectorEventSchema', () => {
	const selected = (element: unknown) => ({
		source: APP_INSPECTOR_MESSAGE_SOURCE,
		type: 'inspect:selected',
		element,
	});

	it('accepts a picked element and a cancel', () => {
		expect(appInspectorEventSchema.safeParse(selected({ tagName: 'button' })).success).toBe(true);
		expect(
			appInspectorEventSchema.safeParse({
				source: APP_INSPECTOR_MESSAGE_SOURCE,
				type: 'inspect:cancelled',
			}).success,
		).toBe(true);
	});

	it.each([
		['an empty tag name', selected({ tagName: '' })],
		['a text over 200 characters', selected({ tagName: 'p', text: 'a'.repeat(201) })],
		['another source', { ...selected({ tagName: 'p' }), source: 'other' }],
		['an unknown type', { source: APP_INSPECTOR_MESSAGE_SOURCE, type: 'inspect:other' }],
	])('rejects %s', (_label, data) => {
		expect(appInspectorEventSchema.safeParse(data).success).toBe(false);
	});
});

describe('element attachment', () => {
	it('is a message attachment that keeps the picked element fields', () => {
		const attachment = {
			type: 'element',
			appId: 'app-1',
			tagName: 'button',
			text: 'Save',
			selector: '[data-testid="save"]',
			route: '/settings',
		};

		expect(instanceAiAttachmentSchema.parse(attachment)).toEqual(attachment);
	});

	it('needs the app and the tag name', () => {
		expect(instanceAiAttachmentSchema.safeParse({ type: 'element', tagName: 'p' }).success).toBe(
			false,
		);
		expect(instanceAiAttachmentSchema.safeParse({ type: 'element', appId: 'a' }).success).toBe(
			false,
		);
	});
});
