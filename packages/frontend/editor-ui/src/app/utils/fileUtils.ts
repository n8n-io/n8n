import { fileTypeFromMimeType, type IBinaryData } from 'n8n-workflow';

export async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
	const reader = new FileReader();
	return await new Promise((resolve, reject) => {
		reader.onload = () => {
			const lastDotIndex = file.name.lastIndexOf('.');
			const fileExtension = lastDotIndex > 0 ? file.name.slice(lastDotIndex + 1) : '';
			const binaryData: IBinaryData = {
				data: (reader.result as string).split('base64,')?.[1] ?? '',
				mimeType: file.type,
				fileName: file.name,
				fileSize: `${file.size} bytes`,
				fileExtension: fileExtension || undefined,
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
