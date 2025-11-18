#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const now = new Date();
const year = now.getFullYear();
const week = Math.ceil(
	((now - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7,
);

const markerContent = `${year}-W${week.toString().padStart(2, '0')}`;
const markerPath = '.build/cache-marker';

mkdirSync('.build', { recursive: true });

// Only write the file if it doesn't exist or if the content has changed
let shouldWrite = true;
if (existsSync(markerPath)) {
	try {
		const existingContent = readFileSync(markerPath, 'utf8');
		if (existingContent === markerContent) {
			shouldWrite = false;
			console.log(`Cache marker already up-to-date: ${markerContent}`);
		}
	} catch (error) {
		// If we can't read the file, we'll write it
	}
}

if (shouldWrite) {
	writeFileSync(markerPath, markerContent);
	console.log(`Cache marker updated: ${markerContent}`);
}
