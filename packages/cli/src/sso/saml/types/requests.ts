import type { AuthenticatedRequest, AuthlessRequest } from '@/requests';
import type { SamlPreferences } from './samlPreferences';

export declare namespace SamlConfiguration {
	type Update = AuthenticatedRequest<{}, {}, SamlPreferences, {}>;
	type Toggle = AuthenticatedRequest<{}, {}, { loginEnabled: boolean }, {}>;

	type AcsRequest = AuthlessRequest<
		{},
		{},
		{
			// eslint-disable-next-line @typescript-eslint/naming-convention
			RelayState?: string;
		},
		{}
	>;
}
