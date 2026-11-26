import { SetInstanceTypeAccessDto, SetProjectTypeAccessDto } from '../set-type-access.dto';

const slack = 'n8n-nodes-base.slack';

describe('SetInstanceTypeAccessDto', () => {
	it.each(['allow', 'deny', 'delegate', 'inherit'])('accepts access %s', (access) => {
		const result = SetInstanceTypeAccessDto.safeParse({
			version: 1,
			changes: [{ type: slack, access }],
		});

		expect(result.success).toBe(true);
	});

	it('rejects an unknown access', () => {
		const result = SetInstanceTypeAccessDto.safeParse({
			version: 1,
			changes: [{ type: slack, access: 'block' }],
		});

		expect(result.success).toBe(false);
	});

	it('rejects an empty change list', () => {
		expect(SetInstanceTypeAccessDto.safeParse({ version: 1, changes: [] }).success).toBe(false);
	});

	it('rejects an empty type', () => {
		const result = SetInstanceTypeAccessDto.safeParse({
			version: 1,
			changes: [{ type: '', access: 'deny' }],
		});

		expect(result.success).toBe(false);
	});

	it('rejects a type that appears twice', () => {
		const result = SetInstanceTypeAccessDto.safeParse({
			version: 1,
			changes: [
				{ type: slack, access: 'deny' },
				{ type: slack, access: 'allow' },
			],
		});

		expect(result.success).toBe(false);
	});

	it('rejects more than 2000 changes', () => {
		const changes = Array.from({ length: 2001 }, (_, index) => ({
			type: `n8n-nodes-base.type${index}`,
			access: 'deny',
		}));

		expect(SetInstanceTypeAccessDto.safeParse({ version: 1, changes }).success).toBe(false);
	});

	it('rejects a negative version', () => {
		const result = SetInstanceTypeAccessDto.safeParse({
			version: -1,
			changes: [{ type: slack, access: 'deny' }],
		});

		expect(result.success).toBe(false);
	});
});

describe('SetProjectTypeAccessDto', () => {
	it.each(['allow', 'deny', 'inherit'])('accepts access %s', (access) => {
		const result = SetProjectTypeAccessDto.safeParse({
			version: 0,
			changes: [{ type: slack, access }],
		});

		expect(result.success).toBe(true);
	});

	it('rejects delegate', () => {
		const result = SetProjectTypeAccessDto.safeParse({
			version: 0,
			changes: [{ type: slack, access: 'delegate' }],
		});

		expect(result.success).toBe(false);
	});
});
