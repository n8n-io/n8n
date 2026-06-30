import { UpdateEgressPolicyDto } from '../egress-protection.dto';

const base = {
	mode: 'log' as const,
	blockedIpRanges: [] as string[],
	allowedIpRanges: [] as string[],
	allowedHostnames: [] as string[],
	blockedHostnames: [] as string[],
};

describe('UpdateEgressPolicyDto', () => {
	describe('valid requests', () => {
		test('accepts empty lists with a mode', () => {
			expect(UpdateEgressPolicyDto.safeParse({ ...base }).success).toBe(true);
			expect(UpdateEgressPolicyDto.safeParse({ ...base, mode: 'enforce' }).success).toBe(true);
		});

		test('accepts valid CIDR ranges and hostname patterns', () => {
			const result = UpdateEgressPolicyDto.safeParse({
				mode: 'log',
				blockedIpRanges: ['10.0.0.0/8', '172.16.0.0/12'],
				allowedIpRanges: ['10.5.0.0/24', '2001:db8::/32'],
				allowedHostnames: ['api.internal', '*.example.com'],
				blockedHostnames: ['*.tracker.example', 'exfil.example.com'],
			});
			expect(result.success).toBe(true);
		});
	});

	describe('invalid mode', () => {
		test('rejects an unknown mode', () => {
			expect(UpdateEgressPolicyDto.safeParse({ ...base, mode: 'block' }).success).toBe(false);
		});

		test('requires a mode', () => {
			const { mode: _mode, ...withoutMode } = base;
			expect(UpdateEgressPolicyDto.safeParse(withoutMode).success).toBe(false);
		});
	});

	describe('malformed entries', () => {
		test.each([
			{ name: 'garbage range', list: 'blockedIpRanges', value: 'not-an-ip' },
			{ name: 'url as range', list: 'allowedIpRanges', value: 'http://10.0.0.1' },
			{ name: 'bare wildcard hostname', list: 'allowedHostnames', value: '*' },
			{ name: 'hostname with scheme', list: 'allowedHostnames', value: 'https://api.example.com' },
			{ name: 'bare wildcard blocked hostname', list: 'blockedHostnames', value: '*' },
			{ name: 'blocked hostname with path', list: 'blockedHostnames', value: 'evil.example/x' },
		])('rejects $name', ({ list, value }) => {
			const result = UpdateEgressPolicyDto.safeParse({ ...base, [list]: [value] });
			expect(result.success).toBe(false);
		});
	});

	describe('allow-all hardening', () => {
		test.each(['0.0.0.0/0', '::/0', '0.0.0.0', '::'])(
			'rejects allow-all range "%s" in the allow list',
			(value) => {
				const result = UpdateEgressPolicyDto.safeParse({ ...base, allowedIpRanges: [value] });
				expect(result.success).toBe(false);
			},
		);

		test('still allows 0.0.0.0/0 in the block list (tightening, not loosening)', () => {
			const result = UpdateEgressPolicyDto.safeParse({ ...base, blockedIpRanges: ['0.0.0.0/0'] });
			expect(result.success).toBe(true);
		});
	});
});
