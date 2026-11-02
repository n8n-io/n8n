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
			chip: { id: 'element:app-1', label: 'button: "Save"', icon: 'mouse-pointer' },
			clientContextPatch: { attachments: [element] },
		});
	});

	it('gives the chips of one app the same id, so a new pick replaces the old one', () => {
		const first = toElementComposerAttachment(element);
		const second = toElementComposerAttachment({ ...element, tagName: 'h1' });

		expect(second.chip.id).toBe(first.chip.id);
	});

	it('finds the app of the staged element chip', () => {
		const staged = [{ chip: { id: 'nodes:wf-1' } }, toElementComposerAttachment(element)];

		expect(stagedElementAppId(staged)).toBe('app-1');
		expect(stagedElementAppId([{ chip: { id: 'nodes:wf-1' } }])).toBeNull();
		expect(stagedElementAppId([])).toBeNull();
	});
});
