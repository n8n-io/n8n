import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'identity-substrate',
	instanceTypes: ['main'],
})
export class IdentitySubstrateModule implements ModuleInterface {
	async entities() {
		const { TokenExchangeJti } = await import('./database/entities/token-exchange-jti.entity.js');
		const { TrustedKeySourceEntity } = await import(
			'./database/entities/trusted-key-source.entity.js'
		);
		const { TrustedKeyEntity } = await import('./database/entities/trusted-key.entity.js');
		return [TokenExchangeJti, TrustedKeySourceEntity, TrustedKeyEntity] as never;
	}
}
