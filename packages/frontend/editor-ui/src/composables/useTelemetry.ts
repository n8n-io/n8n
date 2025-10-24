// Empty telemetry composable - all telemetry has been removed
export function useTelemetry() {
	return {
		track: () => {},
		identify: () => {},
		page: () => {},
		reset: () => {},
		trackAskAI: () => {},
		trackAiTransform: () => {},
		trackNodeParametersValuesChange: () => {},
	};
}
