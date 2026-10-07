import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'hello-world' })
export class HelloWorldModule implements ModuleInterface {}
