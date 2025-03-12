import { mock } from 'jest-mock-extended';
import type { IBinaryData } from 'n8n-workflow';

import { dataUriFromImageData, UnsupportedMimeTypeError } from '../utils';

describe('dataUriFromImageData', () => {
	it('should not throw an error on images', async () => {
		const mockBuffer = Buffer.from('Test data');
		const mockBinaryData = mock<IBinaryData>({ mimeType: 'image/jpeg' });

		const dataUri = dataUriFromImageData(mockBinaryData, mockBuffer);
		expect(dataUri).toBe('data:image/jpeg;base64,VGVzdCBkYXRh');
	});

	it('should throw an UnsupportetMimeTypeError on non-images', async () => {
		const mockBuffer = Buffer.from('Test data');
		const mockBinaryData = mock<IBinaryData>({ mimeType: 'text/plain' });

		expect(() => {
			dataUriFromImageData(mockBinaryData, mockBuffer);
		}).toThrow(UnsupportedMimeTypeError);
	});
});
