import type { PipelineType } from "./pipelines.js";
import type { WidgetExample } from "./widget-example.js";
import type { TokenizerConfig } from "./tokenizer-data.js";

/**
 * Public interface for model metadata
 */
export interface ModelData {
	/**
	 * id of model (e.g. 'user/repo_name')
	 */
	id: string;
	/**
	 * Whether or not to enable inference widget for this model
	 * TODO(type it)
	 */
	inference: string;
	/**
	 * is this model private?
	 */
	private?: boolean;
	/**
	 * this dictionary has useful information about the model configuration
	 */
	config?: {
		architectures?: string[];
		/**
		 * Dict of AutoModel or Auto… class name to local import path in the repo
		 */
		auto_map?: {
			/**
			 * String Property
			 */
			[x: string]: string;
		};
		model_type?: string;
		quantization_config?: {
			bits?: number;
			load_in_4bit?: boolean;
			load_in_8bit?: boolean;
			/**
			 * awq, gptq, aqlm, marlin, … Used by vLLM
			 */
			quant_method?: string;
		};
		tokenizer_config?: TokenizerConfig;
		adapter_transformers?: {
			model_name?: string;
			model_class?: string;
		};
		diffusers?: {
			_class_name?: string;
		};
		sklearn?: {
			model?: {
				file?: string;
			};
			model_format?: string;
		};
		speechbrain?: {
			speechbrain_interface?: string;
			vocoder_interface?: string;
			vocoder_model_id?: string;
		};
		peft?: {
			base_model_name_or_path?: string;
			task_type?: string;
		};
		keras_hub?: {
			tasks?: string[];
		};
	};
	/**
	 * all the model tags
	 */
	tags: string[];
	/**
	 * transformers-specific info to display in the code sample.
	 */
	transformersInfo?: TransformersInfo;
	/**
	 * Pipeline type
	 */
	pipeline_tag?: PipelineType | undefined;
	/**
	 * for relevant models, get mask token
	 */
	mask_token?: string | undefined;
	/**
	 * Example data that will be fed into the widget.
	 *
	 * can be set in the model card metadata (under `widget`),
	 * or by default in `DefaultWidget.ts`
	 */
	widgetData?: WidgetExample[] | undefined;
	/**
	 * Parameters that will be used by the widget when calling Inference API (serverless)
	 * https://huggingface.co/docs/api-inference/detailed_parameters
	 *
	 * can be set in the model card metadata (under `inference/parameters`)
	 * Example:
	 * inference:
	 *     parameters:
	 *         key: val
	 */
	cardData?: {
		inference?:
			| boolean
			| {
					parameters?: Record<string, unknown>;
			  };
		base_model?: string | string[];
		instance_prompt?: string | null;
	};
	/**
	 * Library name
	 * Example: transformers, SpeechBrain, Stanza, etc.
	 */
	library_name?: string;
	safetensors?: {
		parameters: Record<string, number>;
		total: number;
		sharded: boolean;
	};
	gguf?: {
		total: number;
		architecture?: string;
		context_length?: number;
	};
}

/**
 * transformers-specific info to display in the code sample.
 */
export interface TransformersInfo {
	/**
	 * e.g. AutoModelForSequenceClassification
	 */
	auto_model: string;
	/**
	 * if set in config.json's auto_map
	 */
	custom_class?: string;
	/**
	 * e.g. text-classification
	 */
	pipeline_tag?: PipelineType;
	/**
	 * e.g. "AutoTokenizer" | "AutoFeatureExtractor" | "AutoProcessor"
	 */
	processor?: string;
}
