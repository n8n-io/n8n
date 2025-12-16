import { type StoryFn } from '@storybook/vue3-vite';

export default {
	title: 'Utilities/Float',
};

const Template =
	(template: string): StoryFn =>
	() => ({ template });

export const FloatLeft = Template(`<div>
<span class="float-left">Float left</span>
</div>`);

export const FloatRight = Template(`<div>
<span class="float-right">Float right</span>
</div>`);
