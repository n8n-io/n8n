const sqlite3 = require('sqlite3');

// Get DB path from command line args
const dbPath = process.argv[2];
if (!dbPath) {
	console.error('DB path not provided');
	process.exit(1);
}

// Open database connection
const db = new sqlite3.Database(dbPath);

// Promisify get operation
const dbGet = (sql, params = []) =>
	new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});

// Child process that reads from SQLite and sends confirmation
process.on('message', async (payload) => {
	try {
		// Read from database
		const row = await dbGet('SELECT type, data FROM transfers WHERE id = ?', [payload.rowId]);

		if (!row) {
			throw new Error(`Row ${payload.rowId} not found`);
		}

		// Parse if it's an object
		if (row.type === 'object') {
			JSON.parse(row.data);
		}

		// Send confirmation back
		if (process.send) {
			process.send({ success: true });
		}
	} catch (err) {
		if (process.send) {
			process.send({ success: false, error: err.message });
		}
	}
});
