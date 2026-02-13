import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'file-upload' })
export class FileUploadModule implements ModuleInterface {
	async init() {
		await import('./file-upload.controller');
	}
}
