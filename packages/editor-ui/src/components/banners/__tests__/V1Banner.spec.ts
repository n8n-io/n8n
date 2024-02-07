import { render } from '@testing-library/vue';
import V1Banner from '../V1Banner.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useUsersStore } from '@/stores/users.store';

describe('V1 Banner', () => {
	let pinia: ReturnType<typeof createPinia>;
	let usersStore: ReturnType<typeof useUsersStore>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		usersStore = useUsersStore();
	});

	it('should render banner', () => {
		const { container } = render(V1Banner);
		expect(container).toMatchSnapshot();
		expect(container.querySelectorAll('a')).toHaveLength(1);
	});

	it('should render banner with dismiss call if user is owner', () => {
		vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
			globalRole: {
				id: 0,
				name: 'owner',
				createdAt: '2021-08-09T14:00:00.000Z',
			},
		});

		const { container } = render(V1Banner);
		expect(container).toMatchSnapshot();
		expect(container.querySelectorAll('a')).toHaveLength(2);
	});
});
