import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * A declarative HTTP action to publish on the instance. The server checks `config` and
 * `fixtures` in full: the shapes belong to the Node Contract, not to this API.
 */
export class PublishNextNodeVersionDto extends Z.class({
	config: z.record(z.unknown()),
	fixtures: z.object({ executions: z.array(z.unknown()).min(1) }).passthrough(),
}) {}
