import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createOwner, createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['data-table'],
	modules: ['data-table'],
});

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

describe('POST /data-tables/uploads', () => {
	describe('successful file uploads', () => {
		test('should upload a valid CSV file and return file metadata', async () => {
			const csvContent = 'name,email\nJohn Doe,john@example.com\nJane Smith,jane@example.com';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'test.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'test.csv');
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data.id).toMatch(/^[a-zA-Z0-9_-]{10}$/); // nanoid with length 10
			expect(response.body.data).toHaveProperty('rowCount', 2);
			expect(response.body.data).toHaveProperty('columnCount', 2);
			expect(response.body.data).toHaveProperty('columns');
			expect(response.body.data.columns).toEqual([
				{ name: 'name', type: 'string', compatibleTypes: ['string'] },
				{ name: 'email', type: 'string', compatibleTypes: ['string'] },
			]);
		});

		test('should accept CSV file from member user', async () => {
			const csvContent = 'col1,col2\nvalue1,value2';

			const response = await authMemberAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'data.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'data.csv');
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data).toHaveProperty('rowCount', 1);
			expect(response.body.data).toHaveProperty('columnCount', 2);
		});

		test('should handle CSV files with special characters in filename', async () => {
			const csvContent = 'a,b,c\n1,2,3';
			const filename = 'test-file_v1.2.csv';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), filename)
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', filename);
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data).toHaveProperty('rowCount', 1);
			expect(response.body.data).toHaveProperty('columnCount', 3);
			expect(response.body.data.columns).toEqual([
				{ name: 'a', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: 'b', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: 'c', type: 'number', compatibleTypes: ['number', 'string'] },
			]);
		});

		test('should accept files within size limit', async () => {
			const smallContent = 'col1,col2\nval1,val2\n';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(smallContent), 'small.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'small.csv');
			expect(response.body.data).toHaveProperty('id');
		});

		test('should accept empty CSV file', async () => {
			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(''), 'empty.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'empty.csv');
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data).toHaveProperty('rowCount', 0);
			expect(response.body.data).toHaveProperty('columnCount', 0);
			expect(response.body.data.columns).toEqual([]);
		});

		test('should infer correct column types (string, number, boolean, date)', async () => {
			const csvContent =
				'name,age,isActive,createdDate\nJohn,30,true,2024-01-15\nJane,25,false,2024-02-20';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'types.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'types.csv');
			expect(response.body.data).toHaveProperty('rowCount', 2);
			expect(response.body.data).toHaveProperty('columnCount', 4);
			expect(response.body.data.columns).toEqual([
				{ name: 'name', type: 'string', compatibleTypes: ['string'] },
				{ name: 'age', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: 'isActive', type: 'boolean', compatibleTypes: ['boolean', 'string'] },
				{ name: 'createdDate', type: 'date', compatibleTypes: ['date', 'string'] },
			]);
		});
	});

	describe('header handling', () => {
		test('should use first row as headers when hasHeaders=true (default)', async () => {
			const csvContent = 'FirstName,LastName,Age\nJohn,Doe,30\nJane,Smith,25';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.field('hasHeaders', 'true')
				.attach('file', Buffer.from(csvContent), 'with-headers.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('rowCount', 2);
			expect(response.body.data).toHaveProperty('columnCount', 3);
			expect(response.body.data.columns).toEqual([
				{ name: 'FirstName', type: 'string', compatibleTypes: ['string'] },
				{ name: 'LastName', type: 'string', compatibleTypes: ['string'] },
				{ name: 'Age', type: 'number', compatibleTypes: ['number', 'string'] },
			]);
		});

		test('should generate column names when hasHeaders=false', async () => {
			const csvContent = 'John,Doe,30\nJane,Smith,25\nBob,Johnson,35';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.field('hasHeaders', 'false')
				.attach('file', Buffer.from(csvContent), 'no-headers.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('rowCount', 3);
			expect(response.body.data).toHaveProperty('columnCount', 3);
			expect(response.body.data.columns).toEqual([
				{ name: 'Column_1', type: 'string', compatibleTypes: ['string'] },
				{ name: 'Column_2', type: 'string', compatibleTypes: ['string'] },
				{ name: 'Column_3', type: 'number', compatibleTypes: ['number', 'string'] },
			]);
		});

		test('should include all rows in count when hasHeaders=false', async () => {
			const csvContent = '100,200,300\n400,500,600';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.field('hasHeaders', 'false')
				.attach('file', Buffer.from(csvContent), 'no-headers-numbers.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('rowCount', 2); // Both rows counted as data
			expect(response.body.data).toHaveProperty('columnCount', 3);
			expect(response.body.data.columns).toEqual([
				{ name: 'Column_1', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: 'Column_2', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: 'Column_3', type: 'number', compatibleTypes: ['number', 'string'] },
			]);
		});

		test('should default to hasHeaders=true when field not provided', async () => {
			const csvContent = 'col1,col2\nval1,val2';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'default.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('rowCount', 1);
			expect(response.body.data.columns[0].name).toBe('col1');
			expect(response.body.data.columns[1].name).toBe('col2');
		});
	});

	describe('authentication', () => {
		test('should reject unauthenticated requests', async () => {
			const csvContent = 'name,value\ntest,123';

			await testServer.authlessAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'test.csv')
				.expect(401);
		});
	});

	describe('file validation', () => {
		test('should reject request without file field', async () => {
			await authOwnerAgent.post('/data-tables/uploads').send({}).expect(400);
		});

		test('should reject request with wrong field name', async () => {
			const csvContent = 'a,b\n1,2';

			await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('wrongField', Buffer.from(csvContent), 'test.csv')
				.expect(400);
		});

		test('should reject non-CSV files based on MIME type', async () => {
			const textContent = 'This is a plain text file';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(textContent), 'test.txt');

			expect(response.status).toBe(400);
		});

		test('should reject JSON files', async () => {
			const jsonContent = JSON.stringify({ name: 'test', value: 123 });

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(jsonContent), 'test.json');

			expect(response.status).toBe(400);
		});

		test('should reject Excel files', async () => {
			const excelBuffer = Buffer.from('PK\x03\x04'); // Excel file signature

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', excelBuffer, 'test.xlsx');

			expect(response.status).toBe(400);
		});
	});

	describe('file size validation with uploadMaxFileSize', () => {
		// Note: uploadMaxFileSize is set during multer initialization, so changing it
		// at runtime won't affect the behavior. These tests verify the behavior
		// when uploadMaxFileSize is configured via environment variable.

		test('should accept small files when uploadMaxFileSize is set', async () => {
			const smallContent = 'name,value\ntest,123\n';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(smallContent), 'small.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'small.csv');
		});
	});

	describe('file size validation without uploadMaxFileSize', () => {
		let globalConfig: GlobalConfig;
		let originalUploadMaxFileSize: number | undefined;
		let originalMaxSize: number;

		beforeEach(() => {
			globalConfig = Container.get(GlobalConfig);
			originalUploadMaxFileSize = globalConfig.dataTable.uploadMaxFileSize;
			originalMaxSize = globalConfig.dataTable.maxSize;

			// Unset uploadMaxFileSize to trigger remaining space check
			globalConfig.dataTable.uploadMaxFileSize = undefined;
		});

		afterEach(() => {
			// Restore original values
			globalConfig.dataTable.uploadMaxFileSize = originalUploadMaxFileSize;
			globalConfig.dataTable.maxSize = originalMaxSize;
		});

		test('should accept small files when there is remaining storage space', async () => {
			// Set max size to 50MB - in test environment, database is likely empty
			globalConfig.dataTable.maxSize = 50 * 1024 * 1024;

			const smallContent = 'name,value\ntest,123\n';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(smallContent), 'small.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'small.csv');
		});

		test('should reject files exceeding remaining storage space', async () => {
			// Set a very small max size (1KB) to ensure the upload fails
			globalConfig.dataTable.maxSize = 1024;

			// Create content larger than 1KB
			const largeContent = 'a,b,c\n' + '1,2,3\n'.repeat(200);

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(largeContent), 'large.csv');

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message');
			// Error message can be either about remaining space or storage limit exceeded
			const message = response.body.message as string;
			expect(
				message.includes('remaining storage space') || message.includes('Storage limit exceeded'),
			).toBe(true);
			// Verify the error message includes size units (B, KB, or MB)
			expect(message).toMatch(/\d+(B|KB|MB)/);
		});
	});

	describe('edge cases', () => {
		test('should handle CSV with only headers', async () => {
			const csvContent = 'column1,column2,column3';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'headers-only.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'headers-only.csv');
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data).toHaveProperty('rowCount', 0);
			expect(response.body.data).toHaveProperty('columnCount', 3);
			expect(response.body.data.columns).toEqual([
				{ name: 'column1', type: 'string', compatibleTypes: ['string'] },
				{ name: 'column2', type: 'string', compatibleTypes: ['string'] },
				{ name: 'column3', type: 'string', compatibleTypes: ['string'] },
			]);
		});

		test('should handle CSV with Unicode content', async () => {
			const csvContent = 'Name,City\n日本,東京\nДмитрий,Москва';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent, 'utf-8'), 'unicode.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'unicode.csv');
			expect(response.body.data).toHaveProperty('id');
		});

		test('should handle CSV with commas in quoted values', async () => {
			const csvContent = 'name,address\n"Doe, John","123 Main St, Apt 4"';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'quoted.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'quoted.csv');
			expect(response.body.data).toHaveProperty('id');
		});

		test('should handle CSV with newlines in values', async () => {
			const csvContent =
				'name,description\n"Product A","Line 1\nLine 2"\n"Product B","Single line"';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'multiline.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'multiline.csv');
			expect(response.body.data).toHaveProperty('id');
		});

		test('should handle large valid CSV files', async () => {
			// Create a large but valid CSV (within size limit)
			const header = 'id,name,email,city,country\n';
			const rows = Array.from(
				{ length: 1000 },
				(_, i) => `${i},User${i},user${i}@example.com,City${i},Country${i}`,
			).join('\n');
			const largeContent = header + rows;

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(largeContent), 'large-valid.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'large-valid.csv');
			expect(response.body.data).toHaveProperty('id');
		});

		test('should handle CSV without headers (first row treated as header)', async () => {
			// CSV with just data rows, no explicit header
			const csvContent = '1,2,3\n4,5,6\n7,8,9';

			const response = await authOwnerAgent
				.post('/data-tables/uploads')
				.attach('file', Buffer.from(csvContent), 'no-headers.csv')
				.expect(200);

			expect(response.body.data).toHaveProperty('originalName', 'no-headers.csv');
			expect(response.body.data).toHaveProperty('id');
			// First row is treated as headers, so we have 2 data rows
			expect(response.body.data).toHaveProperty('rowCount', 2);
			expect(response.body.data).toHaveProperty('columnCount', 3);
			// First row values become column names
			expect(response.body.data.columns).toEqual([
				{ name: '1', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: '2', type: 'number', compatibleTypes: ['number', 'string'] },
				{ name: '3', type: 'number', compatibleTypes: ['number', 'string'] },
			]);
		});
	});
});
