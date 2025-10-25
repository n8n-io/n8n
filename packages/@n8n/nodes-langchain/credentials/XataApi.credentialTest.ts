import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';

interface XataCredentials {
	databaseConnectionString: string;
}

function isXataCredentials(data: unknown): data is XataCredentials {
	return (
		typeof data === 'object' &&
		data !== null &&
		'databaseConnectionString' in data &&
		typeof (data as any).databaseConnectionString === 'string'
	);
}

export async function xataConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	if (!isXataCredentials(credential.data)) {
		return {
			status: 'Error',
			message: 'Invalid credential data: databaseConnectionString is required',
		};
	}

	const connectionString = credential.data.databaseConnectionString;

	if (!connectionString) {
		return {
			status: 'Error',
			message: 'Database connection string is required',
		};
	}

	let connection: any = undefined;

	try {
		const url = new URL(connectionString);
		if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
			return {
				status: 'Error',
				message: 'Connection string must use postgres:// or postgresql:// protocol',
			};
		}

		const pgp = pgPromise({
			noWarnings: true,
		});

		const db = pgp(connectionString);

		connection = await db.connect();
		if (connection && typeof connection.query === 'function') {
			await connection.query('SELECT 1');
		}

		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		let message = errorMessage;

		// Provide more user-friendly error messages
		if (errorMessage.includes('ECONNREFUSED')) {
			message = 'Connection refused. Please check your host and port.';
		} else if (errorMessage.includes('ENOTFOUND')) {
			message = 'Host not found. Please check your host name.';
		} else if (errorMessage.includes('ETIMEDOUT')) {
			message = 'Connection timed out. Please check your network connection.';
		} else if (errorMessage.includes('authentication failed')) {
			message = 'Authentication failed. Please check your username and password.';
		} else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
			message = 'Database does not exist. Please check your database name.';
		} else if (errorMessage.includes('Invalid connection string')) {
			message = 'Invalid connection string format. Please check your connection string.';
		}

		return {
			status: 'Error',
			message,
		};
	} finally {
		if (connection && typeof connection.done === 'function') {
			try {
				await connection.done();
			} catch (cleanupError) {
				// Ignore cleanup errors
				this.logger?.debug('Error during connection cleanup', { error: cleanupError });
			}
		}
	}
}
