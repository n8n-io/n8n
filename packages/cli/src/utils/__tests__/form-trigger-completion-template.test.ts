import express from 'express';
import request from 'supertest';

import { TEMPLATES_DIR } from '@/constants';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

// Rendered through the same view engine `AbstractServer` sets up, so the
// completion page is exercised exactly as a form user receives it.
const renderCompletionPage = async (context: Record<string, unknown>) => {
	const app = express();
	app.engine('handlebars', createHandlebarsEngine());
	app.set('view engine', 'handlebars');
	app.set('views', TEMPLATES_DIR);
	app.get('/form-waiting/:executionId', (_req, res) => {
		res.render('form-trigger-completion', context);
	});

	const response = await request(app).get('/form-waiting/123');

	return response.text;
};

describe('form-trigger-completion template', () => {
	// The context the completion page is rendered with today (see
	// `renderFormCompletion` and the waiting-forms fallback) carries no
	// attribution link.
	const completionContext = {
		title: 'Done',
		message: 'Your response has been recorded',
		formTitle: 'Form Submitted',
		appendAttribution: true,
	};

	const attributionAnchorAttributes = (html: string) => /n8n-link'>\s*<a\b([^>]*)>/.exec(html)?.[1];

	it('should not let the attribution footer swallow the target attribute into its href', async () => {
		const html = await renderCompletionPage(completionContext);
		const anchorAttributes = attributionAnchorAttributes(html);

		expect(anchorAttributes).toBeDefined();
		// The href is unquoted, so with no link value the browser reads the next
		// token as the href and resolves `target='_blank'` against the page URL.
		expect(anchorAttributes).not.toMatch(/href=\s*target=/);
		expect(anchorAttributes).toMatch(/href=(['"])[^'"]*\1/);
	});
});
