import { KendraServiceException as __BaseException } from "./KendraServiceException";
export const ScoreConfidence = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    VERY_HIGH: "VERY_HIGH",
};
export const WarningCode = {
    QUERY_LANGUAGE_INVALID_SYNTAX: "QUERY_LANGUAGE_INVALID_SYNTAX",
};
export class ResourceInUseException extends __BaseException {
    name = "ResourceInUseException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceInUseException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceInUseException.prototype);
        this.Message = opts.Message;
    }
}
export const RelevanceType = {
    NOT_RELEVANT: "NOT_RELEVANT",
    RELEVANT: "RELEVANT",
};
