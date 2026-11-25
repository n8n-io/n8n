import { scimDeprovisioningPolicySchema } from '../../schemas/scim-config.schema';
import { Z } from '../../zod-class';

/** Body of `PUT /rest/scim/deprovisioning`: the whole policy. */
export class ScimDeprovisioningPolicyDto extends Z.class(scimDeprovisioningPolicySchema.shape) {}
