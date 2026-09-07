import { ValueTransformer } from '../decorator/options/ValueTransformer';

export class ApplyValueTransformers {
	static transformFrom(transformer: ValueTransformer | ValueTransformer[], databaseValue: any) {
		if (Array.isArray(transformer)) {
			const reverseTransformers = transformer.slice().reverse();
			return reverseTransformers.reduce((transformedValue, _transformer) => {
				return _transformer.from(transformedValue);
			}, databaseValue);
		}
		return transformer.from(databaseValue);
	}
	static transformTo(transformer: ValueTransformer | ValueTransformer[], entityValue: any) {
		if (Array.isArray(transformer)) {
			return transformer.reduce((transformedValue, _transformer) => {
				return _transformer.to(transformedValue);
			}, entityValue);
		}
		return transformer.to(entityValue);
	}
}
