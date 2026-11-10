import { DataSource } from '@n8n/typeorm';
import * as fs from 'fs';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import * as sqlite3 from 'sqlite3';
import { fileSync, setGracefulCleanup } from 'tmp-promise';

export async function getSqliteDataSource(
	this: IExecuteFunctions,
	binary: INodeExecutionData['binary'],
	binaryPropertyName = 'data',
): Promise<DataSource> {
	const binaryData = binary?.[binaryPropertyName];

	if (!binaryData) {
		throw new NodeOperationError(this.getNode(), 'No binary data received.');
	}

	let fileBase64;
	if (binaryData.id) {
		const chunkSize = 256 * 1024;
		const stream = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
		const buffer = await this.helpers.binaryToBuffer(stream);
		fileBase64 = buffer.toString('base64');
	} else {
		fileBase64 = binaryData.data;
	}

	const bufferString = Buffer.from(fileBase64, BINARY_ENCODING);

	// Keep the database available until the process exits.
	setGracefulCleanup();
	const { name: tempDbPath } = fileSync({ postfix: '.sqlite', discardDescriptor: true });
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
