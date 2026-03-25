import { ValidationExecutor } from './ValidationExecutor';
/**
 * Validator performs validation of the given object based on its metadata.
 */
export class Validator {
    /**
     * Performs validation of the given object based on decorators or validation schema.
     */
    validate(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
        return this.coreValidate(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions);
    }
    /**
     * Performs validation of the given object based on decorators or validation schema and reject on error.
     */
    async validateOrReject(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
        const errors = await this.coreValidate(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions);
        if (errors.length)
            return Promise.reject(errors);
    }
    /**
     * Performs validation of the given object based on decorators or validation schema.
     */
    validateSync(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
        const object = typeof objectOrSchemaName === 'string' ? objectOrValidationOptions : objectOrSchemaName;
        const options = typeof objectOrSchemaName === 'string' ? maybeValidatorOptions : objectOrValidationOptions;
        const schema = typeof objectOrSchemaName === 'string' ? objectOrSchemaName : undefined;
        const executor = new ValidationExecutor(this, options);
        executor.ignoreAsyncValidations = true;
        const validationErrors = [];
        executor.execute(object, schema, validationErrors);
        return executor.stripEmptyErrors(validationErrors);
    }
    // -------------------------------------------------------------------------
    // Private Properties
    // -------------------------------------------------------------------------
    /**
     * Performs validation of the given object based on decorators or validation schema.
     * Common method for `validateOrReject` and `validate` methods.
     */
    coreValidate(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
        const object = typeof objectOrSchemaName === 'string' ? objectOrValidationOptions : objectOrSchemaName;
        const options = typeof objectOrSchemaName === 'string' ? maybeValidatorOptions : objectOrValidationOptions;
        const schema = typeof objectOrSchemaName === 'string' ? objectOrSchemaName : undefined;
        const executor = new ValidationExecutor(this, options);
        const validationErrors = [];
        executor.execute(object, schema, validationErrors);
        return Promise.all(executor.awaitingPromises).then(() => {
            return executor.stripEmptyErrors(validationErrors);
        });
    }
}
//# sourceMappingURL=Validator.js.map