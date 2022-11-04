import Vue from "vue";
import { render, screen } from '@testing-library/vue';
import RunDataJson from '@/components/RunDataJson.vue';

// TODO: Investigate why this is needed
// Without having the 3rd party library imported like this, the test fails with:
// [Vue warn]: Failed to mount component: template or render function not defined.
Vue.component('vue-json-pretty', require('vue-json-pretty').default);

describe('RunDataJson.vue', () => {
	it('renders json values properly', () => {
		render(RunDataJson, {
			props: {
				mappingEnabled: true,
				editMode: { enabled: false },
				inputData: [{
					json: {
						list: [1,2,3],
						record: { name: 'Joe' },
						myNumber: 123,
						myStringNumber: '456',
						myStringText: 'abc',
						nil: null,
						d: undefined,
					},
				}],
				node: {
					parameters: {
						keepOnlySet: false,
						values: {},
						options: {},
					},
					id: '820ea733-d8a6-4379-8e73-88a2347ea003',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [
						380,
						1060,
					],
					disabled: false,
				},
			},
			mocks: {
				$locale: {
					baseText() {
						return '';
					},
				},
				$store: {
					getters: {},
				},
			},
		});
		expect(screen.getByText('123')).toBeInTheDocument();
		expect(screen.getByText('"456"')).toBeInTheDocument();
		expect(screen.getByText('"abc"')).toBeInTheDocument();
		expect(screen.getByText('null')).toBeInTheDocument();
		expect(screen.queryByText('undefined')).not.toBeInTheDocument();
	});
});
