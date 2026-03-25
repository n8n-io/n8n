import { UserAccountAttributes } from "../../../UserAccountAttributes.js";
import { SignUpSubmitAttributesResult } from "../result/SignUpSubmitAttributesResult.js";
import { SignUpState } from "./SignUpState.js";
import { SignUpAttributesRequiredStateParameters } from "./SignUpStateParameters.js";
import { UserAttribute } from "../../../core/network_client/custom_auth_api/types/ApiErrorResponseTypes.js";
export declare class SignUpAttributesRequiredState extends SignUpState<SignUpAttributesRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Submits attributes to continue sign-up flow.
     * This methods is used to submit required attributes.
     * These attributes, built in or custom, were configured in the Microsoft Entra admin center by the tenant administrator.
     * @param {UserAccountAttributes} attributes - The attributes to submit.
     * @returns {Promise<SignUpSubmitAttributesResult>} The result of the operation.
     */
    submitAttributes(attributes: UserAccountAttributes): Promise<SignUpSubmitAttributesResult>;
    /**
     * Gets the required attributes for sign-up.
     * @returns {UserAttribute[]} The required attributes for sign-up.
     */
    getRequiredAttributes(): UserAttribute[];
}
//# sourceMappingURL=SignUpAttributesRequiredState.d.ts.map