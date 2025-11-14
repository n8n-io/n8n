import type { BinaryFileType, IBinaryData } from 'n8n-workflow';

export async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
	const reader = new FileReader();
	return await new Promise((resolve, reject) => {
		reader.onload = () => {
			const binaryData: IBinaryData = {
				data: (reader.result as string).split('base64,')?.[1] ?? '',
				mimeType: file.type,
				fileName: file.name,
				fileSize: `${file.size} bytes`,
				fileExtension: file.name.split('.').pop() ?? '',
				fileType: file.type.split('/')[0] as BinaryFileType,
			};
			resolve(binaryData);
		};
		reader.onerror = () => {
			reject(new Error('Failed to convert file to binary data'));
		};
		reader.readAsDataURL(file);
	});
}
