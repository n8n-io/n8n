import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import RunDataSearch from '@/components/RunDataSearch.vue';
import { useSettingsStore, useUIStore } from '@/stores';

const renderComponent = createComponentRenderer(RunDataSearch);
let pinia: ReturnType<typeof createPinia>;
let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

describe('RunDataSearch', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);

		uiStore = useUIStore();
		settingsStore = useSettingsStore();
	});

	it('should show upgrade tooltip on hover and keyboard shortcut if not licensed', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => false);
		const { getByRole, queryByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				isAreaActive: true,
			},
		});

		const input = getByRole('textbox');

		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(input);
		expect(getByRole('tooltip')).toBeInTheDocument();

		await userEvent.unhover(input);
		await waitFor(() => expect(queryByRole('tooltip')).not.toBeInTheDocument());

		await userEvent.keyboard('/');
		expect(getByRole('tooltip')).toBeInTheDocument();
		expect(emitted().focus).not.toBeDefined();
		await waitFor(() => expect(queryByRole('tooltip')).not.toBeInTheDocument(), { timeout: 3000 });
	});

	it('should not show upgrade tooltip on keyboard shortcut the area is not active', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => false);
		const { queryByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
			},
		});

		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.keyboard('/');
		expect(queryByRole('tooltip')).not.toBeInTheDocument();
		expect(emitted().focus).not.toBeDefined();
	});

	it('should not show upgrade tooltip if licensed', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => true);
		const { getByRole, queryByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				isAreaActive: true,
			},
		});

		const input = getByRole('textbox');

		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(input);
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.unhover(input);
		await waitFor(() => expect(queryByRole('tooltip')).not.toBeInTheDocument());

		await userEvent.keyboard('/');
		expect(queryByRole('tooltip')).not.toBeInTheDocument();
		expect(emitted().focus).toHaveLength(1);
	});

	it('should not be focused on keyboard shortcut when area is not active', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => true);
		const { emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
			},
		});

		await userEvent.keyboard('/');
		expect(emitted().focus).not.toBeDefined();
	});

	it('should be focused on click regardless of active area and keyboard shortcut should work after', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => true);
		const { getByRole, emitted, rerender } = renderComponent({
			pinia,
			props: {
				modelValue: '',
			},
		});

		await userEvent.click(getByRole('textbox'));
		expect(emitted().focus).toHaveLength(1);
		await userEvent.click(document.body);

		await rerender({ isAreaActive: true });
		await userEvent.keyboard('/');
		expect(emitted().focus).toHaveLength(2);
	});

	it('should be focused twice if area is already active', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => true);
		const { getByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				isAreaActive: true,
			},
		});

		await userEvent.click(getByRole('textbox'));
		expect(emitted().focus).toHaveLength(1);
		await userEvent.click(document.body);

		await userEvent.keyboard('/');
		expect(emitted().focus).toHaveLength(2);
	});

	it('should be select all text when focused', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(() => true);
		const { getByRole, emitted } = renderComponent({
			pinia,
			props: {
				modelValue: '',
				isAreaActive: true,
			},
		});

		const input = getByRole('textbox');

		await userEvent.click(input);
		expect(emitted().focus).toHaveLength(1);
		await userEvent.type(input, 'test');

		await userEvent.click(document.body);
		await userEvent.click(input);
		expect(emitted().focus).toHaveLength(2);

		const selectionStart = input.selectionStart;
		const selectionEnd = input.selectionEnd;
		const isSelected = selectionStart === 0 && selectionEnd === input.value.length;

		expect(isSelected).toBe(true);
	});
});
