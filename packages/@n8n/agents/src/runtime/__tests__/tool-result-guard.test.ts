import { MAX_AGENT_FILE_SIZE_BYTES } from '@n8n/api-types';

import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import { guardToolResultForModel } from '../tools/tool-result-guard';

describe('guardToolResultForModel', () => {
	it('truncates without storing a result above the offload size limit', async () => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const countTokens = async (text: string) => await Promise.resolve(Math.ceil(text.length / 4));

		const guarded = await guardToolResultForModel(
			'x'.repeat(MAX_AGENT_FILE_SIZE_BYTES),
			countTokens,
			{ filesystem, runId: 'run-1', toolCallId: 'tc-1' },
		);

		expect(writeFile).not.toHaveBeenCalled();
		expect(guarded).toMatchObject({ truncated: true, offloaded: false });
	});
});
