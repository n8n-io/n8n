import { mockInstance } from '@n8n/backend-test-utils';

import { Server } from '@/server';
import '@/zod-alias-support';

import { Start } from '../start';

mockInstance(Server);

test('start needs the expression engine', () => {
	expect(new Start().needsExpressionEngine).toBe(true);
});
