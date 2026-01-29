import { Z } from 'zod-class';
import { z } from 'zod';

/**
 * Query parameters for the dynamic templates endpoint.
 * Cloud users pass selectedApps and cloudInformation from the cloud API.
 */
export class DynamicTemplatesRequestQuery extends Z.class({
	/**
	 * JSON-encoded array of selected apps from cloud onboarding.
	 * Only provided by cloud users.
	 */
	selectedApps: z.string().optional(),

	/**
	 * JSON-encoded object containing cloud survey information.
	 * Only provided by cloud users.
	 */
	cloudInformation: z.string().optional(),
}) {}
