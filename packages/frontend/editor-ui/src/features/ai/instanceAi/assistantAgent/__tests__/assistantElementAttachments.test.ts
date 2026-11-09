import type { InstanceAiElementAttachment } from '@n8n/api-types';

import { stagedElementAppId, toElementComposerAttachment } from '../assistantElementAttachments';

const element: InstanceAiElementAttachment = {
	type: 'element',
	appId: 'app-1',
	tagName: 'button',
	text: 'Save',
};

describe('assistantElementAttachments', () => {
	it('stages the picked element with one chip that sends it as an attachment', () => {
		expect(toElementComposerAttachment(element)).toEqual({
			chip: { id: 'element', label: 'button: "Save"', icon: 'mouse-pointer' },
			clientContextPatch: { attachments: [element] },
		});
	});

	it('gives every pick the same chip id, so a new pick replaces the old one, even in another app', () => {
		const first = toElementComposerAttachment(element);
		const second = toElementComposerAttachment({ ...element, appId: 'app-2', tagName: 'h1' });

		expect(second.chip.id).toBe(first.chip.id);
	});

	it('finds the app of the staged element', () => {
		const staged = [{ chip: { id: 'nodes:wf-1' } }, toElementComposerAttachment(element)];

		expect(stagedElementAppId(staged)).toBe('app-1');
		expect(stagedElementAppId([toElementComposerAttachment({ ...element, appId: 'app-2' })])).toBe(
			'app-2',
		);
	});

	it('finds no app without an element chip, or when the chip carries no valid element', () => {
		expect(stagedElementAppId([{ chip: { id: 'nodes:wf-1' } }])).toBeNull();
		expect(stagedElementAppId([])).toBeNull();
		expect(
			stagedElementAppId([{ chip: { id: 'element' }, clientContextPatch: { attachments: [{}] } }]),
		).toBeNull();
	});
});
