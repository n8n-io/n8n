import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	apiTemplateIoApi: {
		apiKey: 'test-api-key',
	},
};

const V1_BASE_URL = 'https://api.apitemplate.io';
const PDF_BUFFER = Buffer.from('%PDF-1.4\ntest-pdf');

describe('APITemplate.io Node', () => {
	describe('V1 image: create', () => {
		beforeAll(() => {
			nock(V1_BASE_URL)
				.post('/v1/create', { overrides: [{ name: 'text_1', text: 'hello world' }] })
				.query({ template_id: 'tpl-img' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/banner.png',
					template_id: 'tpl-img',
				});
		});

		// The node stores no `resource` when it matches the default, so a v1 node
		// left on the old default must still resolve to the V1 image resource
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v1-image-create.workflow.json'],
		});
	});

	describe('V1 pdf: create', () => {
		beforeAll(() => {
			nock(V1_BASE_URL)
				.post('/v1/create', { invoice_number: 'INV38379', date: '2021-09-30' })
				.query({ template_id: 'tpl-pdf' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/invoice.pdf',
					total_pages: 1,
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v1-pdf-create.workflow.json'],
		});
	});

	describe('V1 pdf: create with download', () => {
		beforeAll(() => {
			nock(V1_BASE_URL)
				.post('/v1/create', { invoice_number: 'INV38379' })
				.query({ template_id: 'tpl-pdf' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/generated.pdf',
				});

			nock('https://cdn.apitemplate.io').get('/files/generated.pdf').reply(200, PDF_BUFFER);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v1-pdf-create-download.workflow.json'],
			assertBinaryData: true,
		});
	});

	describe('V1 account: get', () => {
		beforeAll(() => {
			nock(V1_BASE_URL).get('/v1/account-information').reply(200, {
				status: 'success',
				plan: 'starter',
				available_credits: 100,
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v1-account-get.workflow.json'],
		});
	});

	describe('V2 account: get', () => {
		beforeAll(() => {
			nock('https://rest-de.apitemplate.io').get('/v2/account-information').reply(200, {
				status: 'success',
				plan: 'starter',
				available_credits: 100,
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-account-get.workflow.json'],
		});
	});

	describe('V2 pdf: create', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf', { invoice_number: 'INV38379', date: '2021-09-30' })
				.query({ template_id: 'tpl-pdf', export_type: 'json', expiration: '60' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/invoice.pdf',
					total_pages: 1,
					transaction_ref: '8f3f0a4e-7f5c-4a1a-9a3b-9f8d1c2b3a4e',
				});
		});

		// Mirrors the V1 case: a v2 node with no stored `resource` must resolve to
		// the V2 PDF resource
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-create.workflow.json'],
		});
	});

	describe('V2 pdf: create with file export', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf', { invoice_number: 'INV38379' })
				.query({
					template_id: 'tpl-pdf',
					export_type: 'file',
					expiration: '60',
					filename: 'invoice_123.pdf',
					output_format: 'pdf',
				})
				.reply(200, PDF_BUFFER, { 'content-type': 'application/pdf' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-create-file.workflow.json'],
			assertBinaryData: true,
		});
	});

	describe('V2 pdf: create loading data from a URL', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf')
				.query({
					template_id: 'tpl-pdf',
					export_type: 'json',
					expiration: '60',
					load_data_from: 'https://mydata.com/get-json-data?invoice=123',
				})
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/invoice.pdf',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-create-load-data-from-url.workflow.json'],
		});
	});

	describe('V2 pdf: create asynchronously', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf', { invoice_number: 'INV38379' })
				.query({
					template_id: 'tpl-pdf',
					export_type: 'json',
					expiration: '1440',
					async: '1',
					webhook_url: 'https://yourwebserver.com/webhook',
					webhook_method: 'POST',
				})
				.reply(200, {
					status: 'success',
					transaction_ref: '8f3f0a4e-7f5c-4a1a-9a3b-9f8d1c2b3a4e',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-create-async.workflow.json'],
		});
	});

	describe('V2 pdf: create from HTML', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf-from-html', {
					body: '<h1>Hello {{name}}</h1>',
					css: '<style>.bg{background: red};</style>',
					data: { name: 'John' },
					settings: { paper_size: 'A4', orientation: '1', margin_top: '40' },
				})
				.query({ export_type: 'json', expiration: '60' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/from-html.pdf',
					total_pages: 1,
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-from-html.workflow.json'],
		});
	});

	describe('V2 pdf: create from Markdown', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				// Escaped newlines typed into the parameter are unescaped before sending
				.post('/v2/create-pdf-from-markdown', {
					body: '# {{title}}\n\nContent here...',
					data: { title: 'Report' },
				})
				.query({ export_type: 'json', expiration: '60' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/from-markdown.pdf',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-from-markdown.workflow.json'],
		});
	});

	describe('V2 pdf: create from URL', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf-from-url', {
					url: 'https://example.com',
					settings: { paper_size: 'Letter', print_background: '1' },
				})
				.query({ export_type: 'json', expiration: '60' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/from-url.pdf',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-from-url.workflow.json'],
		});
	});

	describe('V2 image: create', () => {
		beforeAll(() => {
			nock('https://rest-au.apitemplate.io')
				.post('/v2/create-image', {
					overrides: [
						{
							name: 'text_1',
							text: 'hello world',
							textBackgroundColor: 'rgba(246, 243, 243, 0)',
						},
					],
				})
				.query({ template_id: 'tpl-img', expiration: '120', generation_delay: '1000' })
				.reply(200, {
					status: 'success',
					download_url: 'https://cdn.apitemplate.io/files/banner.jpeg',
					download_url_png: 'https://cdn.apitemplate.io/files/banner.png',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-image-create.workflow.json'],
		});
	});

	describe('V2 pdf: create with malformed data JSON', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-create-invalid-data.workflow.json'],
		});
	});

	describe('V2 pdf: create when the API reports an error', () => {
		beforeAll(() => {
			nock('https://rest.apitemplate.io')
				.post('/v2/create-pdf')
				.query(true)
				.reply(200, { status: 'error', message: 'The template id is not found' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2-pdf-create-api-error.workflow.json'],
		});
	});
});
