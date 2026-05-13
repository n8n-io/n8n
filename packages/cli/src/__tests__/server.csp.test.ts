import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { getCspReportOnlyDirectives, buildCspMiddleware } from '@/server';

describe('CSP directives verification', () => {
	test('includes nonce in script-src and verify directives', () => {
		const nonce = 'abc123';
		const directives = getCspReportOnlyDirectives(nonce);
		expect(directives).toContain(`'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`);
		expect(directives).toContain(`object-src 'none'`);
		expect(directives).toContain(`base-uri 'none'`);
	});

	test('per-request middleware overwrites directives', () => {
		const nonce = 'abc123';
		const directives = { 'frame-ancestors': ['http://localhost:3000'] };
		const middleware = buildCspMiddleware(directives as any, false, nonce);
		const headers: Record<string, string> = {};
		// minimal express-like objects
		const req: any = {};
		const res: any = { setHeader: (k: string, v: string) => (headers[k] = v) };
		let called = false;
		middleware(req, res, () => (called = true));
		expect(called).toBe(true);
		expect(headers['Content-Security-Policy']).toBeDefined();
		expect(headers['Content-Security-Policy']).toContain('frame-ancestors http://localhost:3000');
	});

	test('per-request middleware respects provided script-src (no nonce injected)', () => {
		const nonce = 'abc123';
		const directives = { 'script-src': ['*'] };
		const middleware = buildCspMiddleware(directives as any, false, nonce);
		const headers: Record<string, string> = {};
		const req: any = {};
		const res: any = { setHeader: (k: string, v: string) => (headers[k] = v) };
		middleware(req, res, () => {});
		expect(headers['Content-Security-Policy']).toBeDefined();
		expect(headers['Content-Security-Policy']).toContain('script-src *');
		expect(headers['Content-Security-Policy']).not.toContain(`'nonce-${nonce}'`);
	});

	test('per-request middleware uses Report-Only header when requested', () => {
		const nonce = 'rpt1';
		const directives = {};
		const middleware = buildCspMiddleware(directives as any, true, nonce);
		const headers: Record<string, string> = {};
		const req: any = {};
		const res: any = { setHeader: (k: string, v: string) => (headers[k] = v) };
		middleware(req, res, () => {});
		expect(headers['Content-Security-Policy-Report-Only']).toBeDefined();
	});

	test('replaces nonce placeholder in index html', () => {
		const indexHtml =
			'<html><head><script nonce="{{CSP_NONCE}}"></script></head><body></body></html>';
		const nonce = 'abc123';
		const content = indexHtml.replace(/nonce="\{\{CSP_NONCE\}\}"/g, `nonce="${nonce}"`);
		expect(content).toContain(`nonce="${nonce}"`);
		expect(content).not.toContain('{{CSP_NONCE}}');
	});

	test('renders nonce in form-trigger templates without HTML escaping', () => {
		const nonce = 'IRJowsKxHrvgvUPTZWb5Yg==';
		const templatePaths = [
			path.join(__dirname, '..', '..', 'templates', 'form-trigger.handlebars'),
			path.join(__dirname, '..', '..', 'templates', 'form-trigger-completion.handlebars'),
		];

		for (const templatePath of templatePaths) {
			const markup = fs.readFileSync(templatePath, 'utf8');
			const template = Handlebars.compile(markup);
			const rendered = template({ nonce });
			expect(rendered).toContain(`nonce="${nonce}"`);
			expect(rendered).not.toContain('&#x3D;');
		}
	});
});
