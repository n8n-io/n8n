/**
 * XML.parse (xml2js 0.5 on sax 1.2.4), XML.snippet and XML.content
 * (rss-parser 3.13) give the results of the JavaScript libraries: feeds,
 * entities, CDATA, white space, attributes, and the messages of bad input.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

function parsed(text: string): unknown {
	try {
		return XML.parse(text);
	} catch (error) {
		return { error: (error as { message: string }).message };
	}
}

export default workflow({
	triggers: [webhook<{ docs: string[]; html: string[] }>({ path: 'xml' })],
	async run(_ctx, trigger) {
		const results = trigger.body.docs.map((d) => parsed(d));
		const feed = results[0] as { rss: { channel: Array<{ item: unknown[] }> } };
		const items = feed.rss.channel[0].item as Array<Record<string, unknown[]>>;
		return {
			results,
			snippets: trigger.body.html.map((h) => XML.snippet(h)),
			contents: items.map((i) => XML.content((i.description ?? [''])[0])),
			plain: XML.content('just text'),
		};
	},
});
