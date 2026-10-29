import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';

import SessionFilesList from '../SessionFilesList.vue';

const renderComponent = createComponentRenderer(SessionFilesList);
const fileHref = (fileId: string) => `/rest/files/${fileId}`;
const file = {
	fileId: 'f-1',
	fileName: 'reports/q1.csv',
	mimeType: 'text/csv',
	sizeBytes: 3,
	source: 'sandbox',
	createdAt: '2026-10-29T10:00:00.000Z',
};

describe('SessionFilesList', () => {
	it('links each file to its download with the base name', () => {
		const { getByTestId } = renderComponent({ props: { files: [file], fileHref } });

		const link = getByTestId('session-file-link');
		expect(link).toHaveTextContent('reports/q1.csv');
		expect(link).toHaveAttribute('href', '/rest/files/f-1');
		expect(link).toHaveAttribute('download', 'q1.csv');
	});

	it('shows the empty state when the session has no files', () => {
		const { getByTestId } = renderComponent({ props: { files: [], fileHref } });

		expect(getByTestId('session-files-empty')).toHaveTextContent('No files in this session yet');
	});

	it('shows an error instead of the list when loading failed', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { files: [file], fileHref, error: true },
		});

		expect(getByTestId('session-files-error')).toBeInTheDocument();
		expect(queryByTestId('session-file-link')).not.toBeInTheDocument();
	});
});
