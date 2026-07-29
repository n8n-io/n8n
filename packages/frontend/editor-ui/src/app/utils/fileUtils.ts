import { fileTypeFromMimeType, type IBinaryData } from 'n8n-workflow';

/** Matches `path.parse().ext`: a leading dot (`.env`) or no dot (`README`) means no extension. */
function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.slice(dotIndex + 1) : '';
}

/** Display/download name for binary data; `fileName` usually already carries the extension. */
export function getBinaryDataFileName({
	fileName,
	fileExtension,
}: Pick<IBinaryData, 'fileName' | 'fileExtension'>): string {
	const name = fileName ?? 'file';
	if (name.includes('.') || !fileExtension) return name;
	return `${name}.${fileExtension}`;
}

export async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
	const reader = new FileReader();
	return await new Promise((resolve, reject) => {
		reader.onload = () => {
			const binaryData: IBinaryData = {
				data: (reader.result as string).split('base64,')?.[1] ?? '',
				mimeType: file.type,
				fileName: file.name,
				fileSize: `${file.size} bytes`,
				fileExtension: getFileExtension(file.name) || undefined,
				fileType: fileTypeFromMimeType(file.type),
			};
			resolve(binaryData);
		};
		reader.onerror = () => {
			reject(new Error('Failed to convert file to binary data'));
		};
		reader.readAsDataURL(file);
	});
}
