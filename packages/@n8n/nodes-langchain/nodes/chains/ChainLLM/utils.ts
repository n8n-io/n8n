import type { IBinaryData } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

export class UnsupportedMimeTypeError extends ApplicationError {}

export function dataUriFromImageData(binaryData: IBinaryData, bufferData: Buffer) {
	if (!binaryData.mimeType?.startsWith('image/'))
		throw new UnsupportedMimeTypeError(
			`${binaryData.mimeType} is not a supported type of binary data. Only images are supported.`,
		);
	return `data:${binaryData.mimeType};base64,${bufferData.toString('base64')}`;
}
