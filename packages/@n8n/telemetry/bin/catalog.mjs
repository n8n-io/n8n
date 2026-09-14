import { buildCatalog, formatCatalog, TELEMETRY_EVENT } from '../dist/index.js';

const catalog = buildCatalog(TELEMETRY_EVENT);
const output = process.argv.includes('--json')
	? JSON.stringify(catalog, null, 2)
	: formatCatalog(catalog);
console.log(output);
