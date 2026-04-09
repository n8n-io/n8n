import * as z from "zod/v3";
/**
 * The fine-tuning hyperparameter settings used in a classifier fine-tune job.
 */
export type ClassifierTrainingParametersIn = {
    /**
     * The number of training steps to perform. A training step refers to a single update of the model weights during the fine-tuning process. This update is typically calculated using a batch of samples from the training dataset.
     */
    trainingSteps?: number | null | undefined;
    /**
     * A parameter describing how much to adjust the pre-trained model's weights in response to the estimated error each time the weights are updated during the fine-tuning process.
     */
    learningRate?: number | undefined;
    /**
     * (Advanced Usage) Weight decay adds a term to the loss function that is proportional to the sum of the squared weights. This term reduces the magnitude of the weights and prevents them from growing too large.
     */
    weightDecay?: number | null | undefined;
    /**
     * (Advanced Usage) A parameter that specifies the percentage of the total training steps at which the learning rate warm-up phase ends. During this phase, the learning rate gradually increases from a small value to the initial learning rate, helping to stabilize the training process and improve convergence. Similar to `pct_start` in [mistral-finetune](https://github.com/mistralai/mistral-finetune)
     */
    warmupFraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seqLen?: number | null | undefined;
};
/** @internal */
export type ClassifierTrainingParametersIn$Outbound = {
    training_steps?: number | null | undefined;
    learning_rate: number;
    weight_decay?: number | null | undefined;
    warmup_fraction?: number | null | undefined;
    epochs?: number | null | undefined;
    seq_len?: number | null | undefined;
};
/** @internal */
export declare const ClassifierTrainingParametersIn$outboundSchema: z.ZodType<ClassifierTrainingParametersIn$Outbound, z.ZodTypeDef, ClassifierTrainingParametersIn>;
export declare function classifierTrainingParametersInToJSON(classifierTrainingParametersIn: ClassifierTrainingParametersIn): string;
//# sourceMappingURL=classifiertrainingparametersin.d.ts.map