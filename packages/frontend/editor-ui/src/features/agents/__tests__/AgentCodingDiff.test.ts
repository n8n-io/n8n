import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import AgentCodingDiff from '../components/AgentCodingDiff.vue';
import type { CodingReviewComment } from '../utils/coding-review';

it('captures a selected range and retains its snapshot after the diff changes', async () => {
	const wrapper = mount(AgentCodingDiff, {
		props: {
			path: 'app.ts',
			content: '@@ -1,2 +1,3 @@\n first\n-old\n+new\n+extra',
			revision: 'before',
			comments: [],
			viewed: false,
		},
	});
	try {
		const rows = wrapper.findAll('button[aria-label^="Comment on line"]');
		await rows[2].trigger('click');
		await rows[3].trigger('click', { shiftKey: true });
		await wrapper.get('textarea').setValue('Keep both lines together');
		const submit = wrapper.findAll('button').find((button) => button.text() === 'Add comment');
		expect(submit).toBeDefined();
		await submit!.trigger('click');
		const comment = wrapper.emitted<[CodingReviewComment]>('comment')?.[0][0];
		expect(comment).toMatchObject({
			path: 'app.ts',
			side: 'new',
			line: 2,
			endLine: 3,
			code: 'new\nextra',
			body: 'Keep both lines together',
			revision: 'before',
		});
		await wrapper.setProps({ comments: [comment!], viewed: true });
		expect(wrapper.findAll('button[aria-label^="Comment on line"]')).toHaveLength(0);
		await wrapper.setProps({
			revision: 'after',
			viewed: false,
			content: '@@ -1 +1 @@\n-first\n+changed',
		});
		expect(wrapper.findAll('button[aria-label^="Comment on line"]')).toHaveLength(2);
		expect(wrapper.text()).toContain('The file changed after this comment');
		expect(wrapper.get('pre').text()).toBe('new\nextra');
	} finally {
		wrapper.unmount();
	}
});
