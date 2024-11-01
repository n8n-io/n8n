import { renderComponent } from '@/__tests__/render';
import FixedCollectionParameter from './FixedCollectionParameter.vue';
import { createPinia, setActivePinia } from 'pinia';
import { createAppModals } from '@/__tests__/utils';

describe('FixedCollectionParameter', () => {
	beforeEach(() => {
		createAppModals();
		const pinia = createPinia();
		setActivePinia(pinia);
	});

	it('renders default options correctly', () => {
		const { html } = renderComponent(FixedCollectionParameter, {
			global: {
				stubs: ['ParameterInputList'],
			},
			props: {
				parameter: {
					displayName: 'Categories',
					name: 'categories',
					placeholder: 'Add Category',
					type: 'fixedCollection',
					default: {},
					typeOptions: { multipleValues: true },
					options: [
						{
							name: 'categories',
							displayName: 'Categories',
							values: [
								{
									displayName: 'Category',
									name: 'category',
									type: 'string',
									default: '',
									description: 'Category to add',
									required: true,
								},
								{
									displayName: 'Description',
									name: 'description',
									type: 'string',
									default: '',
									description: "Describe your category if it's not obvious",
								},
							],
						},
					],
				},
				nodeValues: {
					color: '#ff0000',
					alwaysOutputData: false,
					executeOnce: false,
					notesInFlow: false,
					onError: 'stopWorkflow',
					retryOnFail: false,
					maxTries: 3,
					waitBetweenTries: 1000,
					notes: '',
					parameters: {
						inputText: '',
						categories: {
							categories: [
								{ category: 'One', description: 'Category one' },
								{ category: 'Two', description: 'New Category two' },
							],
						},
						options: {},
					},
				},
				path: 'parameters.categories',
				values: {
					categories: [
						{ category: 'One', description: 'Category one' },
						{ category: 'Two', description: 'New Category two' },
					],
				},
				isReadonly: false,
			},
		});
		console.log(html);
	});
});
