import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectPolicies } from './useProjectPolicies';
import { mockProjectPolicy } from '../__tests__/mocks';

const { fetchProjectPolicies } = vi.hoisted(() => ({ fetchProjectPolicies: vi.fn() }));

vi.mock('../type-availability-policies.api', () => ({ fetchProjectPolicies }));

const FINANCE = mockProjectPolicy({ projectId: 'finance', name: 'Finance' });

describe('useProjectPolicies', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
	});

	it('has no list until a read succeeds', async () => {
		fetchProjectPolicies.mockRejectedValue(new Error('Request failed'));
		const { projects, load } = useProjectPolicies();

		await load();

		expect(projects.value).toBeNull();
	});

	it('keeps the last list when a later read fails', async () => {
		fetchProjectPolicies.mockResolvedValueOnce({ projects: [FINANCE] });
		fetchProjectPolicies.mockRejectedValueOnce(new Error('Request failed'));
		const { projects, load } = useProjectPolicies();

		await load();
		await load();

		expect(projects.value).toEqual([FINANCE]);
	});
});
