import * as fs from 'fs';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import * as temp from 'temp';
import * as sqlite3 from 'sqlite3';
import { DataSource } from 'typeorm';

export function getSqliteDataSource(
	this: IExecuteFunctions,
	binary: INodeExecutionData['binary'],
): DataSource {
	const binaryData = binary?.data;

	if (!binaryData) {
		throw new NodeOperationError(this.getNode(), 'No binary data received.');
	}

	const bufferString = Buffer.from(binaryData.data, BINARY_ENCODING);

	// Track and cleanup temp files at exit
	temp.track();

	const tempDbPath = temp.path({ suffix: '.sqlite' });
	fs.writeFileSync(tempDbPath, bufferString);

	// Initialize a new SQLite database from the temp file
	const tempDb = new sqlite3.Database(tempDbPath, (error: Error | null) => {
		if (error) {
			throw new NodeOperationError(this.getNode(), 'Could not connect to database');
		}
	});
	tempDb.close();

	return new DataSource({
		type: 'sqlite',
		database: tempDbPath,
	});
}
