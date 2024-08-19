import type { IUpdateInformation } from '@/Interface';
import { createEventBus } from 'n8n-design-system/utils';

export type Position = 'minLeft' | 'maxRight' | 'initial';

export type CreateNewCredentialOpts = {
	type: string;
	showAuthOptions: boolean;
};

export interface NdvEventBusEvents {
	/** Command to let the user create a new credential by opening the credentials modal */
	'credential.createNew': CreateNewCredentialOpts;

	/** Command to set the NDV panels' (input, output, main) positions based on the given value */
	setPositionByName: Position;

	updateParameterValue: IUpdateInformation;
}

export const ndvEventBus = createEventBus<NdvEventBusEvents>();
