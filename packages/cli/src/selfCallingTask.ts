import axios from 'axios';

export async function scheduleSelfCallingTask() {
	console.log('[Self-Calling Task] Executing main logic...');

	// TODO: Add Reddit fetching and filtering logic here

	// Schedule next call after 10 minutes
	setTimeout(async () => {
		try {
			await axios.get('http://localhost:5678/api/self-idea-bot'); // Change to public URL if deployed
			console.log('[Self-Calling Task] Called itself again.');
		} catch (err) {
			console.error('[Self-Calling Task] Error calling self:', err.message);
		}
	}, 10 * 60 * 1000);
}
