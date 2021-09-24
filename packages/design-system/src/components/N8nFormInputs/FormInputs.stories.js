// import N8nFormBox from './FormBox.vue';
// import { action } from '@storybook/addon-actions';

// export default {
// 	title: 'Modules/FormBox',
// 	component: N8nFormBox,
// 	argTypes: {
// 	},
// 	parameters: {
// 		backgrounds: { default: '--color-background-light' },
// 	},
// };

// const methods = {
// 	onSubmit: action('submit'),
// };

// const Template = (args, { argTypes }) => ({
// 	props: Object.keys(argTypes),
// 	components: {
// 		N8nFormBox,
// 	},
// 	template: '<n8n-form-box v-bind="$props" @submit="onSubmit" />',
// 	methods,
// });

// export const FormBox = Template.bind({});
// FormBox.args = {
// 	title: 'Form title',
// 	inputs: [
// 		{
// 			name: 'email',
// 			label: 'Your Email',
// 			type: 'email',
// 			required: true,
// 		},
// 		{
// 			name: 'password',
// 			label: 'Your Password',
// 			type: 'password',
// 			required: true,
// 		},
// 		{
// 			name: 'nickname',
// 			label: 'Your Nickname',
// 			placeholder: 'Monty',
// 		},
// 	],
// 	buttonText: 'Action',
// 	redirectText: 'Go somewhere',
// 	redirectLink: 'https://n8n.io',
// };

