import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { SkillVersionDetail } from '@n8n/api-types';

import { useSkillVersions } from '../composables/useSkillVersions';

const { getSkillVersion, listSkillVersions } = vi.hoisted(() => ({
	getSkillVersion: vi.fn(),
	listSkillVersions: vi.fn(),
}));
vi.mock('../composables/useAgentApi', () => ({ getSkillVersion, listSkillVersions }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

function detail(version: number): SkillVersionDetail {
	return {
		id: `id-${version}`,
		version,
		createdBy: null,
		createdAt: '2026-10-20T00:00:00.000Z',
		skill: { name: 'Tone', description: `v${version}`, instructions: 'Be brief.' },
	};
}

describe('useSkillVersions', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		listSkillVersions.mockResolvedValue([detail(3), detail(2), detail(1)]);
	});

	it('keeps the version the user opened last when an earlier answer arrives later', async () => {
		let answerFirst: (value: SkillVersionDetail) => void = () => {};
		getSkillVersion
			.mockImplementationOnce(async () => await new Promise((resolve) => (answerFirst = resolve)))
			.mockResolvedValueOnce(detail(2));
		const { viewedVersion, loadVersions, openVersion } = useSkillVersions('tone');
		await loadVersions();

		const slow = openVersion(1);
		await openVersion(2);
		answerFirst(detail(1));
		await slow;

		expect(viewedVersion.value?.version).toBe(2);
	});

	it('loads the version list again for another skill', async () => {
		const skillId = { value: 'tone' };
		const { versions, loadVersions } = useSkillVersions(() => skillId.value);
		await loadVersions();
		listSkillVersions.mockResolvedValueOnce([detail(1)]);

		skillId.value = 'voice';
		await loadVersions();

		expect(listSkillVersions).toHaveBeenLastCalledWith(expect.anything(), 'voice');
		expect(versions.value?.map((version) => version.version)).toEqual([1]);
	});

	it('keeps the version details of one skill apart from another skill', async () => {
		getSkillVersion.mockImplementation(async (_context: unknown, skillId: string) => ({
			...detail(1),
			skill: { name: skillId, description: '', instructions: '' },
		}));
		const skillId = { value: 'tone' };
		const { fetchVersion } = useSkillVersions(() => skillId.value);

		const first = await fetchVersion(1);
		skillId.value = 'voice';
		const second = await fetchVersion(1);

		expect(first?.skill.name).toBe('tone');
		expect(second?.skill.name).toBe('voice');
	});
});
