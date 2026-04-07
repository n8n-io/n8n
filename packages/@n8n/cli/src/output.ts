export type OutputFormat = 'table' | 'json' | 'id-only';

/** Pick specific columns from a record for table display. */
function pickColumns(data: Record<string, unknown>, columns: string[]): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const col of columns) {
		result[col] = data[col];
	}
	return result;
}

/** Format a value for table display. */
function formatValue(value: unknown): string {
	if (value === null || value === undefined) return '-';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'string') {
		// Truncate long strings
		return value.length > 60 ? value.slice(0, 57) + '...' : value;
	}
	if (typeof value === 'number') return String(value);
	if (typeof value === 'object') return JSON.stringify(value);
	return typeof value === 'bigint' ? String(value) : JSON.stringify(value);
}

/** Render a list of records as an aligned text table. */
function renderTable(
	data: Array<Record<string, unknown>>,
	columns?: string[],
	noHeader?: boolean,
): string {
	if (data.length === 0) return 'No results.';

	const cols = columns ?? Object.keys(data[0]);
	const rows = data.map((row) => pickColumns(row, cols));

	// Calculate column widths
	const widths: Record<string, number> = {};
	for (const col of cols) {
		widths[col] = col.length;
		for (const row of rows) {
			const len = formatValue(row[col]).length;
			if (len > widths[col]) widths[col] = len;
		}
	}

	// Rows
	const lines = rows.map((row) =>
		cols.map((c) => formatValue(row[c]).padEnd(widths[c])).join('  '),
	);

	if (noHeader) {
		return lines.join('\n');
	}

	// Header
	const header = cols.map((c) => c.toUpperCase().padEnd(widths[c])).join('  ');
	const separator = cols.map((c) => '-'.repeat(widths[c])).join('  ');

	return [header, separator, ...lines].join('\n');
}

export interface OutputOptions {
	format: OutputFormat;
	columns?: string[];
	idField?: string;
	noHeader?: boolean;
}

/** Format data for output based on the selected format. */
export function formatOutput(data: unknown, options: OutputOptions): string {
	const { format, columns, idField = 'id', noHeader } = options;

	switch (format) {
		case 'json':
			return JSON.stringify(data, null, 2);

		case 'id-only': {
			if (Array.isArray(data)) {
				return data
					.map((item: Record<string, unknown>) => {
						const val = item[idField];
						return val !== null && val !== undefined ? `${val as string | number}` : '';
					})
					.join('\n');
			}
			if (typeof data === 'object' && data !== null && idField in data) {
				return String((data as Record<string, unknown>)[idField]);
			}
			return '';
		}

		case 'table':
		default: {
			if (Array.isArray(data)) {
				return renderTable(data as Array<Record<string, unknown>>, columns, noHeader);
			}
			// Single object: render as key-value pairs
			if (typeof data === 'object' && data !== null) {
				const entries = Object.entries(data as Record<string, unknown>);
				if (noHeader) {
					return entries.map(([, v]) => formatValue(v)).join('\n');
				}
				const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
				return entries.map(([k, v]) => `${k.padEnd(maxKeyLen)}  ${formatValue(v)}`).join('\n');
			}
			return String(data);
		}
	}
}

// ─── jq-style filter ────────────────────────────────────────────

type JqSegment =
	| { type: 'field'; name: string }
	| { type: 'index'; index: number }
	| { type: 'iterate' };

function parseJqPath(expr: string): JqSegment[] {
	const segments: JqSegment[] = [];
	let i = 0;

	// Skip leading dot
	if (expr[0] === '.') i++;

	while (i < expr.length) {
		if (expr[i] === '[') {
			i++; // skip [
			if (expr[i] === ']') {
				segments.push({ type: 'iterate' });
				i++; // skip ]
			} else {
				let numStr = '';
				while (i < expr.length && expr[i] !== ']') {
					numStr += expr[i];
					i++;
				}
				segments.push({ type: 'index', index: parseInt(numStr, 10) });
				i++; // skip ]
			}
		} else if (expr[i] === '.') {
			i++; // skip dot separator
		} else {
			let name = '';
			while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') {
				name += expr[i];
				i++;
			}
			if (name) {
				segments.push({ type: 'field', name });
			}
		}
	}

	return segments;
}

function evaluateJq(data: unknown, segments: JqSegment[], startIdx: number): unknown {
	let current: unknown = data;

	for (let i = startIdx; i < segments.length; i++) {
		const seg = segments[i];
		if (current === null || current === undefined) return current;

		switch (seg.type) {
			case 'field':
				if (typeof current === 'object' && current !== null) {
					current = (current as Record<string, unknown>)[seg.name];
				} else {
					return undefined;
				}
				break;
			case 'index':
				if (Array.isArray(current)) {
					current = current[seg.index];
				} else {
					return undefined;
				}
				break;
			case 'iterate':
				if (Array.isArray(current)) {
					return current.map((item) => evaluateJq(item, segments, i + 1));
				}
				return undefined;
		}
	}

	return current;
}

/**
 * Apply a basic jq-style filter expression to data.
 *
 * Supported syntax:
 *   .           identity (return data as-is)
 *   .field      object property access
 *   .a.b.c      nested property access
 *   .[0]        array index
 *   .[]         iterate array (maps remaining path over each element)
 *   .[].field   extract field from each array element
 */
export function applyJqFilter(data: unknown, expression: string): unknown {
	const expr = expression.trim();
	if (expr === '.') return data;
	const segments = parseJqPath(expr);
	return evaluateJq(data, segments, 0);
}
