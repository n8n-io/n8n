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
	const year = now.getFullYear();

	// 计算ISO周数
	const startOfYear = new Date(year, 0, 1);
	const msInWeek = 604800000;
	const msInDay = 86400000;

	// 找到第一个周一
	let firstMonday = startOfYear;
	while (firstMonday.getDay() !== 1) {
		firstMonday = new Date(firstMonday.getTime() + msInDay);
	}

	const weekNumber = Math.ceil((now.getTime() - firstMonday.getTime()) / msInWeek) + 1;
	return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
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
