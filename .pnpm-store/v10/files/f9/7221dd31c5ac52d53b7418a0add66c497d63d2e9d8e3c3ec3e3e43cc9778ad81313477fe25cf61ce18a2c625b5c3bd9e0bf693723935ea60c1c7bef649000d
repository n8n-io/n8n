"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommand = void 0;
const errors_1 = require("../../errors");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const utils_1 = require("../../utils");
const UpdateOptionsProperties = [
    'id',
    'values',
    'sparseValues',
    'metadata',
];
class UpdateCommand {
    constructor(apiProvider, namespace) {
        this.validator = (options) => {
            if (options) {
                (0, validateObjectProperties_1.ValidateObjectProperties)(options, UpdateOptionsProperties);
            }
            if (options && !options.id) {
                throw new errors_1.PineconeArgumentError('You must enter a non-empty string for the `id` field in order to update a record.');
            }
        };
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(options, maxRetries) {
        this.validator(options);
        const requestOptions = {
            id: options['id'],
            values: options['values'],
            sparseValues: options['sparseValues'],
            setMetadata: options['metadata'],
        };
        const api = await this.apiProvider.provide();
        const retryWrapper = new utils_1.RetryOnServerFailure(api.updateVector.bind(api), maxRetries);
        await retryWrapper.execute({
            updateRequest: { ...requestOptions, namespace: this.namespace },
        });
        return;
    }
}
exports.UpdateCommand = UpdateCommand;
//# sourceMappingURL=update.js.map