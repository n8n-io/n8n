"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCodeParser = void 0;
const resultCodeErrors_1 = require("./errors/resultCodeErrors");
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class StatusCodeParser {
    static parse(result) {
        switch (result.status) {
            case 1:
                return new resultCodeErrors_1.OperationsError(result.errorMessage);
            case 2:
                return new resultCodeErrors_1.ProtocolError(result.errorMessage);
            case 3:
                return new resultCodeErrors_1.TimeLimitExceededError(result.errorMessage);
            case 4:
                return new resultCodeErrors_1.SizeLimitExceededError(result.errorMessage);
            case 7:
                return new resultCodeErrors_1.AuthMethodNotSupportedError(result.errorMessage);
            case 8:
                return new resultCodeErrors_1.StrongAuthRequiredError(result.errorMessage);
            case 11:
                return new resultCodeErrors_1.AdminLimitExceededError(result.errorMessage);
            case 12:
                return new resultCodeErrors_1.UnavailableCriticalExtensionError(result.errorMessage);
            case 13:
                return new resultCodeErrors_1.ConfidentialityRequiredError(result.errorMessage);
            case 14:
                return new resultCodeErrors_1.SaslBindInProgressError(result);
            case 16:
                return new resultCodeErrors_1.NoSuchAttributeError(result.errorMessage);
            case 17:
                return new resultCodeErrors_1.UndefinedTypeError(result.errorMessage);
            case 18:
                return new resultCodeErrors_1.InappropriateMatchingError(result.errorMessage);
            case 19:
                return new resultCodeErrors_1.ConstraintViolationError(result.errorMessage);
            case 20:
                return new resultCodeErrors_1.TypeOrValueExistsError(result.errorMessage);
            case 21:
                return new resultCodeErrors_1.InvalidSyntaxError(result.errorMessage);
            case 32:
                return new resultCodeErrors_1.NoSuchObjectError(result.errorMessage);
            case 33:
                return new resultCodeErrors_1.AliasProblemError(result.errorMessage);
            case 34:
                return new resultCodeErrors_1.InvalidDNSyntaxError(result.errorMessage);
            case 35:
                return new resultCodeErrors_1.IsLeafError(result.errorMessage);
            case 36:
                return new resultCodeErrors_1.AliasDerefProblemError(result.errorMessage);
            case 48:
                return new resultCodeErrors_1.InappropriateAuthError(result.errorMessage);
            case 49:
                return new resultCodeErrors_1.InvalidCredentialsError(result.errorMessage);
            case 50:
                return new resultCodeErrors_1.InsufficientAccessError(result.errorMessage);
            case 51:
                return new resultCodeErrors_1.BusyError(result.errorMessage);
            case 52:
                return new resultCodeErrors_1.UnavailableError(result.errorMessage);
            case 53:
                return new resultCodeErrors_1.UnwillingToPerformError(result.errorMessage);
            case 54:
                return new resultCodeErrors_1.LoopDetectError(result.errorMessage);
            case 64:
                return new resultCodeErrors_1.NamingViolationError(result.errorMessage);
            case 65:
                return new resultCodeErrors_1.ObjectClassViolationError(result.errorMessage);
            case 66:
                return new resultCodeErrors_1.NotAllowedOnNonLeafError(result.errorMessage);
            case 67:
                return new resultCodeErrors_1.NotAllowedOnRDNError(result.errorMessage);
            case 68:
                return new resultCodeErrors_1.AlreadyExistsError(result.errorMessage);
            case 69:
                return new resultCodeErrors_1.NoObjectClassModsError(result.errorMessage);
            case 70:
                return new resultCodeErrors_1.ResultsTooLargeError(result.errorMessage);
            case 71:
                return new resultCodeErrors_1.AffectsMultipleDSAsError(result.errorMessage);
            case 112:
                return new resultCodeErrors_1.TLSNotSupportedError(result.errorMessage);
            default:
                return new resultCodeErrors_1.UnknownStatusCodeError(result.status, result.errorMessage);
        }
    }
}
exports.StatusCodeParser = StatusCodeParser;
//# sourceMappingURL=StatusCodeParser.js.map