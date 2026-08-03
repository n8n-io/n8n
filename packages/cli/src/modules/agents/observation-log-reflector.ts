export {
	buildObservationLogReflectorPrompt as buildN8nObservationLogReflectorPrompt,
	createObservationLogReflectFn as createN8nObservationLogReflectFn,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT as DEFAULT_REFLECTOR_PROMPT,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS as DEFAULT_REFLECTOR_THRESHOLD_TOKENS,
} from '@n8n/agents';

export type {
	CreateObservationLogReflectFnOptions as CreateN8nObservationLogReflectFnOptions,
	ObservationLogReflectFn as N8nObservationLogReflectFn,
	ObservationLogReflectorInput as N8nObservationLogReflectorInput,
} from '@n8n/agents';
