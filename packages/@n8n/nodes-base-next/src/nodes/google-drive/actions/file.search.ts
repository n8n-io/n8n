import { t } from '@n8n/node-sdk';

import { driveFile, driveIdOf, file, FILE_FIELDS, FOLDER_TYPE } from '../google-drive.node';

/** Mirrors `escapeBackslashQuotedValue` in nodes-base: a value in a Drive query string. */
const quoted = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

const filePage = t
	.obj({ files: t.arr(driveFile).optional(), nextPageToken: t.str().optional() })
	.with({
		additionalProperties: true,
	});

export const searchFiles = file.action('search', {
	action: 'Search files and folders',
	summary: 'Find files and folders by name, folder, and type.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		nameContains: t.str().hint('Part of the name').optional(),
		query: t.str().hint("Drive query syntax, e.g. modifiedTime > '2026-01-01'").optional(),
		folderId: t.str().hint('Only items directly in this folder; ID or URL').optional(),
		type: t.oneOf('all', 'files', 'folders').default('all'),
		includeTrashed: t.bool().default(false),
	},
	output: driveFile,
	list: {
		path: '/drive/v3/files',
		query: (input) => ({
			q: [
				input.nameContains === undefined
					? undefined
					: `name contains ${quoted(input.nameContains)}`,
				// Parentheses keep the folder and trash terms on every alternative of an `or` query.
				input.query === undefined || input.query.trim() === '' ? undefined : `(${input.query})`,
				input.folderId === undefined
					? undefined
					: `${quoted(driveIdOf(input.folderId))} in parents`,
				input.type === 'folders' ? `mimeType = '${FOLDER_TYPE}'` : undefined,
				input.type === 'files' ? `mimeType != '${FOLDER_TYPE}'` : undefined,
				input.includeTrashed ? undefined : 'trashed = false',
			]
				.filter((term) => term !== undefined && term !== '')
				.join(' and '),
			fields: `nextPageToken, files(${FILE_FIELDS.replace('kind,', '')})`,
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'appDataFolder, drive',
			corpora: 'allDrives',
		}),
		response: filePage,
		items: (page) => page.files ?? [],
		pages: {
			style: 'cursor',
			next: (page) => page.nextPageToken,
			send: { query: 'pageToken' },
			size: { query: 'pageSize', max: 1000 },
		},
	},
});
