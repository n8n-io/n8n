import { mount } from '@vue/test-utils';
import FixedCollectionParameter from '@/components/FixedCollectionParameter.vue';
import { createTestingPinia } from '@pinia/testing';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@/constants';
import { setActivePinia } from 'pinia';

describe('FixedCollectionParameter.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);
	let props: any;

	beforeEach(() => {
		props = {
			nodeValues: {},
			parameter: {
				typeOptions: { multipleValues: true, sortable: true },
				options: [{ name: 'values', values: [] }],
			},
			path: 'some.path',
			values: {},
			isReadOnly: false,
		};
		vi.mock('n8n-workflow', async () => {
			const original = await vi.importActual('n8n-workflow');
			return {
				...original,
				isINodePropertyCollectionList: vi.fn(() => true),
			};
		});
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the component', () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		expect(wrapper.exists()).toBe(true);
	});

	it('computes placeholder text correctly', () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		expect(wrapper.vm.getPlaceholderText).toBe('Choose...');
	});

	it('emits valueChanged event on option deletion', async () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		await wrapper.vm.deleteOption('option1', 0);
		expect(wrapper.emitted().valueChanged).toBeTruthy();
	});

	it('emits valueChanged event on option order change (moveOptionUp)', async () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		await wrapper.vm.moveOptionUp('option1', 1);
		expect(wrapper.emitted().valueChanged).toBeTruthy();
	});

	it('updates mutableValues when values prop changes', async () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		const newValues = {
			option1: [{ name: 'newOption', value: 'newValue' }],
		};
		await wrapper.setProps({ values: newValues });
		expect(wrapper.vm.mutableValues).toEqual(newValues);
	});

	it('computes parameterOptions correctly when multiple values allowed', () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		expect(wrapper.vm.parameterOptions).toContainEqual({ name: 'values', values: [] });
	});

	it('computes sortable correctly based on props', () => {
		const wrapper = mount(FixedCollectionParameter, { props });
		expect(wrapper.vm.sortable).toBe(true);
	});
});
