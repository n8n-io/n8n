import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const createdTime = '2024-05-01T10:00:00.000Z';
const attachmentPath = '/v3/u/30/30/1714557600000/aBcDeFgHiJ/kLmNoPqRsT/report.pdf';

describe('Airtable > Request URLs', () => {
	const credentials = {
		airtableTokenApi: { accessToken: 'test-token' },
	};

	beforeAll(() => {
		const airtable = nock('https://api.airtable.com/v0');
		airtable
			.post('/appB7xQ3mK9pL2nR4/tblR8kQ2mN4pL6sT0', { typecast: false, fields: { Name: 'Alice' } })
			.reply(200, { id: 'recA1b2C3d4E5f6G7', createdTime, fields: { Name: 'Alice' } });
		airtable.get('/appB7xQ3mK9pL2nR4/tblR8kQ2mN4pL6sT0/recA1b2C3d4E5f6G7').reply(200, {
			id: 'recA1b2C3d4E5f6G7',
			createdTime,
			fields: {
				Name: 'Alice',
				Files: [
					{
						id: 'attQ1w2E3r4T5y6U7',
						url: `https://v5.airtableusercontent.com${attachmentPath}`,
						filename: 'report.pdf',
						type: 'application/pdf',
					},
				],
			},
		});
		airtable
			.delete('/appB7xQ3mK9pL2nR4/tblR8kQ2mN4pL6sT0/recH8i9J0k1L2m3N4')
			.reply(200, { id: 'recH8i9J0k1L2m3N4', deleted: true });
		airtable
			.get('/appB7xQ3mK9pL2nR4/Contacts%20List')
			.query({ pageSize: 100 })
			.reply(200, {
				records: [{ id: 'recM5n6O7p8Q9r0S1', createdTime, fields: { Name: 'Dave' } }],
			});
		airtable
			.patch('/appB7xQ3mK9pL2nR4/tblR8kQ2mN4pL6sT0', {
				typecast: false,
				records: [{ id: 'recA1b2C3d4E5f6G7', fields: { Name: 'Bob' } }],
			})
			.reply(200, {
				records: [{ id: 'recA1b2C3d4E5f6G7', createdTime, fields: { Name: 'Bob' } }],
			});
		airtable
			.patch('/appB7xQ3mK9pL2nR4/tblR8kQ2mN4pL6sT0', {
				typecast: false,
				performUpsert: { fieldsToMergeOn: ['Name'] },
				records: [{ fields: { Name: 'Carol' } }],
			})
			.reply(200, {
				records: [{ id: 'recT2u3V4w5X6y7Z8', createdTime, fields: { Name: 'Carol' } }],
			});
		airtable.get('/meta/bases').reply(200, {
			bases: [{ id: 'appB7xQ3mK9pL2nR4', name: 'Sales', permissionLevel: 'create' }],
		});
		airtable.get('/meta/bases/appB7xQ3mK9pL2nR4/tables').reply(200, {
			tables: [{ id: 'tblR8kQ2mN4pL6sT0', name: 'Contacts', primaryFieldId: 'fldA1b2C3d4E5f6G7' }],
		});
		airtable
			.post('/appC4dE5fG6hI7jK8/tblL9mN0oP1qR2sT3', { records: [{ fields: {} }] })
			.reply(200, { records: [{ id: 'recE1f2G3h4I5j6K7', createdTime, fields: {} }] });
		airtable
			.get('/appC4dE5fG6hI7jK8/tblL9mN0oP1qR2sT3/recU4vW5xY6zA7bC8')
			.reply(200, { id: 'recU4vW5xY6zA7bC8', createdTime, fields: { Name: 'Eve' } });
		airtable
			.get('/appC4dE5fG6hI7jK8/Tasks%20Table')
			.query({ maxRecords: 5 })
			.reply(200, {
				records: [{ id: 'recF3g4H5i6J7k8L9', createdTime, fields: { Name: 'Frank' } }],
			});
		airtable
			.patch('/appC4dE5fG6hI7jK8/tblL9mN0oP1qR2sT3', {
				records: [{ fields: {}, id: 'recU4vW5xY6zA7bC8' }],
				typecast: false,
			})
			.reply(200, {
				records: [{ id: 'recU4vW5xY6zA7bC8', createdTime, fields: { Name: 'Eve' } }],
			});
		airtable
			.delete('/appC4dE5fG6hI7jK8/tblL9mN0oP1qR2sT3')
			.query({ records: ['recD9eF0gH1iJ2kL3'] })
			.reply(200, { records: [{ id: 'recD9eF0gH1iJ2kL3', deleted: true }] });

		nock('https://v5.airtableusercontent.com').get(attachmentPath).reply(200, 'pdf-content');
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
		nock.cleanAll();
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
