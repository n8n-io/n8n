try {
	const errors = require('@n8n/errors');
	console.log('Successfully required @n8n/errors from core/src');
} catch (e) {
	console.error('Failed to require @n8n/errors from core/src');
	console.error(e);
}
