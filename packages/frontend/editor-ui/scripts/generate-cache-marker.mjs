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
	// The ISO week-year may differ from calendar year around year boundaries

	// Find Thursday of the current week (ISO weeks run Monday to Sunday)
	const currentThursday = new Date(now);
	const dayOfWeek = (now.getDay() + 6) % 7; // Convert to Monday=0, Sunday=6
	currentThursday.setDate(now.getDate() - dayOfWeek + 3); // Move to Thursday

	// The ISO week-year is the calendar year of the Thursday in this week
	const isoWeekYear = currentThursday.getFullYear();

	// Find January 4th of the ISO week-year (always in Week 1 by definition)
	const jan4 = new Date(isoWeekYear, 0, 4);

	// Find the Monday of Week 1 (the week containing January 4th)
	const jan4DayOfWeek = (jan4.getDay() + 6) % 7; // Convert to Monday=0, Sunday=6
	const week1Monday = new Date(jan4);
	week1Monday.setDate(jan4.getDate() - jan4DayOfWeek);

	// Find Monday of the current week
	const currentMonday = new Date(now);
	currentMonday.setDate(now.getDate() - dayOfWeek);

	// Calculate week number by counting complete weeks between the two Mondays
	const msInWeek = 7 * 24 * 60 * 60 * 1000;
	const weekNumber = Math.floor((currentMonday.getTime() - week1Monday.getTime()) / msInWeek) + 1;

	return `${isoWeekYear}-W${weekNumber.toString().padStart(2, '0')}`;
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
