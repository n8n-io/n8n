import type { Principal } from '@n8n/permissions';

import type { RelayEventMap } from '@/events/maps/relay.event-map';
import type { PublicApiKeyService } from '@/services/public-api-key.service';

type UserLike = RelayEventMap['workflow-created']['user'];

// Type-level test. The `typecheck` step catches a failure, not the test run.
describe('Principal', () => {
	it('is assignable to the UserLike shape of the event relays', () => {
		expectTypeOf<Principal>().toExtend<UserLike>();
	});

	it('is accepted by the AuthPrincipal checks in cli', () => {
		expectTypeOf<Principal>().toExtend<
			Parameters<PublicApiKeyService['apiKeyHasValidScopesForRole']>[0]
		>();
	});
});
