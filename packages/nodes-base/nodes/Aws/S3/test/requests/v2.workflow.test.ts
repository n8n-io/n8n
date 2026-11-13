import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../__tests__/credentials';

const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
const location = xml(
	'<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">eu-central-1</LocationConstraint>',
);
const xmlHeaders = { 'content-type': 'application/xml' };

describe('AWS S3 V2 > Workflows', () => {
	beforeAll(() => {
		nock('https://orders-archive.s3.eu-central-1.amazonaws.com')
			.put('/')
			.reply(200, '')
			.get('/')
			.query({ location: '' })
			.times(7)
			.reply(200, location, xmlHeaders)
			.put('/2024/q1/invoices/')
			.reply(200, '')
			.put('/2024//drafts/')
			.reply(200, '')
			.get('/')
			.query({ 'list-type': '2', prefix: '2024/old/' })
			.reply(
				200,
				xml('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'),
				xmlHeaders,
			)
			.delete('/2024/old/')
			.reply(204, '')
			.put('/2025/a%20copy.pdf')
			.reply(
				200,
				xml(
					'<CopyObjectResult><ETag>"etag-copy"</ETag><LastModified>2024-05-01T00:00:00.000Z</LastModified></CopyObjectResult>',
				),
				xmlHeaders,
			)
			.get('/2024/q1/report%201.pdf')
			.reply(200, 'report', { 'content-type': 'application/pdf' })
			.delete('/archive//old.txt')
			.reply(204, '')
			.put('/2024/q1/notes.txt', 'hello')
			.reply(200, '');

		nock('https://old-archive.s3.eu-central-1.amazonaws.com').delete('/').reply(204, '');

		nock('https://s3.eu-central-1.amazonaws.com')
			.get('/logs.example.com')
			.query({ location: '' })
			.reply(200, location, xmlHeaders)
			.delete('/logs.example.com/app/2024.log')
			.reply(204, '');
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['v2.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
