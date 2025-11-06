#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';

const now = new Date();
const year = now.getFullYear();
const week = Math.ceil(
	((now - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7,
);

mkdirSync('.build', { recursive: true });
writeFileSync('.build/cache-marker', `${year}-W${week.toString().padStart(2, '0')}`);
