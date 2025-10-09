#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POPULARITY_ENDPOINT =
	process.env.NODE_POPULARITY_ENDPOINT ||
	'https://internal.users.n8n.cloud/webhook/nodes-popularity-scores';
const FAIL_ON_ERROR = process.env.N8N_FAIL_ON_POPULARITY_FETCH_ERROR === 'true';
const BUILD_DIR = path.join(__dirname, '..', '.build');
const OUTPUT_FILE = path.join(BUILD_DIR, 'node-popularity.json');

async function ensureBuildDir() {
	try {
		await fs.mkdir(BUILD_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist, that's fine
	}
}

async function fetchPopularityData() {
	try {
		console.log('Fetching node popularity data from:', POPULARITY_ENDPOINT);
		const response = await fetch(POPULARITY_ENDPOINT, {
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log(`Successfully fetched popularity data for ${data.length} nodes`);
		return data;
	} catch (error) {
		console.warn('Failed to fetch node popularity data:', error.message);
		return null;
	}
}

async function getExistingData() {
	try {
		const content = await fs.readFile(OUTPUT_FILE, 'utf-8');
		return JSON.parse(content);
	} catch (error) {
		// File doesn't exist or is invalid
		return null;
	}
}

async function savePopularityData(data) {
	await ensureBuildDir();
	await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));
	console.log(`Saved popularity data to ${OUTPUT_FILE} with ${data.length} nodes`);
}

async function fallbackToExistingData() {
	const existingData = await getExistingData();

	if (existingData) {
		console.log('Using existing cached data - no changes made');
		// Don't regenerate the file, keep the existing one
	} else {
		console.error('No data available - neither from API nor cache');
		console.error('Creating empty placeholder file to avoid build failure');
		await savePopularityData([]);
	}
}

async function main() {
	try {
		// Try to fetch fresh data
		const freshData = await fetchPopularityData();

		if (freshData && Array.isArray(freshData) && freshData.length > 0) {
			// Save the fresh data
			await savePopularityData(freshData);
		} else {
			// Fetching failed
			if (FAIL_ON_ERROR) {
				console.error('N8N_FAIL_ON_POPULARITY_FETCH_ERROR is set - failing build');
				process.exit(1);
			}

			// Check if we have existing data
			console.log('API unavailable, checking for existing cached data');
			await fallbackToExistingData();
		}
	} catch (error) {
		console.error('Error in fetch-node-popularity script:', error);

		if (FAIL_ON_ERROR) {
			console.error('N8N_FAIL_ON_POPULARITY_FETCH_ERROR is set - failing build');
			process.exit(1);
		}

		await fallbackToExistingData();
	}
}

main();
