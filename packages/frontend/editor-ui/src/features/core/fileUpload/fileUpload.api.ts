import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export const uploadFileApi = async (context: IRestApiContext, file: File) => {
	const formData = new FormData();
	formData.append('file', file);

	return await makeRestApiRequest<{
		fileId: string;
		fileName: string;
		mimeType: string;
		fileSize: number;
	}>(context, 'POST', '/file-uploads', formData);
};
