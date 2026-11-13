/** Number to string conversion edge cases and numeric operators. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ values: number[] }>({ path: 'numbers' })],
	async run(ctx, trigger) {
		const big = 1e21;
		const negZero = -0;
		const strings = [
			String(1e21),
			String(1e20),
			String(123456789012345680000),
			String(1e-7),
			String(1e-6),
			String(0.000001234),
			String(0.1 + 0.2),
			String(negZero),
			`${-0}`,
			String(0 / 0),
			String(1 / 0),
			String(-1 / 0),
			String(2 ** 53),
			String(2 ** 53 + 1),
			String(-1.5e-10),
			String(5e-324),
			String(1.7976931348623157e308),
			String(100),
			String(123.456),
			String(big * 10),
		];
		const fixed = [
			(1.005).toFixed(2),
			(0.5).toFixed(0),
			(1.45).toFixed(1),
			(1e21).toFixed(2),
			(-1.5).toFixed(0),
			(123.456).toFixed(5),
		];
		const radix = [(255).toString(16), (255).toString(2), (-255).toString(36), (0.5).toString(2)];
		const ops = {
			mod: [7 % 3, -7 % 3, 7.5 % 2, 5 % -0],
			div: [1 / 3, -1 / 0, 0 / -1],
			pow: [2 ** 10, 2 ** -1, (-8) ** (1 / 3)],
			bits: [5 & 3, 5 | 3, 5 ^ 3, ~5, 1 << 31, -16 >> 2, -16 >>> 28, (2 ** 32) | 0],
			parse: [
				parseInt('42px'),
				parseInt('0x1f'),
				parseInt('z', 36),
				parseFloat('3.14abc'),
				parseFloat('.5e1'),
				Number(''),
				Number(' 12 '),
				Number('1e3'),
				Number('abc'),
				Number(null),
				Number(true),
			],
			checks: [
				isNaN(Number('x')),
				Number.isInteger(5.0),
				Number.isInteger(5.5),
				Number.isFinite(1 / 0),
			],
			math: [
				Math.round(2.5),
				Math.round(-2.5),
				Math.round(-0.4),
				Math.trunc(-4.7),
				Math.sign(-3),
				Math.max(),
				Math.min(1, 2, -3),
				Math.abs(-0),
				Math.sqrt(2),
				Math.floor(-0.5),
				Math.ceil(-0.5),
			],
		};
		const sum = trigger.body.values.reduce((a, b) => a + b, 0);
		await ctx.http({
			name: 'Report',
			method: 'POST',
			url: 'https://api.example.com',
			body: { sum, strings },
		});
		return { strings, fixed, radix, ops, sum, joined: [1e21, 1e-7, -0, 0.1].join('|') };
	},
});
