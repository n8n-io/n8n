/** Template strings, optional chaining, nullish coalescing and logical assignment. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Contact {
	name?: string;
	company?: { name: string; address?: { city?: string } } | null;
	phones?: string[];
	format?: (s: string) => string;
}

export default workflow({
	triggers: [webhook<{ contacts: Contact[] }>({ path: 'tpl' })],
	async run(ctx, trigger) {
		const upper = (s: string) => s.toUpperCase();
		const lines = trigger.body.contacts.map((c, i) => {
			const city = c.company?.address?.city ?? 'n/a';
			const phone = c.phones?.[0] ?? '-';
			const label = c.format?.(c.name ?? '') ?? upper(c.name ?? 'anon');
			return `${i + 1}. ${label} @ ${c.company?.name} (${city}) ${phone} ${typeof c.company} ${c.company === null}`;
		});
		let config: { retries?: number; mode?: string; flag?: boolean } = { flag: false };
		config.retries ??= 3;
		config.mode ||= 'fast';
		config.flag &&= true;
		const nested = `outer ${`inner ${1 + 1}`} ${[1, 2]} ${null} ${undefined} ${{}}`;
		const res = await ctx.http<{ data?: { items?: string[] } }>({
			name: 'Fetch',
			method: 'GET',
			url: 'https://api.example.com',
		});
		const count = res.body.data?.items?.length ?? 0;
		const missing = res.body.data?.items?.[5]?.length;
		return { lines, config, nested, count, missing: missing === undefined, zeroOr: count || 'y' };
	},
});
