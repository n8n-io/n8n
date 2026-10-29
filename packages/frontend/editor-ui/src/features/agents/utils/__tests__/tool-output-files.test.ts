import { getToolOutputAttachments } from '../tool-output-files';

describe('getToolOutputAttachments', () => {
	it('reads the files listed in a tool output', () => {
		const file = { fileId: 'aid-1', fileName: 'cat.png', mimeType: 'image/png', sizeBytes: 3 };
		const output = { status: 'success', data: [], files: [file, { fileId: 'aid-2' }] };

		expect(getToolOutputAttachments(output)).toEqual([file]);
	});

	it('returns nothing for other outputs', () => {
		expect(getToolOutputAttachments({ status: 'success' })).toEqual([]);
		expect(getToolOutputAttachments({ files: 'aid-1' })).toEqual([]);
		expect(getToolOutputAttachments('text')).toEqual([]);
		expect(getToolOutputAttachments(undefined)).toEqual([]);
	});
});
