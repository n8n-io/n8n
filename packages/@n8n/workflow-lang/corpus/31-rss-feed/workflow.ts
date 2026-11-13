/** RSS Feed Read as a library node: RSS 2.0, Atom, a podcast and RSS 1.0 (the runtime's XML parser). */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'feeds' })],
	async run(ctx) {
		const rss = await ctx.node({
			name: 'RSS',
			type: 'n8n-nodes-base.rssFeedRead',
			typeVersion: 1.2,
			parameters: {
				url: 'https://feeds.example.com/rss.xml',
				options: { customFields: 'author, comments' },
			},
		});
		const atom = await ctx.node({
			name: 'Atom',
			type: 'n8n-nodes-base.rssFeedRead',
			typeVersion: 1.2,
			parameters: { url: 'https://feeds.example.com/atom.xml', options: {} },
		});
		const podcast = await ctx.node({
			name: 'Podcast',
			type: 'n8n-nodes-base.rssFeedRead',
			typeVersion: 1.2,
			parameters: { url: 'https://feeds.example.com/podcast.xml', options: {} },
		});
		const rdf = await ctx.node({
			name: 'RDF',
			type: 'n8n-nodes-base.rssFeedRead',
			typeVersion: 1.2,
			parameters: { url: 'https://feeds.example.com/rdf.xml', options: {} },
		});
		return { rss, atom, podcast, rdf };
	},
});
