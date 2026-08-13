import { engine as expressHandlebars } from 'express-handlebars';

/**
 * Creates a configured Handlebars engine for express with custom helpers
 */
export function createHandlebarsEngine() {
	return expressHandlebars({
		defaultLayout: false,
		helpers: {
			eq: (a: unknown, b: unknown) => a === b,
			includes: (arr: unknown, val: unknown) => {
				if (Array.isArray(arr)) {
					return arr.includes(val);
				}
				if (typeof arr === 'string' && typeof val === 'string') {
					// Handle single string match or comma-separated strings
					if (arr === val) {
						return true;
					}
					return arr
						.split(',')
						.map((s) => s.trim())
						.includes(val);
				}
				return false;
			},
		},
	});
}
