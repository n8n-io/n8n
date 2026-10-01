import type { BuiltGuardrail, GuardrailType, GuardrailStrategy, PiiDetectionType } from '../types';

export class Guardrail {
	private name: string;

	private guardType?: GuardrailType;

	private strategyType?: GuardrailStrategy;

	private detectionTypes?: PiiDetectionType[];

	private thresholdValue?: number;

	constructor(name: string) {
		this.name = name;
	}

	type(guardType: GuardrailType): this {
		this.guardType = guardType;
		return this;
	}

	strategy(strategy: GuardrailStrategy): this {
		this.strategyType = strategy;
		return this;
	}

	detect(types: PiiDetectionType[]): this {
		this.detectionTypes = types;
		return this;
	}

	threshold(value: number): this {
		this.thresholdValue = value;
		return this;
	}

	build(): BuiltGuardrail {
		if (!this.guardType) throw new Error(`Guardrail "${this.name}" requires a type`);
		if (!this.strategyType) throw new Error(`Guardrail "${this.name}" requires a strategy`);

		return {
			name: this.name,
			guardType: this.guardType,
			strategy: this.strategyType,
			_config: {
				detectionTypes: this.detectionTypes,
				threshold: this.thresholdValue,
			},
		};
	}
}
