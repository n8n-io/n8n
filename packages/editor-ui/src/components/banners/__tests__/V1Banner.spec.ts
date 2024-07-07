import { render } from '@testing-library/vue';
import V1Banner from '../V1Banner.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { ROLE } from '@/constants';
import type { IUser } from '@/Interface';

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
		usersStore.usersById = { '1': { role: ROLE.Owner } as IUser };
		usersStore.currentUserId = '1';

		const { container } = render(V1Banner);
		expect(container).toMatchSnapshot();
		expect(container.querySelectorAll('a')).toHaveLength(2);
	});
});
