/** Destructuring with defaults, rest, nesting, parameters and swaps. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Payload {
	user: { name: string; address?: { city?: string; zip: string }; roles: string[] };
	options?: { verbose?: boolean; limit?: number };
	extra: Record<string, number>;
}

export default workflow({
	triggers: [webhook<Payload>({ path: 'destructure' })],
	async run(ctx, { body }) {
		const {
			user: {
				name,
				address: { city = 'Unknown', zip } = { zip: '00000' },
				roles: [firstRole, ...otherRoles],
			},
			options: { verbose = false, limit = 10 } = {},
			...rest
		} = body;
		const { a, ...others } = body.extra;
		let x = 1;
		let y = 2;
		[x, y] = [y, x];
		const pairs = Object.entries(body.extra).map(([k, v]) => `${k}=${v}`);
		const describe = (
			{ id, tags = [] }: { id: number; tags?: string[] },
			[first = 'none'] = [] as string[],
		) => `${id}:${tags.length}:${first}`;
		const res = await ctx.http<{ items: Array<{ id: number; tags?: string[] }> }>({
			name: 'Load',
			method: 'GET',
			url: `https://api.example.com/${zip}`,
		});
		const [{ id: firstId }, second] = res.body.items;
		return {
			name,
			city,
			zip,
			firstRole,
			otherRoles,
			verbose,
			limit,
			rest,
			a,
			others,
			x,
			y,
			pairs,
			d1: describe(res.body.items[0], ['p']),
			d2: describe(second),
			firstId,
		};
	},
});
