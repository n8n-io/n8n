import { useCreateTaskForm } from './useCreateTaskForm';

describe('useCreateTaskForm', () => {
	it('is not valid while the title is empty or only spaces', () => {
		const form = useCreateTaskForm();

		expect(form.isValid.value).toBe(false);
		form.title.value = '   ';
		expect(form.isValid.value).toBe(false);
		form.title.value = 'Fix login';
		expect(form.isValid.value).toBe(true);
	});

	it('leaves the empty fields out of the request, so the backend applies its defaults', () => {
		const form = useCreateTaskForm();
		form.title.value = '  Fix login ';

		expect(form.toPayload()).toEqual({
			title: 'Fix login',
			description: undefined,
			assignee: undefined,
			severity: undefined,
			tags: undefined,
		});
	});

	it('sends the assignee, the severity and the normalized tags', () => {
		const form = useCreateTaskForm();
		form.title.value = 'Fix login';
		form.description.value = 'The redirect loops.';
		form.assignee.value = 'agent:a1';
		form.severity.value = 'high';
		form.tags.value = ['Bug', 'bug ', 'auth'];

		expect(form.toPayload()).toEqual({
			title: 'Fix login',
			description: 'The redirect loops.',
			assignee: { type: 'agent', id: 'a1' },
			severity: 'high',
			tags: ['bug', 'auth'],
		});
	});

	it('clears every field on reset, so the next task does not start with the last one', () => {
		const form = useCreateTaskForm();
		form.title.value = 'Fix login';
		form.assignee.value = 'agent:a1';
		form.severity.value = 'high';
		form.tags.value = ['bug'];

		form.reset();

		expect(form.isValid.value).toBe(false);
		expect(form.toPayload()).toEqual({
			title: '',
			description: undefined,
			assignee: undefined,
			severity: undefined,
			tags: undefined,
		});
	});
});
