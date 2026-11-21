import type { TypeUsage } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';

import { useTypeUsage } from './useTypeUsage';

const SLACK = 'n8n-nodes-base.slack';
const SLACK_USAGE: TypeUsage = { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 };
const NO_USAGE: TypeUsage = { uses: 0, workflows: 0, activeWorkflows: 0, projects: 0 };

describe('useTypeUsage', () => {
	it('returns no usage value until the counts load', () => {
		const { usageOf } = useTypeUsage(vi.fn().mockResolvedValue({ [SLACK]: SLACK_USAGE }));

		expect(usageOf(SLACK)).toBeNull();
	});

	it('returns the counts of a type, and 0 for a type with no entry', async () => {
		const { load, usageOf } = useTypeUsage(vi.fn().mockResolvedValue({ [SLACK]: SLACK_USAGE }));

		await load();

		expect(usageOf(SLACK)).toEqual(SLACK_USAGE);
		expect(usageOf('n8n-nodes-base.notion')).toEqual(NO_USAGE);
	});

	it('returns 0 for a type named like an Object.prototype key', async () => {
		const { load, usageOf } = useTypeUsage(vi.fn().mockResolvedValue({}));

		await load();

		expect(usageOf('constructor')).toEqual(NO_USAGE);
		expect(usageOf('toString')).toEqual(NO_USAGE);
	});

	it('returns no usage value when the counts do not load', async () => {
		const { load, usageOf } = useTypeUsage(vi.fn().mockRejectedValue(new Error('offline')));

		await load();

		expect(usageOf(SLACK)).toBeNull();
	});
});
