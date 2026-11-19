import { ref } from 'vue';

import { useInlineEdit } from './useInlineEdit';

function setup(saved: string, required = false) {
	const value = ref(saved);
	const onSave = vi.fn<(next: string) => void>();
	return { value, onSave, edit: useInlineEdit({ value, required, onSave }) };
}

describe('useInlineEdit', () => {
	it('starts from the saved text and saves the trimmed draft', () => {
		const { edit, onSave } = setup('Old title');

		edit.start();
		expect(edit.draft.value).toBe('Old title');
		edit.draft.value = '  New title ';
		edit.save();

		expect(onSave).toHaveBeenCalledExactlyOnceWith('New title');
		expect(edit.editing.value).toBe(false);
	});

	it('does not save a draft that is the same as the saved text', () => {
		const { edit, onSave } = setup('Title');

		edit.start();
		edit.draft.value = 'Title  ';
		edit.save();

		expect(onSave).not.toHaveBeenCalled();
		expect(edit.editing.value).toBe(false);
	});

	it('does not save a required text as empty', () => {
		const { edit, onSave } = setup('Title', true);

		edit.start();
		edit.draft.value = '   ';
		edit.save();

		expect(onSave).not.toHaveBeenCalled();
	});

	it('saves an optional text as empty, so the user can remove a description', () => {
		const { edit, onSave } = setup('Some description');

		edit.start();
		edit.draft.value = '';
		edit.save();

		expect(onSave).toHaveBeenCalledExactlyOnceWith('');
	});

	it('drops the draft on cancel, and a later save does nothing', () => {
		const { edit, onSave } = setup('Title');

		edit.start();
		edit.draft.value = 'Changed';
		edit.cancel();
		edit.save();

		expect(onSave).not.toHaveBeenCalled();
		expect(edit.editing.value).toBe(false);
	});

	it('keeps the draft when a poll changes the saved text during the edit', () => {
		const { edit, value, onSave } = setup('Title');

		edit.start();
		edit.draft.value = 'My edit';
		value.value = 'Title from the server';
		edit.save();

		expect(onSave).toHaveBeenCalledExactlyOnceWith('My edit');
	});
});
