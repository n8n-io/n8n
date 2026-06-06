const fs = require('node:fs');
const path = require('node:path/posix');

const RUNNER_VERSION = 1;

const CSV_SAMPLE_VALUE_LIMIT = 5;
const CSV_PROFILE_DISTINCT_LIMIT = 100;
const CSV_DISTINCT_TRACK_LIMIT = 10_000;
const CSV_MAX_AGGREGATE_GROUPS = 50_000;
const PREFERRED_DISAMBIGUATING_COLUMNS = [
	'Year',
	'Date',
	'Month',
	'Country',
	'Country Name',
	'Source',
	'Category',
	'Name',
];

function normaliseCsvValue(value) {
	if (value === null || value === undefined) return '';
	return String(value);
}

function toCsvRecordValues(record, columns) {
	return Object.fromEntries(columns.map((column) => [column, normaliseCsvValue(record[column])]));
}

function matchesFilters(record, filters) {
	return filters.every((filter) => {
		const value = normaliseCsvValue(record[filter.column]);
		if (filter.op === 'eq') return value === filter.value;
		if (filter.op === 'contains') return value.includes(filter.value);
		return filter.value.includes(value);
	});
}

function levenshtein(left, right) {
	const a = left.toLowerCase();
	const b = right.toLowerCase();
	const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
		Array.from({ length: b.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)),
	);
	for (let row = 1; row <= a.length; row++) {
		for (let col = 1; col <= b.length; col++) {
			const cost = a[row - 1] === b[col - 1] ? 0 : 1;
			matrix[row][col] = Math.min(
				matrix[row - 1][col] + 1,
				matrix[row][col - 1] + 1,
				matrix[row - 1][col - 1] + cost,
			);
		}
	}
	return matrix[a.length][b.length];
}

function getClosestColumnMatches(requestedColumn, headers) {
	const requested = requestedColumn.toLowerCase();
	return headers
		.map((header) => ({ header, distance: levenshtein(requested, header.toLowerCase()) }))
		.filter(({ header, distance }) => header.toLowerCase().includes(requested) || distance <= 3)
		.sort((left, right) => left.distance - right.distance || left.header.localeCompare(right.header))
		.slice(0, 3)
		.map(({ header }) => header);
}

function formatMissingCsvColumnError(fileName, requestedColumn, headers) {
	const suggestions = getClosestColumnMatches(requestedColumn, headers);
	const didYouMean =
		suggestions.length > 0
			? ' Did you mean ' + suggestions.map((value) => '"' + value + '"').join(', ') + '?'
			: '';
	return (
		'CSV column "' +
		requestedColumn +
		'" not found in "' +
		fileName +
		'". Available columns: ' +
		headers.join(', ') +
		'.' +
		didYouMean +
		' Run csv_profile if you are uncertain about the schema.'
	);
}

function validateCsvColumns(headers, fileName, columns) {
	for (const column of columns) {
		if (!headers.includes(column)) {
			throw new Error(formatMissingCsvColumnError(fileName, column, headers));
		}
	}
}

function hasControlCharacters(value) {
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code <= 0x1f || code === 0x7f) return true;
	}
	return false;
}

function safeRelativePath(requestedPath) {
	if (hasControlCharacters(requestedPath)) throw new Error('Invalid path');
	if (path.isAbsolute(requestedPath)) throw new Error('Absolute paths are not allowed');
	if (requestedPath.split(/[\\/]/).includes('..')) {
		throw new Error('Parent path segments are not allowed');
	}
	const normalized = path.normalize(requestedPath);
	if (normalized === '..' || normalized.startsWith('../')) {
		throw new Error('Path escapes the knowledge workspace');
	}
	return normalized;
}

function resolveFileReference(files, reference) {
	const matches = files.filter(
		(file) =>
			file.id === reference || file.relativePath === reference || file.fileName === reference,
	);
	if (matches.length === 1) return { status: 'found', file: matches[0] };
	if (matches.length === 0) return { status: 'missing', error: 'File "' + reference + '" not found' };
	return {
		status: 'ambiguous',
		error:
			'File "' +
			reference +
			'" matches multiple uploaded files. Use the file id or relative path instead.',
	};
}

function resolveCsvFile(files, reference) {
	const resolvedFile = resolveFileReference(files, reference);
	if (resolvedFile.status !== 'found') throw new Error(resolvedFile.error);
	const { file } = resolvedFile;
	const isCsv = file.mimeType === 'text/csv' || file.relativePath.toLowerCase().endsWith('.csv');
	if (!isCsv) throw new Error('File "' + file.fileName + '" is not queryable as CSV.');
	return file;
}

function preferenceScore(column) {
	const exactIndex = PREFERRED_DISAMBIGUATING_COLUMNS.findIndex(
		(candidate) => candidate.toLowerCase() === column.toLowerCase(),
	);
	if (exactIndex !== -1) return exactIndex;
	const partialIndex = PREFERRED_DISAMBIGUATING_COLUMNS.findIndex((candidate) =>
		column.toLowerCase().includes(candidate.toLowerCase()),
	);
	return partialIndex === -1 ? PREFERRED_DISAMBIGUATING_COLUMNS.length + 1 : partialIndex + 0.5;
}

function getSuggestedDisambiguatingColumns(headers, filters, selectedColumns) {
	const alreadyUsed = new Set([...filters.map((filter) => filter.column), ...selectedColumns]);
	return headers
		.filter((header) => !alreadyUsed.has(header))
		.sort((left, right) => preferenceScore(left) - preferenceScore(right))
		.slice(0, 5);
}

function createCsvDistinctTracker(columns, limit) {
	const values = new Map(columns.map((column) => [column, new Set()]));
	return {
		add(record) {
			for (const [column, distinctValues] of values) {
				if (distinctValues.size < limit) distinctValues.add(normaliseCsvValue(record[column]));
			}
		},
		toOutput() {
			return Object.fromEntries(
				Array.from(values.entries()).flatMap(([column, distinctValues]) =>
					distinctValues.size > 0 ? [[column, Array.from(distinctValues)]] : [],
				),
			);
		},
		columns: Array.from(values.keys()),
	};
}

function buildCsvAmbiguity(matchedRows, limit, tracker) {
	return {
		matchedRows,
		message:
			matchedRows > limit
				? 'Matched ' +
					matchedRows +
					' rows and returned only the first ' +
					limit +
					'. This is not a unique result. Refine filters before answering.'
				: 'Matched ' +
					matchedRows +
					' rows. This is not a unique result. Refine filters before answering.',
		suggestedColumns: tracker?.columns ?? [],
		sampleDistinctValues: tracker?.toOutput(),
	};
}

function isLikelyDate(value) {
	if (!/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?$/.test(value)) return false;
	return Number.isFinite(Date.parse(value));
}

function inferCsvColumnType({ nonEmptyCount, allInteger, allNumber, allBoolean, allDate }) {
	if (nonEmptyCount === 0) return 'empty';
	if (allBoolean) return 'boolean';
	if (allInteger) return 'integer';
	if (allNumber) return 'number';
	if (allDate) return 'date';
	return 'string';
}

function createCsvColumnProfileState(distinctLimit) {
	const distinctValues = new Set();
	const sampleValues = [];
	let distinctCountTruncated = false;
	let emptyCount = 0;
	let nonEmptyCount = 0;
	let allInteger = true;
	let allNumber = true;
	let allBoolean = true;
	let allDate = true;
	return {
		add(value) {
			if (value === '') {
				emptyCount++;
				return;
			}
			nonEmptyCount++;
			if (distinctValues.size < distinctLimit) {
				distinctValues.add(value);
			} else if (!distinctValues.has(value)) {
				distinctCountTruncated = true;
			}
			if (!sampleValues.includes(value) && sampleValues.length < CSV_SAMPLE_VALUE_LIMIT) {
				sampleValues.push(value);
			}
			allInteger &&= /^-?\d+$/.test(value);
			allNumber &&= Number.isFinite(Number(value));
			allBoolean &&= /^(true|false|yes|no|0|1)$/i.test(value);
			allDate &&= isLikelyDate(value);
		},
		toOutput(name) {
			return {
				name,
				inferredType: inferCsvColumnType({
					nonEmptyCount,
					allInteger,
					allNumber,
					allBoolean,
					allDate,
				}),
				emptyCount,
				distinctCount: distinctValues.size,
				distinctCountTruncated,
				sampleValues,
			};
		},
	};
}

function getLikelyDisambiguatingColumns(columnProfiles, rowCount) {
	return columnProfiles
		.filter((column) => {
			const distinctCount = column.distinctCount ?? 0;
			return distinctCount > 1 && distinctCount < rowCount && !column.distinctCountTruncated;
		})
		.sort((left, right) => preferenceScore(left.name) - preferenceScore(right.name))
		.slice(0, 5)
		.map((column) => column.name);
}

function createCsvAggregateGroup(groupValues, metrics) {
	return {
		groupValues,
		count: 0,
		metrics: Object.fromEntries(metrics.map((metric) => [metric, createNumericAggregateState()])),
	};
}

function createNumericAggregateState() {
	return {
		count: 0,
		sum: 0,
		min: undefined,
		max: undefined,
		skipped: 0,
		add(value) {
			const trimmedValue = value.trim();
			const numericValue = Number(trimmedValue);
			if (trimmedValue === '' || !Number.isFinite(numericValue)) {
				this.skipped++;
				return;
			}
			this.count++;
			this.sum += numericValue;
			this.min = this.min === undefined ? numericValue : Math.min(this.min, numericValue);
			this.max = this.max === undefined ? numericValue : Math.max(this.max, numericValue);
		},
	};
}

function formatCsvAggregateGroup(group, functions, metrics) {
	const output = { ...group.groupValues };
	for (const fn of functions) {
		if (fn === 'count') output.count = group.count;
	}
	for (const metric of metrics) {
		const state = group.metrics[metric];
		for (const fn of functions) {
			if (fn === 'min') output['min_' + metric] = state.min ?? null;
			if (fn === 'max') output['max_' + metric] = state.max ?? null;
			if (fn === 'sum') output['sum_' + metric] = state.count > 0 ? state.sum : null;
			if (fn === 'avg') output['avg_' + metric] = state.count > 0 ? state.sum / state.count : null;
		}
	}
	return output;
}

function compareCsvAggregateValues(left, right) {
	if (left === right) return 0;
	if (left === null || left === undefined) return 1;
	if (right === null || right === undefined) return -1;
	if (typeof left === 'number' && typeof right === 'number') return left - right;
	return String(left).localeCompare(String(right));
}

function sortCsvAggregateResults(results, orderBy) {
	if (!orderBy) return;
	const direction = orderBy.direction === 'desc' ? -1 : 1;
	results.sort(
		(left, right) =>
			compareCsvAggregateValues(left[orderBy.column], right[orderBy.column]) * direction,
	);
}

async function streamCsvRecords(filePath, handlers) {
	return await new Promise((resolve, reject) => {
		const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
		let headers = null;
		let lineNumber = 1;
		let row = [];
		let field = '';
		let inQuotes = false;
		let rowStarted = false;
		let stripBom = true;

		const finishField = () => {
			let value = field;
			if (stripBom) {
				value = value.replace(/^\uFEFF/, '');
				stripBom = false;
			}
			row.push(value);
			field = '';
		};

		const finishRow = () => {
			if (!rowStarted) return;
			rowStarted = false;
			const isEmpty = row.length === 0 || row.every((cell) => cell === '');
			if (headers === null) {
				if (!isEmpty) {
					headers = row;
					handlers.onHeaders?.(headers);
				}
			} else if (!isEmpty) {
				const record = {};
				for (let index = 0; index < headers.length; index++) {
					record[headers[index]] = row[index] ?? '';
				}
				handlers.onRecord({ record, fileLineNumber: lineNumber });
			}
			row = [];
		};

		const processText = (text) => {
			for (let index = 0; index < text.length; index++) {
				const ch = text[index];
				const next = text[index + 1];
				rowStarted = true;
				if (inQuotes) {
					if (ch === '"') {
						if (next === '"') {
							field += '"';
							index++;
						} else {
							inQuotes = false;
						}
					} else {
						field += ch;
					}
					continue;
				}
				if (ch === '"') {
					inQuotes = true;
					continue;
				}
				if (ch === ',') {
					finishField();
					continue;
				}
				if (ch === '\r') {
					if (next === '\n') index++;
					finishField();
					finishRow();
					lineNumber++;
					continue;
				}
				if (ch === '\n') {
					finishField();
					finishRow();
					lineNumber++;
					continue;
				}
				field += ch;
			}
		};

		stream.on('data', (chunk) => processText(chunk));
		stream.on('error', reject);
		stream.on('end', () => {
			if (field.length > 0 || row.length > 0) {
				finishField();
				finishRow();
			}
			resolve();
		});
	});
}

async function queryCsv(file, input) {
	const headers = [];
	const limit = input.limit ?? 20;
	const select = input.select;
	const rows = [];
	const rowNumbers = [];
	const records = [];
	let ambiguityTracker;
	let matched = 0;
	if (input.rowNumber === undefined && select === undefined) {
		throw new Error('csv_query requires select unless rowNumber is provided.');
	}
	const filePath = safeRelativePath(file.relativePath);

	await streamCsvRecords(filePath, {
		onHeaders: (parsedHeaders) => {
			headers.push(...parsedHeaders);
			validateCsvColumns(headers, file.fileName, [
				...(select ?? []),
				...(input.where ?? []).map((filter) => filter.column),
			]);
			ambiguityTracker = createCsvDistinctTracker(
				getSuggestedDisambiguatingColumns(headers, input.where ?? [], select ?? []),
				CSV_SAMPLE_VALUE_LIMIT,
			);
		},
		onRecord: ({ record, fileLineNumber }) => {
			if (input.rowNumber !== undefined && fileLineNumber !== input.rowNumber) return;
			if (input.rowNumber === undefined && !matchesFilters(record, input.where ?? [])) return;
			matched++;
			ambiguityTracker?.add(record);
			const columns = select ?? headers;
			if (rows.length < limit) {
				const values = toCsvRecordValues(record, columns);
				rows.push(columns.map((column) => values[column]));
				rowNumbers.push(fileLineNumber);
				records.push({ rowNumber: fileLineNumber, fileLineNumber, values });
			}
		},
	});
	if (headers.length === 0) validateCsvColumns(headers, file.fileName, select ?? []);

	const columns = select ?? headers;
	const truncated = matched > rows.length;
	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		columns,
		rowNumbers,
		rows,
		records,
		rowCount: matched,
		truncated,
		rowNumberBase: 'rowNumber is the CSV file line number; line 1 is the header row.',
		ambiguity:
			input.rowNumber === undefined && (matched > 1 || truncated)
				? buildCsvAmbiguity(matched, input.limit ?? 20, ambiguityTracker)
				: undefined,
	};
}

async function profileCsv(file, input) {
	const headers = [];
	const sampleRows = [];
	const rowCountByColumn = new Map();
	let rowCount = 0;
	const distinctLimit = input.distinctLimit ?? CSV_PROFILE_DISTINCT_LIMIT;
	const filePath = safeRelativePath(file.relativePath);

	await streamCsvRecords(filePath, {
		onHeaders: (parsedHeaders) => {
			headers.push(...parsedHeaders);
			for (const header of headers) {
				rowCountByColumn.set(header, createCsvColumnProfileState(distinctLimit));
			}
		},
		onRecord: ({ record }) => {
			rowCount++;
			if (sampleRows.length < (input.sampleSize ?? 5)) {
				sampleRows.push(toCsvRecordValues(record, headers));
			}
			for (const header of headers) {
				rowCountByColumn.get(header)?.add(normaliseCsvValue(record[header]));
			}
		},
	});

	const columnProfiles = headers.map((header) => {
		const profile = rowCountByColumn.get(header) ?? createCsvColumnProfileState(distinctLimit);
		return profile.toOutput(header);
	});

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		columns: headers,
		rowCount,
		sampleRows,
		columnProfiles,
		likelyKeyColumns: columnProfiles
			.filter((column) => column.distinctCount === rowCount && rowCount > 0)
			.map((column) => column.name),
		likelyDisambiguatingColumns: getLikelyDisambiguatingColumns(columnProfiles, rowCount),
	};
}

async function distinctCsv(file, input) {
	const values = new Set();
	let distinctTruncated = false;
	const outputValues = [];
	const filePath = safeRelativePath(file.relativePath);

	await streamCsvRecords(filePath, {
		onHeaders: (parsedHeaders) => {
			validateCsvColumns(parsedHeaders, file.fileName, [
				input.column,
				...(input.where ?? []).map((filter) => filter.column),
			]);
		},
		onRecord: ({ record }) => {
			if (!matchesFilters(record, input.where ?? [])) return;
			const value = normaliseCsvValue(record[input.column]);
			if (!values.has(value)) {
				if (values.size < CSV_DISTINCT_TRACK_LIMIT) {
					values.add(value);
				} else {
					distinctTruncated = true;
				}
				if (outputValues.length < (input.limit ?? 50)) outputValues.push(value);
			}
		},
	});

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		column: input.column,
		values: outputValues,
		distinctCount: values.size,
		truncated: distinctTruncated || values.size > outputValues.length,
	};
}

async function aggregateCsv(file, input) {
	const functions = input.functions ?? ['count'];
	const metrics = Array.from(
		new Set([...(input.metric ? [input.metric] : []), ...(input.metrics ?? [])]),
	);
	const needsMetric = functions.some((fn) => fn !== 'count');
	if (needsMetric && metrics.length === 0) {
		throw new Error('csv_aggregate requires metric or metrics for min, max, sum, or avg.');
	}
	const groups = new Map();
	let rowCount = 0;
	let groupLimitReached = false;
	const filePath = safeRelativePath(file.relativePath);

	await streamCsvRecords(filePath, {
		onHeaders: (parsedHeaders) => {
			validateCsvColumns(parsedHeaders, file.fileName, [
				...metrics,
				...(input.groupBy ?? []),
				...(input.where ?? []).map((filter) => filter.column),
			]);
		},
		onRecord: ({ record }) => {
			if (!matchesFilters(record, input.where ?? [])) return;
			rowCount++;
			const groupValues = toCsvRecordValues(record, input.groupBy ?? []);
			const key = JSON.stringify(groupValues);
			let group = groups.get(key);
			if (!group) {
				if (groups.size >= CSV_MAX_AGGREGATE_GROUPS) {
					groupLimitReached = true;
					return;
				}
				group = createCsvAggregateGroup(groupValues, metrics);
				groups.set(key, group);
			}
			group.count++;
			for (const metric of metrics) {
				group.metrics[metric].add(normaliseCsvValue(record[metric]));
			}
		},
	});
	if (groups.size === 0 && input.groupBy === undefined) {
		groups.set(JSON.stringify({}), createCsvAggregateGroup({}, metrics));
	}

	const results = Array.from(groups.values()).map((group) =>
		formatCsvAggregateGroup(group, functions, metrics),
	);
	sortCsvAggregateResults(results, input.orderBy);
	const limit = input.limit ?? 50;
	const skippedNonNumeric = {};
	for (const group of groups.values()) {
		for (const metric of metrics) {
			skippedNonNumeric[metric] = (skippedNonNumeric[metric] ?? 0) + group.metrics[metric].skipped;
		}
	}

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		rowCount,
		functions,
		metrics,
		groupBy: input.groupBy,
		results: results.slice(0, limit),
		truncated: results.length > limit || groupLimitReached,
		skippedNonNumeric,
	};
}

async function main() {
	if (process.argv.includes('--version')) {
		process.stdout.write(String(RUNNER_VERSION));
		return;
	}
	const encoded = process.env.N8N_KNOWLEDGE_CSV_INPUT_B64;
	if (!encoded) {
		console.error('Missing CSV runner input');
		process.exit(1);
	}
	let payload;
	try {
		payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
	} catch {
		console.error('Invalid CSV runner input');
		process.exit(1);
	}
	if (payload.version !== 1) {
		console.error('Unsupported CSV runner version');
		process.exit(1);
	}
	const file = resolveCsvFile(payload.files, payload.input.file);
	const operation = payload.input.operation;
	let result;
	if (operation === 'csv_query') result = await queryCsv(file, payload.input);
	else if (operation === 'csv_profile') result = await profileCsv(file, payload.input);
	else if (operation === 'csv_distinct') result = await distinctCsv(file, payload.input);
	else if (operation === 'csv_aggregate') result = await aggregateCsv(file, payload.input);
	else {
		console.error('Unsupported CSV operation: ' + operation);
		process.exit(1);
	}
	process.stdout.write(JSON.stringify({ ok: true, result }));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
