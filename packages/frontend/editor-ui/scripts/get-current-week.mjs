#!/usr/bin/env node

const now = new Date();
const year = now.getFullYear();
const startOfYear = new Date(year, 0, 1);
const daysSinceStart = (now - startOfYear) / 86400000;
const dayOfWeek = startOfYear.getDay();
const week = Math.ceil((daysSinceStart + dayOfWeek + 1) / 7);

console.log(`${year}-W${String(week).padStart(2, '0')}`);
