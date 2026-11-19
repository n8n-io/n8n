import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { PubSubEventMap } from '@n8n/decorators';

@Service()
export class PubSubEventBus extends TypedEmitter<PubSubEventMap> {}
