import { TransformOperationExecutor } from './TransformOperationExecutor';
import { TransformationType } from './enums';
import { defaultOptions } from './constants/default-options.constant';
export class ClassTransformer {
    instanceToPlain(object, options) {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_PLAIN, {
            ...defaultOptions,
            ...options,
        });
        return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
    }
    classToPlainFromExist(object, plainObject, options) {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_PLAIN, {
            ...defaultOptions,
            ...options,
        });
        return executor.transform(plainObject, object, undefined, undefined, undefined, undefined);
    }
    plainToInstance(cls, plain, options) {
        const executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, {
            ...defaultOptions,
            ...options,
        });
        return executor.transform(undefined, plain, cls, undefined, undefined, undefined);
    }
    plainToClassFromExist(clsObject, plain, options) {
        const executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, {
            ...defaultOptions,
            ...options,
        });
        return executor.transform(clsObject, plain, undefined, undefined, undefined, undefined);
    }
    instanceToInstance(object, options) {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_CLASS, {
            ...defaultOptions,
            ...options,
        });
        return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
    }
    classToClassFromExist(object, fromObject, options) {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_CLASS, {
            ...defaultOptions,
            ...options,
        });
        return executor.transform(fromObject, object, undefined, undefined, undefined, undefined);
    }
    serialize(object, options) {
        return JSON.stringify(this.instanceToPlain(object, options));
    }
    /**
     * Deserializes given JSON string to a object of the given class.
     */
    deserialize(cls, json, options) {
        const jsonObject = JSON.parse(json);
        return this.plainToInstance(cls, jsonObject, options);
    }
    /**
     * Deserializes given JSON string to an array of objects of the given class.
     */
    deserializeArray(cls, json, options) {
        const jsonObject = JSON.parse(json);
        return this.plainToInstance(cls, jsonObject, options);
    }
}
//# sourceMappingURL=ClassTransformer.js.map