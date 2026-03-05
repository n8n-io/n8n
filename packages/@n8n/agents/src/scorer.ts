import type { BuiltScorer } from './types';

export class Scorer {
	private name: string;

	private scorerType?: string;

	private modelId?: string;

	private samplingRate = 1.0;

	constructor(name: string) {
		this.name = name;
	}

	type(scorerType: string): this {
		this.scorerType = scorerType;
		return this;
	}

	model(modelId: string): this {
		this.modelId = modelId;
		return this;
	}

	sampling(rate: number): this {
		this.samplingRate = rate;
		return this;
	}

	build(): BuiltScorer {
		if (!this.scorerType) throw new Error(`Scorer "${this.name}" requires a type`);
		if (!this.modelId) throw new Error(`Scorer "${this.name}" requires a model`);

		return {
			name: this.name,
			scorerType: this.scorerType,
			sampling: this.samplingRate,
			_mastraScorer: {
				type: this.scorerType,
				model: this.modelId,
			},
		};
	}
}
