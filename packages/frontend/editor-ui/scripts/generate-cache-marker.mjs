#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, '..', '.build');
const CACHE_MARKER_FILE = path.join(BUILD_DIR, 'cache-marker');

async function ensureBuildDir() {
	try {
		await fs.mkdir(BUILD_DIR, { recursive: true });
		console.log(`Build directory ensured: ${BUILD_DIR}`);
	} catch (error) {
		console.error('Failed to create build directory:', error.message);
		process.exit(1);
	}
}

function generateWeekMarker() {
	const now = new Date();

	// ISO 8601 week numbering implementation
	// Week 1 is the first week that contains at least 4 days of the new year
	// This is equivalent to the week containing the first Thursday of the year

	// Get Thursday of the current week (ISO weeks run Monday to Sunday)
	const currentThursday = new Date(now);
	const daysFromMonday = (now.getDay() + 6) % 7; // Convert Sunday=0 to Sunday=6, Monday=0
	const daysToThursday = 3 - daysFromMonday;
	currentThursday.setDate(now.getDate() + daysToThursday);

	// The week-year is the year of the Thursday in this week
	const weekYear = currentThursday.getFullYear();

	// Find the first Thursday of the week-year (this defines Week 1)
	const jan4 = new Date(weekYear, 0, 4); // January 4th is always in Week 1
	const firstThursday = new Date(jan4);
	const jan4DaysFromMonday = (jan4.getDay() + 6) % 7;
	const daysToFirstThursday = 3 - jan4DaysFromMonday;
	firstThursday.setDate(jan4.getDate() + daysToFirstThursday);

	// Calculate week number by counting weeks between first Thursday and current Thursday
	const msInWeek = 7 * 24 * 60 * 60 * 1000;
	const weekNumber =
		Math.floor((currentThursday.getTime() - firstThursday.getTime()) / msInWeek) + 1;

	return `${weekYear}-W${weekNumber.toString().padStart(2, '0')}`;
}

async function writeCacheMarker() {
	try {
		await ensureBuildDir();

		const marker = generateWeekMarker();
		await fs.writeFile(CACHE_MARKER_FILE, marker);

		console.log(`Cache marker created: ${marker}`);
		console.log(`Saved to: ${CACHE_MARKER_FILE}`);
	} catch (error) {
		console.error('Failed to write cache marker:', error.message);
		process.exit(1);
	}
}

async function main() {
	await writeCacheMarker();
}

main();
