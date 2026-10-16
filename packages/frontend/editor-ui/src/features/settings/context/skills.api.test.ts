import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	getSkillVersion,
	getSkillVersions,
	saveSkill,
	updateSkillVersionLabel,
} from './skills.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('skills.api versions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists the versions of a skill', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ data: [{ version: 2 }, { version: 1 }] });

		const versions = await getSkillVersions(context, 's1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/skills/s1/versions');
		expect(versions).toEqual([{ version: 2 }, { version: 1 }]);
	});

	it('reads one version with its content', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ version: 3 });

		await getSkillVersion(context, 's1', 3);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/skills/s1/versions/3');
	});

	it('names a version, and removes the name with null', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ version: 3, label: 'EU rules' });

		await updateSkillVersionLabel(context, 's1', 3, 'EU rules');
		await updateSkillVersionLabel(context, 's1', 3, null);

		expect(makeRestApiRequest).toHaveBeenNthCalledWith(
			1,
			context,
			'PATCH',
			'/skills/s1/versions/3',
			{
				label: 'EU rules',
			},
		);
		expect(makeRestApiRequest).toHaveBeenNthCalledWith(
			2,
			context,
			'PATCH',
			'/skills/s1/versions/3',
			{
				label: null,
			},
		);
	});

	it('sends the name of the new version with a save', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ created: true });
		const payload = {
			name: 'Refund policy',
			description: 'Refunds',
			instructions: 'Body',
			baseSkillHash: 'hash',
			label: 'EU rules',
		};

		await saveSkill(context, 's1', payload);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PATCH', '/skills/s1', payload);
	});
});
